import { iso, type ApiContext, type Row } from "@/lib/api-context";
import {
  type ChecklistKey,
  type HandoverStatus,
  type MyShift,
  type ShiftHistory,
  type ShiftPulse,
} from "@/lib/shift-shared";

export const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function orgTimezone({ sql, actor }: ApiContext) {
  const rows = (await sql`SELECT timezone FROM carecore_organizations WHERE id = ${actor.organizationId}`) as Row[];
  return String(rows[0]?.timezone ?? "Europe/Zurich");
}

export const clock = (value: string, tz: string) =>
  new Intl.DateTimeFormat("de-CH", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
export const localDate = (value: string | number, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(value),
  );
export const residentLabel = (row: Row) =>
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
export async function myShifts({ sql, actor }: ApiContext) {
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

export async function primaryUnit({ sql, actor }: ApiContext) {
  const rows = (await sql`
    SELECT p.primary_care_unit_id AS id, cu.name FROM carecore_user_profiles p
    LEFT JOIN carecore_care_units cu ON cu.id = p.primary_care_unit_id WHERE p.user_id = ${actor.id} LIMIT 1`) as Row[];
  return rows[0]?.id ? { id: String(rows[0].id), name: String(rows[0].name) } : null;
}

export async function staffing({ sql, actor }: ApiContext, unitId: string | null) {
  const rows = (await sql`
    SELECT COUNT(*) FILTER (WHERE a.checked_in_at IS NOT NULL AND a.checked_out_at IS NULL)::int AS present,
      COUNT(*)::int AS planned
    FROM carecore_shift_assignments a JOIN carecore_shifts s ON s.id = a.shift_id
    WHERE s.organization_id = ${actor.organizationId} AND s.status <> 'cancelled' AND a.status <> 'absent'
      AND a.checked_out_at IS NULL AND s.starts_at <= NOW() AND s.ends_at > NOW()
      AND (${unitId}::uuid IS NULL OR s.care_unit_id = ${unitId}::uuid)`) as Row[];
  return { present: Number(rows[0]?.present ?? 0), planned: Number(rows[0]?.planned ?? 0) };
}

export async function residentCount({ sql, actor }: ApiContext, unitId: string | null) {
  const rows = (await sql`
    SELECT COUNT(*)::int AS n FROM carecore_residents r
    WHERE r.organization_id = ${actor.organizationId} AND r.status = 'active'
      AND (${unitId}::uuid IS NULL OR EXISTS (
        SELECT 1 FROM carecore_resident_stays st WHERE st.resident_id = r.id AND st.ended_at IS NULL AND st.care_unit_id = ${unitId}::uuid))`) as Row[];
  return Number(rows[0]?.n ?? 0);
}

export async function openTaskCount({ sql, actor }: ApiContext) {
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
