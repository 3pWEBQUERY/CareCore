import { randomUUID } from "node:crypto";
import { ApiError, assertUuid, iso, text, writeAudit, type ApiContext, type Row } from "@/lib/api-context";
import { listCareUnits } from "@/lib/medication";
import { hasPermission } from "@/lib/server-data";
import { SHIFT_TYPES, type ShiftType } from "@/lib/shift-shared";
import { listPeople } from "@/lib/tasks";
import {
  ABSENCE_KINDS,
  DUTY_REPEAT,
  DUTY_ROLES,
  weekdaysBetween,
  type Absence,
  type AbsenceKind,
  type DutyRepeat,
  type ScheduleAssignment,
  type SchedulePayload,
  type ScheduleShift,
} from "@/lib/schedule-shared";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY = 86_400_000;

const canManage = (ctx: ApiContext) => hasPermission(ctx.actor, "schedule.manage");
function requireManage(ctx: ApiContext) {
  if (!canManage(ctx)) throw new ApiError("Nur die Dienstplanung darf Dienste einteilen oder ändern.", 403);
}

const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);

async function orgToday({ sql, actor }: ApiContext) {
  const rows = (await sql`
    SELECT to_char(NOW() AT TIME ZONE timezone, 'YYYY-MM-DD') AS today FROM carecore_organizations WHERE id = ${actor.organizationId}`) as Row[];
  return String(rows[0].today);
}

async function notify(
  ctx: ApiContext,
  userId: string,
  title: string,
  body: string,
  type: string,
  link: string,
  priority = "normal",
) {
  if (userId === ctx.actor.id) return;
  await ctx.sql`
    INSERT INTO carecore_notifications (id, user_id, title, body, type, priority, link_url)
    VALUES (${randomUUID()}, ${userId}, ${title}, ${body}, ${type}, ${priority}, ${link})`;
}

async function notifyManagers(ctx: ApiContext, title: string, body: string, priority: string) {
  const managers = (await ctx.sql`
    SELECT u.id FROM carecore_users u
    JOIN carecore_user_profiles p ON p.user_id = u.id
    JOIN carecore_roles r ON r.key = u.role
    WHERE p.organization_id = ${ctx.actor.organizationId} AND u.active = TRUE AND r.permissions ? 'schedule.manage'`) as Row[];
  for (const manager of managers)
    await notify(ctx, String(manager.id), title, body, "absence_request", "/c/betrieb/dienstplanung/team", priority);
}

function mapAbsence(row: Row): Absence {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    kind: row.kind as AbsenceKind,
    startsOn: String(row.starts_on_text),
    endsOn: String(row.ends_on_text),
    status: row.status as Absence["status"],
    urgent: Boolean(row.urgent),
    substituteName: (row.substitute_name as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    decidedByName: (row.decided_by_name as string | null) ?? null,
    decidedAt: iso(row.decided_at),
    decisionNote: (row.decision_note as string | null) ?? null,
    createdAt: iso(row.created_at) ?? "",
  };
}

async function selectAbsences(
  ctx: ApiContext,
  where: { from?: string; to?: string; userId?: string; requests?: boolean; id?: string },
) {
  const rows = (await ctx.sql`
    SELECT ab.*, to_char(ab.starts_on, 'YYYY-MM-DD') AS starts_on_text, to_char(ab.ends_on, 'YYYY-MM-DD') AS ends_on_text,
      u.display_name AS name, sub.display_name AS substitute_name, dec.display_name AS decided_by_name
    FROM carecore_absences ab
    JOIN carecore_users u ON u.id = ab.user_id
    LEFT JOIN carecore_users sub ON sub.id = ab.substitute_user_id
    LEFT JOIN carecore_users dec ON dec.id = ab.decided_by
    WHERE ab.organization_id = ${ctx.actor.organizationId}
      AND (${where.id ?? null}::uuid IS NULL OR ab.id = ${where.id ?? null}::uuid)
      AND (${where.userId ?? null}::uuid IS NULL OR ab.user_id = ${where.userId ?? null}::uuid)
      AND (${where.from ?? null}::date IS NULL OR ab.ends_on >= ${where.from ?? null}::date)
      AND (${where.to ?? null}::date IS NULL OR ab.starts_on <= ${where.to ?? null}::date)
      AND (${where.requests ?? false} = FALSE OR ab.status = 'requested' OR ab.decided_at > NOW() - INTERVAL '14 days')
    ORDER BY ab.status <> 'requested', ab.starts_on DESC
    LIMIT 200`) as Row[];
  return rows.map(mapAbsence);
}

