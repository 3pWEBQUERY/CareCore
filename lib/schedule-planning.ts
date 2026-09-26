import { randomUUID } from "node:crypto";
import { ApiError, assertUuid, iso, text, writeAudit, type ApiContext, type Row } from "@/lib/api-context";
import { SHIFT_TYPES, type ShiftType } from "@/lib/shift-shared";
import { ABSENCE_KINDS, DUTY_REPEAT, DUTY_ROLES, type AbsenceKind, type DutyRepeat } from "@/lib/schedule-shared";
import { requireManage, DATE, TIME, orgToday, addDays, DAY, notify, canManage, notifyManagers } from "./schedule";

export type Slot = { day: string; startsAt: string; endsAt: string };

// Local shift slots for all planned days; the end lies on the next day when it is not after the start.
export async function slotsFor(ctx: ApiContext, days: string[], start: string, end: string): Promise<Slot[]> {
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
export async function conflictsFor(ctx: ApiContext, userId: string, slots: Slot[]) {
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

export async function assertPerson(ctx: ApiContext, userIdInput: unknown) {
  const userId = assertUuid(userIdInput, "Mitarbeitende Person");
  const rows = (await ctx.sql`
    SELECT u.id, u.display_name, COALESCE(p.job_title, '') AS job_title FROM carecore_users u
    JOIN carecore_user_profiles p ON p.user_id = u.id
    WHERE u.id = ${userId} AND p.organization_id = ${ctx.actor.organizationId} AND u.active = TRUE`) as Row[];
  if (!rows[0]) throw new ApiError("Die Person ist nicht verfügbar.", 404);
  return { id: userId, name: String(rows[0].display_name), jobTitle: String(rows[0].job_title) };
}

export const dayLabel = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.`;

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

export async function loadAssignment(ctx: ApiContext, idInput: unknown) {
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
