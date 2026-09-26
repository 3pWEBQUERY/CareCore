import { randomUUID } from "node:crypto";
import { ApiError, assertUuid, iso, text, writeAudit, type ApiContext, type Row } from "@/lib/api-context";
import {
  CHECKLIST,
  HANDOVER_STATUS,
  SHIFT_TYPES,
  type ChecklistKey,
  type HandoverStatus,
  type ShiftType,
} from "@/lib/shift-shared";
import { myShifts, DATE } from "./shift";

export function parseCheckIn(body: Record<string, unknown>) {
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