export async function scheduleData(ctx: ApiContext, params: URLSearchParams): Promise<SchedulePayload> {
  const { sql, actor } = ctx;
  const today = await orgToday(ctx);
  const from = DATE.test(params.get("from") ?? "") ? String(params.get("from")) : today;
  let to = DATE.test(params.get("to") ?? "") ? String(params.get("to")) : addDays(from, 6);
  if (to < from) throw new ApiError("Der Zeitraum ist ungültig.");
  if (Date.parse(to) - Date.parse(from) > 62 * DAY) to = addDays(from, 62);
  const mine = params.get("scope") !== "team";
  const unitId = params.get("careUnitId") ? assertUuid(params.get("careUnitId"), "Wohnbereich") : null;

  const [shiftRows, absences, requests, people, careUnits, vacationRows] = await Promise.all([
    sql`
      SELECT s.id, s.name, s.starts_at, s.ends_at, s.care_unit_id, cu.name AS care_unit, s.required_staff, s.note,
        s.highlight, s.status, to_char(s.starts_at AT TIME ZONE org.tz, 'YYYY-MM-DD') AS day,
        COALESCE(json_agg(json_build_object('id', a.id, 'userId', a.user_id, 'name', u.display_name, 'role', a.role,
          'status', a.status, 'absenceReason', a.absence_reason, 'checkedInAt', a.checked_in_at, 'checkedOutAt', a.checked_out_at)
          ORDER BY u.display_name) FILTER (WHERE a.id IS NOT NULL), '[]'::json) AS assignments
      FROM carecore_shifts s
      CROSS JOIN (SELECT timezone AS tz FROM carecore_organizations WHERE id = ${actor.organizationId}) org
      LEFT JOIN carecore_care_units cu ON cu.id = s.care_unit_id
      LEFT JOIN carecore_shift_assignments a ON a.shift_id = s.id
      LEFT JOIN carecore_users u ON u.id = a.user_id
      WHERE s.organization_id = ${actor.organizationId} AND s.status <> 'cancelled'
        AND (s.starts_at AT TIME ZONE org.tz)::date BETWEEN ${from}::date AND ${to}::date
        AND (${unitId}::uuid IS NULL OR s.care_unit_id = ${unitId}::uuid)
        AND (${mine} = FALSE OR EXISTS (SELECT 1 FROM carecore_shift_assignments x WHERE x.shift_id = s.id AND x.user_id = ${actor.id}))
      GROUP BY s.id, cu.name, org.tz
      ORDER BY s.starts_at, cu.name` as Promise<Row[]>,
    selectAbsences(ctx, { from, to, userId: mine ? actor.id : undefined }),
    mine
      ? selectAbsences(ctx, { userId: actor.id, from: addDays(today, -60) })
      : selectAbsences(ctx, { requests: true }),
    listPeople(ctx),
    listCareUnits(ctx),
    sql`
      SELECT to_char(GREATEST(starts_on, date_trunc('year', ${today}::date)::date), 'YYYY-MM-DD') AS f,
        to_char(LEAST(ends_on, (date_trunc('year', ${today}::date) + INTERVAL '1 year - 1 day')::date), 'YYYY-MM-DD') AS t
      FROM carecore_absences
      WHERE user_id = ${actor.id} AND organization_id = ${actor.organizationId} AND kind = 'vacation' AND status = 'approved'
        AND ends_on >= date_trunc('year', ${today}::date) AND starts_on < date_trunc('year', ${today}::date) + INTERVAL '1 year'` as Promise<
      Row[]
    >,
  ]);

  const shifts: ScheduleShift[] = shiftRows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    day: String(row.day),
    startsAt: iso(row.starts_at) ?? "",
    endsAt: iso(row.ends_at) ?? "",
    careUnitId: (row.care_unit_id as string | null) ?? null,
    careUnit: (row.care_unit as string | null) ?? null,
    requiredStaff: Number(row.required_staff),
    note: (row.note as string | null) ?? null,
    highlight: Boolean(row.highlight),
    status: String(row.status),
    assignments: (row.assignments as ScheduleAssignment[]).map((a) => ({
      ...a,
      checkedInAt: iso(a.checkedInAt),
      checkedOutAt: iso(a.checkedOutAt),
    })),
  }));

  return {
    from,
    to,
    today,
    shifts,
    absences: absences.filter((a) => a.status === "approved" || a.status === "requested"),
    requests,
    people,
    careUnits,
    currentUserId: actor.id,
    canManage: canManage(ctx),
    vacationDaysThisYear: vacationRows.reduce((sum, row) => sum + weekdaysBetween(String(row.f), String(row.t)), 0),
  };
}

type Slot = { day: string; startsAt: string; endsAt: string };

