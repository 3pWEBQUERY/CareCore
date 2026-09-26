import { randomUUID } from "node:crypto";
import { ApiError, assertUuid, iso, type ApiContext, type Row } from "@/lib/api-context";
import { listCareUnits } from "@/lib/medication";
import { hasPermission } from "@/lib/server-data";
import { listPeople } from "@/lib/tasks";
import {
  weekdaysBetween,
  type Absence,
  type AbsenceKind,
  type ScheduleAssignment,
  type SchedulePayload,
  type ScheduleShift,
} from "@/lib/schedule-shared";

export const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DAY = 86_400_000;

export const canManage = (ctx: ApiContext) => hasPermission(ctx.actor, "schedule.manage");
export function requireManage(ctx: ApiContext) {
  if (!canManage(ctx)) throw new ApiError("Nur die Dienstplanung darf Dienste einteilen oder ändern.", 403);
}

export const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);

export async function orgToday({ sql, actor }: ApiContext) {
  const rows = (await sql`
    SELECT to_char(NOW() AT TIME ZONE timezone, 'YYYY-MM-DD') AS today FROM carecore_organizations WHERE id = ${actor.organizationId}`) as Row[];
  return String(rows[0].today);
}

export async function notify(
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

export async function notifyManagers(ctx: ApiContext, title: string, body: string, priority: string) {
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

export async function selectAbsences(
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
