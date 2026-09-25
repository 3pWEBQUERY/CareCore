import { randomUUID } from "node:crypto";
import { ApiError, assertUuid, iso, text, writeAudit, type ApiContext, type Row } from "@/lib/api-context";
import { listRound } from "@/lib/medication";
import type { RoundKey } from "@/lib/medication-shared";
import {
  CHECKLIST,
  HANDOVER_STATUS,
  SHIFT_TYPES,
  type ChecklistKey,
  type HandoverStatus,
  type MyShift,
  type ShiftHint,
  type ShiftHistory,
  type ShiftOverview,
  type ShiftPulse,
  type ShiftType,
  type TimelineItem,
} from "@/lib/shift-shared";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function orgTimezone({ sql, actor }: ApiContext) {
  const rows = (await sql`SELECT timezone FROM carecore_organizations WHERE id = ${actor.organizationId}`) as Row[];
  return String(rows[0]?.timezone ?? "Europe/Zurich");
}

const clock = (value: string, tz: string) =>
  new Intl.DateTimeFormat("de-CH", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const localDate = (value: string | number, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(value),
  );
const residentLabel = (row: Row) =>
  row.resident_name ? `${row.resident_name}${row.room ? ` · ${row.room}` : ""}` : "";

function mapShift(row: Row | undefined): MyShift | null {
  if (!row) return null;
  return {
    assignmentId: String(row.assignment_id),
    shiftId: String(row.shift_id),
    name: String(row.name),
    startsAt: iso(row.starts_at) ?? "",
    endsAt: iso(row.ends_at) ?? "",
    careUnitId: (row.care_unit_id as string | null) ?? null,
    careUnit: (row.care_unit as string | null) ?? null,
    role: (row.role as string | null) ?? null,
    status: String(row.status),
    checkedInAt: iso(row.checked_in_at),
    checkedOutAt: iso(row.checked_out_at),
  };
}

// My running shift (checked in, or planned and about to start) and the next planned one.
async function myShifts({ sql, actor }: ApiContext) {
  const rows = (await sql`
    SELECT a.id AS assignment_id, s.id AS shift_id, s.name, s.starts_at, s.ends_at, s.care_unit_id, cu.name AS care_unit,
      a.role, a.status, a.checked_in_at, a.checked_out_at,
      (a.checked_in_at IS NOT NULL AND s.ends_at > NOW() - INTERVAL '6 hours')
        OR (a.checked_in_at IS NULL AND s.starts_at <= NOW() + INTERVAL '2 hours' AND s.ends_at > NOW()) AS is_current
    FROM carecore_shift_assignments a
    JOIN carecore_shifts s ON s.id = a.shift_id
    LEFT JOIN carecore_care_units cu ON cu.id = s.care_unit_id
    WHERE a.user_id = ${actor.id} AND s.organization_id = ${actor.organizationId} AND s.status <> 'cancelled'
      AND a.status <> 'absent' AND a.checked_out_at IS NULL AND s.ends_at > NOW() - INTERVAL '6 hours'
    ORDER BY a.checked_in_at IS NULL, s.starts_at
    LIMIT 5`) as Row[];
  const current = rows.find((row) => row.is_current);
  const next = rows.find(
    (row) => row !== current && !row.checked_in_at && Date.parse(String(iso(row.starts_at))) > Date.now(),
  );
  return { current: mapShift(current), next: mapShift(next) };
}

async function primaryUnit({ sql, actor }: ApiContext) {
  const rows = (await sql`
    SELECT p.primary_care_unit_id AS id, cu.name FROM carecore_user_profiles p
    LEFT JOIN carecore_care_units cu ON cu.id = p.primary_care_unit_id WHERE p.user_id = ${actor.id} LIMIT 1`) as Row[];
  return rows[0]?.id ? { id: String(rows[0].id), name: String(rows[0].name) } : null;
}

async function staffing({ sql, actor }: ApiContext, unitId: string | null) {
  const rows = (await sql`
    SELECT COUNT(*) FILTER (WHERE a.checked_in_at IS NOT NULL AND a.checked_out_at IS NULL)::int AS present,
      COUNT(*)::int AS planned
    FROM carecore_shift_assignments a JOIN carecore_shifts s ON s.id = a.shift_id
    WHERE s.organization_id = ${actor.organizationId} AND s.status <> 'cancelled' AND a.status <> 'absent'
      AND a.checked_out_at IS NULL AND s.starts_at <= NOW() AND s.ends_at > NOW()
      AND (${unitId}::uuid IS NULL OR s.care_unit_id = ${unitId}::uuid)`) as Row[];
  return { present: Number(rows[0]?.present ?? 0), planned: Number(rows[0]?.planned ?? 0) };
}

async function residentCount({ sql, actor }: ApiContext, unitId: string | null) {
  const rows = (await sql`
    SELECT COUNT(*)::int AS n FROM carecore_residents r
    WHERE r.organization_id = ${actor.organizationId} AND r.status = 'active'
      AND (${unitId}::uuid IS NULL OR EXISTS (
        SELECT 1 FROM carecore_resident_stays st WHERE st.resident_id = r.id AND st.ended_at IS NULL AND st.care_unit_id = ${unitId}::uuid))`) as Row[];
  return Number(rows[0]?.n ?? 0);
}

async function openTaskCount({ sql, actor }: ApiContext) {
  const rows = (await sql`
    SELECT COUNT(*)::int AS n FROM carecore_tasks
    WHERE organization_id = ${actor.organizationId} AND assigned_to = ${actor.id} AND status IN ('open', 'in_progress')
      AND (due_at IS NULL OR due_at < NOW() + INTERVAL '12 hours')`) as Row[];
  return Number(rows[0]?.n ?? 0);
}

export async function shiftPulse(ctx: ApiContext): Promise<ShiftPulse> {
  const [{ current, next }, tz, unit] = await Promise.all([myShifts(ctx), orgTimezone(ctx), primaryUnit(ctx)]);
  const unitId = current?.careUnitId ?? unit?.id ?? null;
  const [residents, openTasks, staff] = await Promise.all([
    residentCount(ctx, unitId),
    openTaskCount(ctx),
    staffing(ctx, unitId),
  ]);
  const label = current
    ? `${current.name} · ${clock(current.startsAt, tz)}–${clock(current.endsAt, tz)}`
    : next
      ? `Nächster Dienst: ${next.name}, ${new Intl.DateTimeFormat("de-CH", { timeZone: tz, weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(next.startsAt))} ${clock(next.startsAt, tz)}`
      : "Kein Dienst geplant";
  const unitName = current?.careUnit ?? unit?.name ?? "Gesamtes Haus";
  return {
    label,
    detail: current?.checkedInAt ? `Eingecheckt · ${unitName}` : `Live-Überblick · ${unitName}`,
    residents,
    openTasks,
    staffPresent: staff.present,
    staffPlanned: staff.planned,
  };
}

async function dayBounds({ sql, actor }: ApiContext, anchor: string | null) {
  const rows = (await sql`
    SELECT (d::timestamp AT TIME ZONE tz) AS day_from, ((d + 1)::timestamp AT TIME ZONE tz) AS day_to
    FROM (SELECT timezone AS tz, (COALESCE(${anchor}::timestamptz, NOW()) AT TIME ZONE timezone)::date AS d
      FROM carecore_organizations WHERE id = ${actor.organizationId}) x`) as Row[];
  return { from: iso(rows[0].day_from) ?? "", to: iso(rows[0].day_to) ?? "" };
}

async function medicationItems(
  ctx: ApiContext,
  window: { from: string; to: string },
  unitName: string | null,
  tz: string,
): Promise<TimelineItem[]> {
  const from = Date.parse(window.from);
  const to = Date.parse(window.to);
  // The night round of a day also covers the early hours of the next day.
  const calls: Array<[RoundKey, string]> = [["night", localDate(from - 86_400_000, tz)]];
  for (let day = localDate(from, tz); day <= localDate(to - 1, tz);) {
    for (const round of ["morning", "noon", "evening", "night"] as RoundKey[]) calls.push([round, day]);
    const nextDay = new Date(`${day}T12:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    day = nextDay.toISOString().slice(0, 10);
  }
  const rounds = await Promise.all(calls.map(([round, day]) => listRound(ctx, round, day)));
  const slots = new Map<
    string,
    { at: string; total: number; documented: number; changed: number; residents: Set<string> }
  >();
  for (const dose of rounds.flatMap((round) => round.doses)) {
    const at = Date.parse(dose.scheduledAt);
    if (at < from || at >= to || (unitName && dose.careUnit !== unitName)) continue;
    const slot = slots.get(dose.scheduledAt) ?? {
      at: dose.scheduledAt,
      total: 0,
      documented: 0,
      changed: 0,
      residents: new Set<string>(),
    };
    slot.total += 1;
    if (dose.status !== "scheduled") slot.documented += 1;
    if (dose.orderChangedRecently) slot.changed += 1;
    slot.residents.add(dose.residentId);
    slots.set(dose.scheduledAt, slot);
  }
  return [...slots.values()].map((slot) => {
    const done = slot.documented === slot.total;
    return {
      id: `medication-${slot.at}`,
      kind: "medication",
      at: slot.at,
      title: "Medikamentenrunde",
      detail: `${slot.residents.size} Bewohner · ${slot.total} ${slot.total === 1 ? "Gabe" : "Gaben"} · ${slot.documented} dokumentiert${slot.changed ? ` · ${slot.changed} Anpassung${slot.changed > 1 ? "en" : ""}` : ""}`,
      tone: slot.changed ? "attention" : "info",
      done,
      overdue: !done && Date.parse(slot.at) < Date.now() - 30 * 60_000,
      href: "/medikation/runde",
    } satisfies TimelineItem;
  });
}

export async function shiftOverview(ctx: ApiContext, params: URLSearchParams): Promise<ShiftOverview> {
  const { sql, actor } = ctx;
  const [{ current, next }, tz, primary, careUnits] = await Promise.all([
    myShifts(ctx),
    orgTimezone(ctx),
    primaryUnit(ctx),
    sql`SELECT cu.id, cu.name FROM carecore_care_units cu JOIN carecore_sites si ON si.id = cu.site_id
      WHERE si.organization_id = ${actor.organizationId} AND cu.active = TRUE ORDER BY cu.name` as Promise<Row[]>,
  ]);
  const units = careUnits.map((row) => ({ id: String(row.id), name: String(row.name) }));
  const requestedUnit = params.get("careUnitId");
  const unit =
    requestedUnit === "all"
      ? null
      : (units.find((u) => u.id === requestedUnit) ??
        (current?.careUnitId ? { id: current.careUnitId, name: current.careUnit ?? "" } : primary));
  const unitId = unit?.id ?? null;

  const fullDay = params.get("range") === "day" || !current;
  const window =
    current && !fullDay
      ? {
          from: current.startsAt,
          to: current.endsAt,
          label: `${current.name} · ${clock(current.startsAt, tz)}–${clock(current.endsAt, tz)}`,
        }
      : { ...(await dayBounds(ctx, current?.startsAt ?? null)), label: "Ganzer Tag" };

  const [
    taskRows,
    woundRows,
    appointmentRows,
    noteRows,
    vitalRows,
    orderRows,
    medication,
    residents,
    staff,
    openTasks,
  ] = await Promise.all([
    sql`
        SELECT t.id, t.title, t.category, t.priority, t.status, t.due_at, t.document_on_completion,
          r.first_name || ' ' || r.last_name AS resident_name, ro.name AS room
        FROM carecore_tasks t
        LEFT JOIN carecore_residents r ON r.id = t.resident_id
        LEFT JOIN LATERAL (SELECT room_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1) st ON TRUE
        LEFT JOIN carecore_rooms ro ON ro.id = st.room_id
        WHERE t.organization_id = ${actor.organizationId} AND t.status <> 'cancelled' AND t.due_at IS NOT NULL
          AND (t.assigned_to = ${actor.id} OR (t.assigned_to IS NULL AND t.team_visible AND (${unitId}::uuid IS NULL OR t.care_unit_id = ${unitId}::uuid)))
          AND ((t.due_at >= ${window.from} AND t.due_at < ${window.to}) OR (t.status IN ('open', 'in_progress') AND t.due_at < ${window.from})
            OR (t.status = 'completed' AND t.completed_at >= ${window.from} AND t.completed_at < ${window.to}))
        ORDER BY t.due_at LIMIT 100` as Promise<Row[]>,
    sql`
        SELECT w.id, w.title, r.first_name || ' ' || r.last_name AS resident_name, ro.name AS room, last.observed AS last_at,
          COALESCE(last.observed, w.discovered_at, w.created_at) + make_interval(days => w.care_interval_days) AS due_at,
          EXISTS (SELECT 1 FROM carecore_wound_entries e WHERE e.wound_id = w.id AND e.observed_at >= ${window.from} AND e.observed_at < ${window.to}) AS done
        FROM carecore_wounds w
        JOIN carecore_residents r ON r.id = w.resident_id AND r.organization_id = ${actor.organizationId} AND r.status = 'active'
        LEFT JOIN LATERAL (SELECT care_unit_id, room_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1) st ON TRUE
        LEFT JOIN carecore_rooms ro ON ro.id = st.room_id
        LEFT JOIN LATERAL (SELECT MAX(observed_at) AS observed FROM carecore_wound_entries WHERE wound_id = w.id) last ON TRUE
        WHERE w.status IN ('active', 'healing') AND w.care_interval_days IS NOT NULL
          AND (${unitId}::uuid IS NULL OR st.care_unit_id = ${unitId}::uuid)` as Promise<Row[]>,
    sql`
        SELECT a.id, a.title, a.category, a.starts_at, a.status, a.location,
          r.first_name || ' ' || r.last_name AS resident_name, ro.name AS room, cu.name AS unit_name
        FROM carecore_resident_appointments a
        LEFT JOIN carecore_residents r ON r.id = a.resident_id
        LEFT JOIN LATERAL (SELECT care_unit_id, room_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1) st ON TRUE
        LEFT JOIN carecore_rooms ro ON ro.id = st.room_id
        LEFT JOIN carecore_care_units cu ON cu.id = a.care_unit_id
        WHERE a.organization_id = ${actor.organizationId} AND a.status <> 'cancelled'
          AND a.starts_at >= ${window.from} AND a.starts_at < ${window.to}
          AND (${unitId}::uuid IS NULL OR a.care_unit_id = ${unitId}::uuid OR st.care_unit_id = ${unitId}::uuid)
        ORDER BY a.starts_at LIMIT 50` as Promise<Row[]>,
    sql`
        SELECT h.id, h.content, h.priority, r.first_name || ' ' || r.last_name AS resident_name
        FROM carecore_handovers h LEFT JOIN carecore_residents r ON r.id = h.resident_id
        WHERE h.organization_id = ${actor.organizationId} AND h.created_at > NOW() - INTERVAL '72 hours'
          AND h.author_user_id IS DISTINCT FROM ${actor.id}
          AND NOT EXISTS (SELECT 1 FROM carecore_handover_reads x WHERE x.handover_id = h.id AND x.user_id = ${actor.id})
          AND (${unitId}::uuid IS NULL OR h.care_unit_id IS NULL OR h.care_unit_id = ${unitId}::uuid)
        ORDER BY CASE h.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, h.created_at DESC` as Promise<
      Row[]
    >,
    sql`
        SELECT v.id, v.metric, v.value, v.unit, r.first_name || ' ' || r.last_name AS resident_name
        FROM carecore_vital_measurements v
        JOIN carecore_residents r ON r.id = v.resident_id AND r.organization_id = ${actor.organizationId}
        LEFT JOIN LATERAL (SELECT care_unit_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1) st ON TRUE
        WHERE v.status = 'critical' AND v.measured_at > NOW() - INTERVAL '12 hours'
          AND (${unitId}::uuid IS NULL OR st.care_unit_id = ${unitId}::uuid)
        ORDER BY v.measured_at DESC LIMIT 2` as Promise<Row[]>,
    sql`
        SELECT o.id, TRIM(CONCAT_WS(' ', m.name, m.strength)) AS medication, COALESCE(o.dosage->>'amount', '') AS amount,
          r.first_name || ' ' || r.last_name AS resident_name
        FROM carecore_medication_orders o
        JOIN carecore_residents r ON r.id = o.resident_id AND r.organization_id = ${actor.organizationId} AND r.status = 'active'
        LEFT JOIN carecore_medications m ON m.id = o.medication_id
        LEFT JOIN LATERAL (SELECT care_unit_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1) st ON TRUE
        WHERE o.status = 'active' AND o.updated_at > NOW() - INTERVAL '24 hours'
          AND (${unitId}::uuid IS NULL OR st.care_unit_id = ${unitId}::uuid)
        ORDER BY o.updated_at DESC LIMIT 2` as Promise<Row[]>,
    medicationItems(ctx, window, unit?.name ?? null, tz),
    residentCount(ctx, unitId),
    staffing(ctx, unitId),
    openTaskCount(ctx),
  ]);

  const now = Date.now();
  const tone = (priority: unknown) =>
    priority === "critical" ? "critical" : priority === "high" ? "attention" : ("info" as const);
  const timeline: TimelineItem[] = [
    ...taskRows.map((row): TimelineItem => {
      const done = row.status === "completed";
      return {
        id: `task-${row.id}`,
        kind: "task",
        at: iso(row.due_at) ?? "",
        title: String(row.title),
        detail: [residentLabel(row), row.category].filter(Boolean).join(" · "),
        tone: tone(row.priority),
        done,
        overdue: !done && Date.parse(String(iso(row.due_at))) < now,
        href: `/betrieb/aufgaben?task=${row.id}`,
        taskId: String(row.id),
        documentOnCompletion: Boolean(row.document_on_completion),
      };
    }),
    ...medication,
    ...woundRows.flatMap((row): TimelineItem[] => {
      const dueAt = iso(row.due_at) ?? "";
      if (!row.done && Date.parse(dueAt) >= Date.parse(window.to)) return [];
      return [
        {
          id: `wound-${row.id}`,
          kind: "wound",
          at: row.done ? (iso(row.last_at) ?? dueAt) : dueAt,
          title: "Wundversorgung",
          detail: `${residentLabel(row)} · ${row.title}`,
          tone: "attention",
          done: Boolean(row.done),
          overdue: !row.done && Date.parse(dueAt) < now,
          href: `/wundmanagement?wound=${row.id}`,
        },
      ];
    }),
    ...appointmentRows.map((row): TimelineItem => ({
      id: `appointment-${row.id}`,
      kind: "appointment",
      at: iso(row.starts_at) ?? "",
      title: String(row.title),
      detail: [residentLabel(row) || row.unit_name, row.category, row.location].filter(Boolean).join(" · "),
      tone: "info",
      done: row.status === "completed",
      overdue: false,
      href: "/betrieb/schicht/kalender",
    })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const hints: ShiftHint[] = [
    ...noteRows.slice(0, 2).map((row): ShiftHint => ({
      id: `note-${row.id}`,
      tone: row.priority === "critical" ? "critical" : row.priority === "high" ? "attention" : "info",
      title: `Übergabe${row.resident_name ? ` · ${row.resident_name}` : ""}`,
      text: String(row.content),
      href: "/betrieb/uebergabe",
    })),
    ...vitalRows.map((row): ShiftHint => ({
      id: `vital-${row.id}`,
      tone: "critical",
      title: `Kritischer Vitalwert · ${row.resident_name}`,
      text: `${row.metric} ${String(Number(row.value)).replace(".", ",")} ${row.unit}`,
      href: "/vitalwerte",
    })),
    ...orderRows.map((row): ShiftHint => ({
      id: `order-${row.id}`,
      tone: "attention",
      title: `Verordnung geändert · ${row.resident_name}`,
      text: `${row.medication}${row.amount ? ` ${row.amount}` : ""} – Wirkung beobachten.`,
      href: "/medikation",
    })),
  ];
  const overdue = timeline.filter((item) => item.overdue).length;
  if (overdue)
    hints.push({
      id: "overdue",
      tone: "attention",
      title: `${overdue} ${overdue === 1 ? "Punkt ist" : "Punkte sind"} überfällig`,
      text: "Im Tagesablauf rot markiert – bitte erledigen oder neu planen.",
      href: "/betrieb/aufgaben",
    });

  return {
    current,
    next,
    window,
    careUnit: { id: unitId, name: unit?.name ?? "Gesamtes Haus" },
    timeline,
    hints: hints.slice(0, 5),
    stats: {
      residents,
      tasks: taskRows.length,
      done: timeline.filter((item) => item.done).length,
      total: timeline.length,
      staffPresent: staff.present,
      staffPlanned: staff.planned,
    },
    careUnits: units,
    unreadHandover: noteRows.length,
    openTasks,
  };
}

function parseCheckIn(body: Record<string, unknown>) {
  const checklist = Array.isArray(body.checklist)
    ? [...new Set(body.checklist.filter((key): key is ChecklistKey => typeof key === "string" && key in CHECKLIST))]
    : [];
  const handoverStatus =
    typeof body.handoverStatus === "string" && body.handoverStatus in HANDOVER_STATUS
      ? (body.handoverStatus as HandoverStatus)
      : "pending";
  return { checklist, handoverStatus, note: text(body.note, 2000) || null };
}

export async function checkIn(ctx: ApiContext, body: Record<string, unknown>) {
  const { sql, actor } = ctx;
  const { current } = await myShifts(ctx);
  if (current?.checkedInAt) throw new ApiError("Du bist bereits in einem Dienst eingecheckt.", 409);
  const input = parseCheckIn(body);

  let assignmentId: string;
  let shiftId: string;
  if (body.assignmentId) {
    const id = assertUuid(body.assignmentId, "Dienst");
    const rows = (await sql`
      SELECT a.id, a.shift_id, a.checked_out_at FROM carecore_shift_assignments a JOIN carecore_shifts s ON s.id = a.shift_id
      WHERE a.id = ${id} AND a.user_id = ${actor.id} AND s.organization_id = ${actor.organizationId}
        AND s.status <> 'cancelled' AND s.starts_at <= NOW() + INTERVAL '2 hours' AND s.ends_at > NOW()`) as Row[];
    if (!rows[0]) throw new ApiError("Dieser Dienst kann jetzt nicht gestartet werden.", 409);
    if (rows[0].checked_out_at) throw new ApiError("Diesen Dienst hast du bereits beendet.", 409);
    assignmentId = id;
    shiftId = String(rows[0].shift_id);
  } else {
    const shiftType =
      typeof body.shiftType === "string" && body.shiftType in SHIFT_TYPES ? (body.shiftType as ShiftType) : null;
    if (!shiftType) throw new ApiError("Bitte den Dienst wählen.");
    if (typeof body.date !== "string" || !DATE.test(body.date)) throw new ApiError("Bitte das Startdatum wählen.");
    const unitId = body.careUnitId ? assertUuid(body.careUnitId, "Wohnbereich") : null;
    if (unitId) {
      const unit = (await sql`
        SELECT cu.id FROM carecore_care_units cu JOIN carecore_sites si ON si.id = cu.site_id
        WHERE cu.id = ${unitId} AND si.organization_id = ${actor.organizationId} AND cu.active = TRUE`) as Row[];
      if (!unit[0]) throw new ApiError("Wohnbereich nicht gefunden.", 404);
    }
    const { start, end } = SHIFT_TYPES[shiftType];
    const times = (await sql`
      SELECT ((${body.date}::date + ${start}::time) AT TIME ZONE timezone) AS starts_at,
        ((${body.date}::date + ${end <= start ? 1 : 0}::int + ${end}::time) AT TIME ZONE timezone) AS ends_at
      FROM carecore_organizations WHERE id = ${actor.organizationId}`) as Row[];
    const startsAt = iso(times[0].starts_at) ?? "";
    const endsAt = iso(times[0].ends_at) ?? "";
    if (Date.parse(startsAt) > Date.now() + 2 * 3_600_000 || Date.parse(endsAt) <= Date.now())
      throw new ApiError("Dieser Dienst liegt nicht im aktuellen Zeitraum. Bitte Dienst und Startdatum prüfen.");
    // Colleagues starting the same shift share one shift record.
    const existing = (await sql`
      SELECT s.id, a.id AS assignment_id, a.checked_out_at FROM carecore_shifts s
      LEFT JOIN carecore_shift_assignments a ON a.shift_id = s.id AND a.user_id = ${actor.id}
      WHERE s.organization_id = ${actor.organizationId} AND s.care_unit_id IS NOT DISTINCT FROM ${unitId}::uuid
        AND s.name = ${shiftType} AND s.starts_at = ${startsAt} AND s.status <> 'cancelled' LIMIT 1`) as Row[];
    if (existing[0]?.checked_out_at) throw new ApiError("Diesen Dienst hast du bereits beendet.", 409);
    shiftId = existing[0] ? String(existing[0].id) : randomUUID();
    assignmentId = existing[0]?.assignment_id ? String(existing[0].assignment_id) : randomUUID();
    const statements = [];
    if (!existing[0])
      statements.push(sql`
        INSERT INTO carecore_shifts (id, organization_id, care_unit_id, name, starts_at, ends_at, status)
        VALUES (${shiftId}, ${actor.organizationId}, ${unitId}, ${shiftType}, ${startsAt}, ${endsAt}, 'active')`);
    if (!existing[0]?.assignment_id)
      statements.push(sql`
        INSERT INTO carecore_shift_assignments (id, shift_id, user_id, role, status)
        SELECT ${assignmentId}, ${shiftId}, ${actor.id}, COALESCE(p.job_title, 'Mitarbeitende:r'), 'scheduled'
        FROM carecore_users u LEFT JOIN carecore_user_profiles p ON p.user_id = u.id WHERE u.id = ${actor.id}`);
    if (statements.length) await sql.transaction(statements);
  }

  await sql.transaction([
    sql`UPDATE carecore_shift_assignments SET status = 'confirmed', checked_in_at = NOW(), checklist = ${JSON.stringify(input.checklist)}::jsonb,
      handover_status = ${input.handoverStatus}, check_in_note = ${input.note} WHERE id = ${assignmentId}`,
    sql`UPDATE carecore_shifts SET status = 'active' WHERE id = ${shiftId} AND status = 'planned'`,
  ]);
  await writeAudit(ctx, "shift_assignment", assignmentId, "checked_in", null, input);
  return assignmentId;
}

export async function checkOut(ctx: ApiContext, body: Record<string, unknown>) {
  const { sql } = ctx;
  const { current } = await myShifts(ctx);
  if (!current?.checkedInAt) throw new ApiError("Du bist aktuell in keinem Dienst eingecheckt.", 409);
  const note = text(body.note, 2000) || null;
  await sql.transaction([
    sql`UPDATE carecore_shift_assignments SET status = 'completed', checked_out_at = NOW(), check_out_note = ${note}
      WHERE id = ${current.assignmentId}`,
    // The shift is completed once nobody is checked in any more.
    sql`UPDATE carecore_shifts SET status = 'completed' WHERE id = ${current.shiftId} AND NOT EXISTS (
      SELECT 1 FROM carecore_shift_assignments WHERE shift_id = ${current.shiftId} AND checked_in_at IS NOT NULL AND checked_out_at IS NULL)`,
  ]);
  await writeAudit(ctx, "shift_assignment", current.assignmentId, "checked_out", null, { note });
}

export async function shiftHistory(ctx: ApiContext, params: URLSearchParams): Promise<ShiftHistory> {
  const { sql, actor } = ctx;
  const days = [30, 90, 180, 365].includes(Number(params.get("days"))) ? Number(params.get("days")) : 90;
  const rows = (await sql`
    SELECT a.id, s.name, s.starts_at, s.ends_at, a.checked_in_at, a.checked_out_at, cu.name AS care_unit, a.status,
      a.handover_status, a.checklist, a.check_in_note, a.check_out_note,
      (SELECT COUNT(*) FROM carecore_documentation_entries d WHERE d.author_user_id = ${actor.id} AND d.created_at >= win.f AND d.created_at < win.t)::int AS docs,
      (SELECT COUNT(*) FROM carecore_vital_measurements v WHERE v.measured_by = ${actor.id} AND v.created_at >= win.f AND v.created_at < win.t)::int AS vitals,
      (SELECT COUNT(*) FROM carecore_medication_administrations m WHERE m.administered_by = ${actor.id} AND m.administered_at >= win.f AND m.administered_at < win.t)::int AS meds,
      (SELECT COUNT(*) FROM carecore_tasks t WHERE t.completed_by = ${actor.id} AND t.completed_at >= win.f AND t.completed_at < win.t)::int AS tasks,
      (SELECT COUNT(*) FROM carecore_handovers h WHERE h.author_user_id = ${actor.id} AND h.created_at >= win.f AND h.created_at < win.t)::int AS handovers
    FROM carecore_shift_assignments a
    JOIN carecore_shifts s ON s.id = a.shift_id
    LEFT JOIN carecore_care_units cu ON cu.id = s.care_unit_id
    CROSS JOIN LATERAL (SELECT COALESCE(a.checked_in_at, s.starts_at) AS f, COALESCE(a.checked_out_at, s.ends_at) AS t) win
    WHERE a.user_id = ${actor.id} AND s.organization_id = ${actor.organizationId} AND s.status <> 'cancelled'
      AND (a.checked_out_at IS NOT NULL OR s.ends_at < NOW()) AND s.starts_at > NOW() - make_interval(days => ${days})
    ORDER BY s.starts_at DESC LIMIT 200`) as Row[];
  const entries = rows.map((row) => ({
    assignmentId: String(row.id),
    name: String(row.name),
    startsAt: iso(row.starts_at) ?? "",
    endsAt: iso(row.ends_at) ?? "",
    checkedInAt: iso(row.checked_in_at),
    checkedOutAt: iso(row.checked_out_at),
    careUnit: (row.care_unit as string | null) ?? null,
    status:
      row.status === "absent" ? ("absent" as const) : row.checked_out_at ? ("completed" as const) : ("open" as const),
    handoverStatus: (row.handover_status as HandoverStatus | null) ?? null,
    checklist: (Array.isArray(row.checklist) ? row.checklist : []) as ChecklistKey[],
    checkInNote: (row.check_in_note as string | null) ?? null,
    checkOutNote: (row.check_out_note as string | null) ?? null,
    counts: {
      documentation: Number(row.docs),
      vitals: Number(row.vitals),
      medication: Number(row.meds),
      tasks: Number(row.tasks),
      handover: Number(row.handovers),
    },
  }));
  const worked = entries.filter((entry) => entry.status !== "absent");
  return {
    entries,
    totals: {
      shifts: worked.length,
      completed: worked.filter((entry) => entry.status === "completed").length,
      documentation: worked.reduce((sum, entry) => sum + entry.counts.documentation, 0),
      open: worked.filter((entry) => entry.status === "open").length,
    },
  };
}