// Local shift slots for all planned days; the end lies on the next day when it is not after the start.
async function slotsFor(ctx: ApiContext, days: string[], start: string, end: string): Promise<Slot[]> {
  const rows = (await ctx.sql`
    SELECT to_char(d, 'YYYY-MM-DD') AS day,
      ((d + ${start}::time) AT TIME ZONE org.tz) AS starts_at,
      ((d + ${end <= start ? 1 : 0}::int + ${end}::time) AT TIME ZONE org.tz) AS ends_at
    FROM unnest(${days}::date[]) AS d
    CROSS JOIN (SELECT timezone AS tz FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}) org
    ORDER BY d`) as Row[];
  return rows.map((row) => ({
    day: String(row.day),
    startsAt: iso(row.starts_at) ?? "",
    endsAt: iso(row.ends_at) ?? "",
  }));
}

// Why a person cannot work a slot: overlapping duty or an approved absence.
async function conflictsFor(ctx: ApiContext, userId: string, slots: Slot[]) {
  if (!slots.length) return new Map<string, string>();
  const first = slots[0];
  const last = slots[slots.length - 1];
  const [duties, absences] = await Promise.all([
    ctx.sql`
      SELECT s.starts_at, s.ends_at, s.name FROM carecore_shift_assignments a JOIN carecore_shifts s ON s.id = a.shift_id
      WHERE a.user_id = ${userId} AND a.status <> 'absent' AND s.status <> 'cancelled'
        AND s.organization_id = ${ctx.actor.organizationId}
        AND s.starts_at < ${last.endsAt} AND s.ends_at > ${first.startsAt}` as Promise<Row[]>,
    ctx.sql`
      SELECT to_char(starts_on, 'YYYY-MM-DD') AS f, to_char(ends_on, 'YYYY-MM-DD') AS t, kind FROM carecore_absences
      WHERE user_id = ${userId} AND status = 'approved' AND ends_on >= ${first.day}::date AND starts_on <= ${last.day}::date` as Promise<
      Row[]
    >,
  ]);
  const conflicts = new Map<string, string>();
  for (const slot of slots) {
    const absence = absences.find((a) => String(a.f) <= slot.day && String(a.t) >= slot.day);
    if (absence) conflicts.set(slot.day, ABSENCE_KINDS[absence.kind as AbsenceKind] ?? "Abwesend");
    const duty = duties.find(
      (d) =>
        Date.parse(String(iso(d.starts_at))) < Date.parse(slot.endsAt) &&
        Date.parse(String(iso(d.ends_at))) > Date.parse(slot.startsAt),
    );
    if (duty) conflicts.set(slot.day, `bereits ${duty.name}`);
  }
  return conflicts;
}

async function assertPerson(ctx: ApiContext, userIdInput: unknown) {
  const userId = assertUuid(userIdInput, "Mitarbeitende Person");
  const rows = (await ctx.sql`
    SELECT u.id, u.display_name, COALESCE(p.job_title, '') AS job_title FROM carecore_users u
    JOIN carecore_user_profiles p ON p.user_id = u.id
    WHERE u.id = ${userId} AND p.organization_id = ${ctx.actor.organizationId} AND u.active = TRUE`) as Row[];
  if (!rows[0]) throw new ApiError("Die Person ist nicht verfügbar.", 404);
  return { id: userId, name: String(rows[0].display_name), jobTitle: String(rows[0].job_title) };
}

const dayLabel = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.`;

export async function planDuties(ctx: ApiContext, body: Record<string, unknown>) {
  requireManage(ctx);
  const { sql, actor } = ctx;
  if (typeof body.date !== "string" || !DATE.test(body.date)) throw new ApiError("Bitte das Datum wählen.");
  const shiftType = typeof body.shiftType === "string" ? body.shiftType : "";
  const preset = shiftType in SHIFT_TYPES ? SHIFT_TYPES[shiftType as ShiftType] : null;
  const start = typeof body.start === "string" && TIME.test(body.start) ? body.start : preset?.start;
  const end = typeof body.end === "string" && TIME.test(body.end) ? body.end : preset?.end;
  if (!start || !end) throw new ApiError("Bitte Beginn und Ende angeben.");
  if (start === end) throw new ApiError("Beginn und Ende dürfen nicht gleich sein.");
  const name = preset ? shiftType : text(body.name, 100) || "Dienst";
  const repeat = typeof body.repeat === "string" && body.repeat in DUTY_REPEAT ? (body.repeat as DutyRepeat) : "none";
  const role =
    typeof body.role === "string" && (DUTY_ROLES as readonly string[]).includes(body.role) ? body.role : null;
  const status = body.status === "confirmed" ? "confirmed" : "scheduled";
  const note = text(body.note, 2000) || null;
  const highlight = body.highlight === true;
  const remind = body.remind === true;
  const planHandover = body.planHandover === true;

  const today = await orgToday(ctx);
  if (body.date < addDays(today, -1)) throw new ApiError("Dienste können nicht in der Vergangenheit geplant werden.");
  let days = [body.date];
  if (repeat !== "none") {
    const until = typeof body.until === "string" && DATE.test(body.until) ? body.until : "";
    if (!until || until < body.date) throw new ApiError("Bitte angeben, bis wann wiederholt wird.");
    if (Date.parse(until) - Date.parse(body.date) > 92 * DAY)
      throw new ApiError("Wiederholungen sind auf 3 Monate begrenzt.");
    days = [];
    for (let day = body.date; day <= until; day = addDays(day, repeat === "weekly" ? 7 : 1)) {
      const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
      if (repeat === "weekdays" && (weekday === 0 || weekday === 6)) continue;
      days.push(day);
    }
  }

  let unitId: string | null = null;
  if (body.careUnitId) {
    unitId = assertUuid(body.careUnitId, "Wohnbereich");
    const unit = (await sql`
      SELECT cu.id FROM carecore_care_units cu JOIN carecore_sites si ON si.id = cu.site_id
      WHERE cu.id = ${unitId} AND si.organization_id = ${actor.organizationId} AND cu.active = TRUE`) as Row[];
    if (!unit[0]) throw new ApiError("Wohnbereich nicht gefunden.", 404);
  }
  const person = body.userId ? await assertPerson(ctx, body.userId) : null;
  const slots = await slotsFor(ctx, days, start, end);
  const conflicts = person ? await conflictsFor(ctx, person.id, slots) : new Map<string, string>();
  const planned = slots.filter((slot) => !conflicts.has(slot.day));
  if (!planned.length)
    throw new ApiError(
      `Keine Einteilung möglich: ${[...conflicts].map(([day, reason]) => `${dayLabel(day)} ${reason}`).join(", ")}.`,
      409,
    );

  const existing = (await sql`
    SELECT s.id, s.starts_at, s.required_staff,
      (SELECT COUNT(*) FROM carecore_shift_assignments a WHERE a.shift_id = s.id AND a.status <> 'absent')::int AS filled
    FROM carecore_shifts s
    WHERE s.organization_id = ${actor.organizationId} AND s.care_unit_id IS NOT DISTINCT FROM ${unitId}::uuid
      AND s.name = ${name} AND s.status <> 'cancelled' AND s.starts_at = ANY(${planned.map((slot) => slot.startsAt)}::timestamptz[])
      AND s.ends_at = ANY(${planned.map((slot) => slot.endsAt)}::timestamptz[])`) as Row[];

  const statements = [];
  const created: Array<{ shiftId: string; slot: Slot }> = [];
  for (const slot of planned) {
    const match = existing.find((row) => iso(row.starts_at) === slot.startsAt);
    const shiftId = match ? String(match.id) : randomUUID();
    if (!match)
      statements.push(sql`
        INSERT INTO carecore_shifts (id, organization_id, care_unit_id, name, starts_at, ends_at, status, required_staff, note, highlight, created_by)
        VALUES (${shiftId}, ${actor.organizationId}, ${unitId}, ${name}, ${slot.startsAt}, ${slot.endsAt}, 'planned', 1, ${note}, ${highlight}, ${actor.id})`);
    else if (!person || Number(match.filled) >= Number(match.required_staff))
      // Adding a person or an open slot to a full shift raises the planned staffing.
      statements.push(sql`
        UPDATE carecore_shifts SET required_staff = LEAST(required_staff + 1, 20),
          note = COALESCE(${note}, note), highlight = highlight OR ${highlight} WHERE id = ${shiftId}`);
    if (person) {
      statements.push(sql`
        INSERT INTO carecore_shift_assignments (id, shift_id, user_id, role, status, confirmed_at, remind)
        VALUES (${randomUUID()}, ${shiftId}, ${person.id}, ${role ?? (person.jobTitle || null)}, ${status},
          ${status === "confirmed" ? new Date().toISOString() : null}, ${remind})
        ON CONFLICT (shift_id, user_id) DO NOTHING`);
      if (planHandover)
        statements.push(sql`
          INSERT INTO carecore_tasks (id, organization_id, care_unit_id, assigned_to, created_by, title, description, category, priority, due_at, remind)
          VALUES (${randomUUID()}, ${actor.organizationId}, ${unitId}, ${person.id}, ${actor.id}, 'Dienstübergabe',
            ${`Übergabe zu Beginn des ${name}s lesen und bestätigen.`}, 'Organisation', 'normal', ${slot.startsAt}, TRUE)`);
    }
    created.push({ shiftId, slot });
  }
  await sql.transaction(statements);
  await writeAudit(ctx, "shift_plan", created[0].shiftId, "planned", null, {
    userId: person?.id ?? null,
    name,
    days: created.map((c) => c.slot.day),
    start,
    end,
    status,
  });
  if (person)
    await notify(
      ctx,
      person.id,
      created.length === 1
        ? `Neuer Dienst am ${dayLabel(created[0].slot.day)}`
        : `${created.length} neue Dienste eingeteilt`,
      `${name} ${start}–${end}${created.length > 1 ? ` ab ${dayLabel(created[0].slot.day)}` : ""}. Bitte im Dienstplan bestätigen.`,
      "shift_assigned",
      "/c/betrieb/dienstplanung",
    );
  return {
    created: created.length,
    skipped: [...conflicts].map(([day, reason]) => ({ day, reason })),
  };
}

async function loadAssignment(ctx: ApiContext, idInput: unknown) {
  const id = assertUuid(idInput, "Einteilung");
  const rows = (await ctx.sql`
    SELECT a.*, s.name, s.starts_at, s.ends_at, s.id AS shift_id,
      to_char(s.starts_at AT TIME ZONE (SELECT timezone FROM carecore_organizations WHERE id = s.organization_id), 'YYYY-MM-DD') AS day
    FROM carecore_shift_assignments a
    JOIN carecore_shifts s ON s.id = a.shift_id
    WHERE a.id = ${id} AND s.organization_id = ${ctx.actor.organizationId}`) as Row[];
  if (!rows[0]) throw new ApiError("Einteilung nicht gefunden.", 404);
  return rows[0];
}

export async function changeAssignment(ctx: ApiContext, idInput: unknown, body: Record<string, unknown>) {
  const row = await loadAssignment(ctx, idInput);
  const id = String(row.id);
  const own = row.user_id === ctx.actor.id;
  if (body.action === "confirm") {
    if (!own && !canManage(ctx)) throw new ApiError("Nur die eingeteilte Person kann den Dienst bestätigen.", 403);
    if (row.status !== "scheduled")
      throw new ApiError("Dieser Dienst ist bereits bestätigt oder nicht mehr offen.", 409);
    await ctx.sql`UPDATE carecore_shift_assignments SET status = 'confirmed', confirmed_at = NOW() WHERE id = ${id}`;
    await writeAudit(ctx, "shift_assignment", id, "confirmed", { status: row.status }, { status: "confirmed" });
    return;
  }
  if (body.action === "remove") {
    requireManage(ctx);
    if (row.checked_in_at) throw new ApiError("Der Dienst wurde bereits begonnen und kann nicht entfernt werden.", 409);
    await ctx.sql`DELETE FROM carecore_shift_assignments WHERE id = ${id}`;
    await writeAudit(ctx, "shift_assignment", id, "removed", row, null);
    await notify(
      ctx,
      String(row.user_id),
      `Dienst entfernt: ${row.name} am ${dayLabel(String(row.day))}`,
      "Die Einteilung wurde von der Dienstplanung entfernt.",
      "shift_removed",
      "/c/betrieb/dienstplanung",
    );
    return;
  }
  throw new ApiError("Unbekannte Aktion.");
}

// Actions on a shift: fill an open slot (planning or self-service), or cancel an unstaffed shift.
export async function changeShift(ctx: ApiContext, idInput: unknown, body: Record<string, unknown>) {
  const shiftId = assertUuid(idInput, "Dienst");
  const rows = (await ctx.sql`
    SELECT s.*, to_char(s.starts_at AT TIME ZONE (SELECT timezone FROM carecore_organizations WHERE id = s.organization_id), 'YYYY-MM-DD') AS day,
      (SELECT COUNT(*) FROM carecore_shift_assignments a WHERE a.shift_id = s.id AND a.status <> 'absent')::int AS filled
    FROM carecore_shifts s WHERE s.id = ${shiftId} AND s.organization_id = ${ctx.actor.organizationId} AND s.status <> 'cancelled'`) as Row[];
  const shift = rows[0];
  if (!shift) throw new ApiError("Dienst nicht gefunden.", 404);
  if (Date.parse(String(iso(shift.ends_at))) < Date.now())
    throw new ApiError("Dieser Dienst liegt in der Vergangenheit.", 409);

  if (body.action === "cancel") {
    requireManage(ctx);
    if (Number(shift.filled) > 0) throw new ApiError("Bitte zuerst alle eingeteilten Personen entfernen.", 409);
    const reason = text(body.reason, 1000);
    if (!reason) throw new ApiError("Bitte einen Grund angeben.");
    await ctx.sql`UPDATE carecore_shifts SET status = 'cancelled', cancel_reason = ${reason} WHERE id = ${shiftId}`;
    await writeAudit(ctx, "shift", shiftId, "cancelled", null, { reason });
    return;
  }
  if (body.action === "assign" || body.action === "take") {
    const self = body.action === "take";
    if (!self) requireManage(ctx);
    if (self && Number(shift.filled) >= Number(shift.required_staff))
      throw new ApiError("Dieser Dienst ist bereits voll besetzt.", 409);
    const person = await assertPerson(ctx, self ? ctx.actor.id : body.userId);
    const slot = {
      day: String(shift.day),
      startsAt: iso(shift.starts_at) ?? "",
      endsAt: iso(shift.ends_at) ?? "",
    };
    const conflict = (await conflictsFor(ctx, person.id, [slot])).get(slot.day);
    if (conflict) throw new ApiError(`${person.name} ist zu dieser Zeit nicht verfügbar (${conflict}).`, 409);
    const statements = [
      ctx.sql`
        INSERT INTO carecore_shift_assignments (id, shift_id, user_id, role, status, confirmed_at)
        VALUES (${randomUUID()}, ${shiftId}, ${person.id}, ${person.jobTitle || null}, ${self ? "confirmed" : "scheduled"},
          ${self ? new Date().toISOString() : null})
        ON CONFLICT (shift_id, user_id) DO UPDATE SET status = EXCLUDED.status, absence_reason = NULL, absence_id = NULL`,
    ];
    if (Number(shift.filled) >= Number(shift.required_staff))
      statements.push(
        ctx.sql`UPDATE carecore_shifts SET required_staff = LEAST(required_staff + 1, 20) WHERE id = ${shiftId}`,
      );
    await ctx.sql.transaction(statements);
    await writeAudit(ctx, "shift", shiftId, self ? "taken" : "assigned", null, { userId: person.id });
    if (self)
      await notifyManagers(
        ctx,
        `Offener Dienst übernommen: ${shift.name} ${dayLabel(slot.day)}`,
        `${person.name} hat den offenen Dienst übernommen.`,
        "normal",
      );
    else
      await notify(
        ctx,
        person.id,
        `Neuer Dienst am ${dayLabel(slot.day)}`,
        `${shift.name}. Bitte im Dienstplan bestätigen.`,
        "shift_assigned",
        "/c/betrieb/dienstplanung",
      );
    return;
  }
  throw new ApiError("Unbekannte Aktion.");
}

export async function requestAbsence(ctx: ApiContext, body: Record<string, unknown>) {
  const { sql, actor } = ctx;
  const kind = typeof body.kind === "string" && body.kind in ABSENCE_KINDS ? (body.kind as AbsenceKind) : null;
  if (!kind) throw new ApiError("Bitte die Art der Abwesenheit wählen.");
  const startsOn = typeof body.startsOn === "string" && DATE.test(body.startsOn) ? body.startsOn : "";
  const endsOn = typeof body.endsOn === "string" && DATE.test(body.endsOn) ? body.endsOn : "";
  if (!startsOn || !endsOn) throw new ApiError("Bitte Beginn und Ende angeben.");
  if (endsOn < startsOn) throw new ApiError("Das Ende liegt vor dem Beginn.");
  if (Date.parse(endsOn) - Date.parse(startsOn) > 366 * DAY)
    throw new ApiError("Eine Abwesenheit darf höchstens ein Jahr dauern.");
  const today = await orgToday(ctx);
  if (kind !== "sick" && startsOn < today) throw new ApiError("Nur Krankheit kann rückwirkend gemeldet werden.");
  if (kind === "sick" && startsOn < addDays(today, -14))
    throw new ApiError("Krankheit kann höchstens 14 Tage rückwirkend gemeldet werden.");
  const overlap = (await sql`
    SELECT 1 FROM carecore_absences WHERE user_id = ${actor.id} AND status IN ('requested', 'approved')
      AND starts_on <= ${endsOn}::date AND ends_on >= ${startsOn}::date LIMIT 1`) as Row[];
  if (overlap[0]) throw new ApiError("Für diesen Zeitraum besteht bereits eine Abwesenheit.", 409);
  const substitute = body.substituteUserId ? await assertPerson(ctx, body.substituteUserId) : null;
  if (substitute?.id === actor.id) throw new ApiError("Du kannst dich nicht selbst vertreten.");

  const id = randomUUID();
  await sql`
    INSERT INTO carecore_absences (id, organization_id, user_id, kind, starts_on, ends_on, urgent, substitute_user_id, note)
    VALUES (${id}, ${actor.organizationId}, ${actor.id}, ${kind}, ${startsOn}, ${endsOn}, ${body.urgent === true},
      ${substitute?.id ?? null}, ${text(body.note, 2000) || null})`;
  await writeAudit(ctx, "absence", id, "requested", null, {
    kind,
    startsOn,
    endsOn,
    substituteUserId: substitute?.id ?? null,
  });
  // Sick leave is a notification, not a request: it takes effect immediately.
  if (kind === "sick") await applyAbsence(ctx, id, null);
  await notifyManagers(
    ctx,
    `${kind === "sick" ? "Krankmeldung" : "Abwesenheitsantrag"}: ${actor.display_name}`,
    `${ABSENCE_KINDS[kind]} ${dayLabel(startsOn)}–${dayLabel(endsOn)}${kind === "sick" ? " – betroffene Dienste sind jetzt offen." : ""}`,
    kind === "sick" || body.urgent === true ? "high" : "normal",
  );
  return id;
}

// Approves an absence: affected duties become open slots, a named substitute is planned in.
async function applyAbsence(ctx: ApiContext, absenceId: string, decisionNote: string | null) {
  const { sql, actor } = ctx;
  const absence = (await selectAbsences(ctx, { id: absenceId }))[0];
  const substitute = ((await sql`SELECT substitute_user_id FROM carecore_absences WHERE id = ${absenceId}`) as Row[])[0]
    ?.substitute_user_id as string | null;
  const affected = (await sql`
    UPDATE carecore_shift_assignments a SET status = 'absent', absence_reason = ${ABSENCE_KINDS[absence.kind]}, absence_id = ${absenceId}
    FROM carecore_shifts s
    WHERE s.id = a.shift_id AND a.user_id = ${absence.userId} AND s.organization_id = ${actor.organizationId}
      AND s.status <> 'cancelled' AND a.checked_in_at IS NULL AND a.status <> 'absent'
      AND (s.starts_at AT TIME ZONE (SELECT timezone FROM carecore_organizations WHERE id = ${actor.organizationId}))::date
        BETWEEN ${absence.startsOn}::date AND ${absence.endsOn}::date
    RETURNING s.id AS shift_id, s.starts_at, s.ends_at, s.name, a.role, to_char(s.starts_at AT TIME ZONE (SELECT timezone FROM carecore_organizations WHERE id = s.organization_id), 'YYYY-MM-DD') AS day`) as Row[];
  await sql`
    UPDATE carecore_absences SET status = 'approved', decided_by = ${actor.id}, decided_at = NOW(),
      decision_note = ${decisionNote}, updated_at = NOW() WHERE id = ${absenceId}`;

  let covered = 0;
  if (substitute && affected.length) {
    const slots = affected.map((row) => ({
      day: String(row.day),
      startsAt: iso(row.starts_at) ?? "",
      endsAt: iso(row.ends_at) ?? "",
    }));
    slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const conflicts = await conflictsFor(ctx, substitute, slots);
    const statements = affected
      .filter((row) => !conflicts.has(String(row.day)))
      .map(
        (row) => sql`
          INSERT INTO carecore_shift_assignments (id, shift_id, user_id, role, status)
          VALUES (${randomUUID()}, ${String(row.shift_id)}, ${substitute}, ${(row.role as string | null) ?? null}, 'scheduled')
          ON CONFLICT (shift_id, user_id) DO NOTHING`,
      );
    covered = statements.length;
    if (statements.length) await sql.transaction(statements);
    if (covered)
      await notify(
        ctx,
        substitute,
        `Vertretung: ${covered} ${covered === 1 ? "Dienst" : "Dienste"} für ${absence.name}`,
        `${ABSENCE_KINDS[absence.kind]} ${dayLabel(absence.startsOn)}–${dayLabel(absence.endsOn)}. Bitte im Dienstplan bestätigen.`,
        "shift_assigned",
        "/c/betrieb/dienstplanung",
      );
  }
  return { affected: affected.length, covered };
}

export async function decideAbsence(ctx: ApiContext, idInput: unknown, body: Record<string, unknown>) {
  const id = assertUuid(idInput, "Abwesenheit");
  const absence = (await selectAbsences(ctx, { id }))[0];
  if (!absence) throw new ApiError("Abwesenheit nicht gefunden.", 404);
  const note = text(body.note, 1000) || null;
  const period = `${ABSENCE_KINDS[absence.kind]} ${dayLabel(absence.startsOn)}–${dayLabel(absence.endsOn)}`;

  if (body.action === "withdraw") {
    if (absence.userId !== ctx.actor.id) throw new ApiError("Nur die antragstellende Person kann zurückziehen.", 403);
    if (absence.status !== "requested") throw new ApiError("Nur offene Anträge können zurückgezogen werden.", 409);
    await ctx.sql`UPDATE carecore_absences SET status = 'withdrawn', updated_at = NOW() WHERE id = ${id}`;
    await writeAudit(ctx, "absence", id, "withdrawn", { status: absence.status }, { status: "withdrawn" });
    return { affected: 0, covered: 0 };
  }
  requireManage(ctx);
  if (body.action === "approve") {
    if (absence.status !== "requested") throw new ApiError("Der Antrag wurde bereits entschieden.", 409);
    const result = await applyAbsence(ctx, id, note);
    await writeAudit(
      ctx,
      "absence",
      id,
      "approved",
      { status: absence.status },
      { status: "approved", note, ...result },
    );
    await notify(ctx, absence.userId, `Abwesenheit bewilligt`, period, "absence_decided", "/c/betrieb/dienstplanung");
    return result;
  }
  if (body.action === "reject") {
    if (absence.status !== "requested") throw new ApiError("Der Antrag wurde bereits entschieden.", 409);
    if (!note) throw new ApiError("Bitte die Ablehnung begründen.");
    await ctx.sql`
      UPDATE carecore_absences SET status = 'rejected', decided_by = ${ctx.actor.id}, decided_at = NOW(), decision_note = ${note},
        updated_at = NOW() WHERE id = ${id}`;
    await writeAudit(ctx, "absence", id, "rejected", { status: absence.status }, { status: "rejected", note });
    await notify(
      ctx,
      absence.userId,
      `Abwesenheit abgelehnt`,
      `${period}: ${note}`,
      "absence_decided",
      "/c/betrieb/dienstplanung",
      "high",
    );
    return { affected: 0, covered: 0 };
  }
  if (body.action === "revoke") {
    if (absence.status !== "approved")
      throw new ApiError("Nur bewilligte Abwesenheiten können aufgehoben werden.", 409);
    if (!note) throw new ApiError("Bitte den Grund angeben.");
    // Future duties return to the person; past ones stay documented as absent.
    const restored = (await ctx.sql`
      UPDATE carecore_shift_assignments a SET status = 'scheduled', absence_reason = NULL, absence_id = NULL
      FROM carecore_shifts s WHERE s.id = a.shift_id AND a.absence_id = ${id} AND s.starts_at > NOW()
      RETURNING a.id`) as Row[];
    await ctx.sql`
      UPDATE carecore_absences SET status = 'revoked', decided_by = ${ctx.actor.id}, decided_at = NOW(), decision_note = ${note},
        updated_at = NOW() WHERE id = ${id}`;
    await writeAudit(
      ctx,
      "absence",
      id,
      "revoked",
      { status: absence.status },
      { status: "revoked", note, restored: restored.length },
    );
    await notify(
      ctx,
      absence.userId,
      `Abwesenheit aufgehoben`,
      `${period}: ${note}`,
      "absence_decided",
      "/c/betrieb/dienstplanung",
      "high",
    );
    return { affected: restored.length, covered: 0 };
  }
  throw new ApiError("Unbekannte Aktion.");
}

// Reminders 24 hours before duties that asked for one (called when notifications are loaded).
export async function createShiftReminders(ctx: ApiContext) {
  await ctx.sql`
    WITH due AS (
      UPDATE carecore_shift_assignments a SET reminded_at = NOW()
      FROM carecore_shifts s
      WHERE s.id = a.shift_id AND a.user_id = ${ctx.actor.id} AND a.remind AND a.reminded_at IS NULL
        AND a.status IN ('scheduled', 'confirmed') AND s.status <> 'cancelled'
        AND s.starts_at > NOW() AND s.starts_at <= NOW() + INTERVAL '24 hours'
        AND s.organization_id = ${ctx.actor.organizationId}
      RETURNING s.name, s.starts_at
    )
    INSERT INTO carecore_notifications (id, user_id, title, body, type, priority, link_url)
    SELECT gen_random_uuid(), ${ctx.actor.id}, 'Dienst morgen: ' || name,
      'Beginn ' || to_char(starts_at AT TIME ZONE (SELECT timezone FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}), 'DD.MM. HH24:MI') || ' Uhr.',
      'shift_reminder', 'normal', '/c/betrieb/dienstplanung'
    FROM due`;
}
