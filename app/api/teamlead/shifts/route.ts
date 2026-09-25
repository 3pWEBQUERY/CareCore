import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { carecoreActor, carecoreDb, forbidden, hasPermission } from "@/lib/server-data";
export const runtime = "nodejs";

export async function GET() {
  const actor = await carecoreActor();
  if (!actor?.organizationId || !hasPermission(actor, "schedule.manage")) return forbidden();
  const sql = carecoreDb();
  const shifts =
    await sql`SELECT s.id, s.name, s.starts_at, s.ends_at, s.status, cu.name AS care_unit_name, COALESCE(string_agg(u.display_name, ', ' ORDER BY u.display_name), '') AS assignees FROM carecore_shifts s LEFT JOIN carecore_care_units cu ON cu.id = s.care_unit_id LEFT JOIN carecore_shift_assignments a ON a.shift_id = s.id LEFT JOIN carecore_users u ON u.id = a.user_id WHERE s.organization_id = ${actor.organizationId} GROUP BY s.id, cu.name ORDER BY s.starts_at DESC LIMIT 100`;
  const employees =
    await sql`SELECT u.id, u.display_name FROM carecore_users u JOIN carecore_user_profiles p ON p.user_id = u.id WHERE p.organization_id = ${actor.organizationId} AND u.active = TRUE ORDER BY u.display_name`;
  const units =
    await sql`SELECT cu.id, cu.name FROM carecore_care_units cu JOIN carecore_sites s ON s.id = cu.site_id WHERE s.organization_id = ${actor.organizationId} AND cu.active = TRUE ORDER BY cu.name`;
  return NextResponse.json({ shifts, employees, units });
}
export async function POST(request: Request) {
  const actor = await carecoreActor();
  if (!actor?.organizationId || !hasPermission(actor, "schedule.manage")) return forbidden();
  const body = (await request.json()) as {
    name?: string;
    careUnitId?: string;
    startsAt?: string;
    endsAt?: string;
    employeeIds?: string[];
  };
  if (!body.name || !body.startsAt || !body.endsAt)
    return NextResponse.json({ error: "Bezeichnung, Beginn und Ende sind erforderlich." }, { status: 400 });
  const sql = carecoreDb();
  const id = randomUUID();
  if (body.careUnitId) {
    const unit =
      await sql`SELECT cu.id FROM carecore_care_units cu JOIN carecore_sites si ON si.id = cu.site_id WHERE cu.id = ${body.careUnitId} AND si.organization_id = ${actor.organizationId} LIMIT 1`;
    if (!unit[0]) return NextResponse.json({ error: "Der gewählte Wohnbereich ist nicht verfügbar." }, { status: 400 });
  }
  const employeeIds = body.employeeIds?.length
    ? (
        await sql`SELECT user_id FROM carecore_user_profiles WHERE organization_id = ${actor.organizationId} AND user_id = ANY(${body.employeeIds}::uuid[])`
      ).map((row) => row.user_id as string)
    : [];
  await sql`INSERT INTO carecore_shifts (id, organization_id, care_unit_id, name, starts_at, ends_at) VALUES (${id}, ${actor.organizationId}, ${body.careUnitId || null}, ${body.name}, ${body.startsAt}, ${body.endsAt})`;
  for (const userId of employeeIds)
    await sql`INSERT INTO carecore_shift_assignments (id, shift_id, user_id, role) VALUES (${randomUUID()}, ${id}, ${userId}, 'Mitarbeitende:r') ON CONFLICT (shift_id, user_id) DO NOTHING`;
  return NextResponse.json({ id }, { status: 201 });
}
export async function PATCH(request: Request) {
  const actor = await carecoreActor();
  if (!actor?.organizationId || !hasPermission(actor, "schedule.manage")) return forbidden();
  const body = (await request.json()) as { id?: string; action?: string };
  if (!body.id) return NextResponse.json({ error: "Dienst fehlt." }, { status: 400 });
  const sql = carecoreDb();
  const rows =
    await sql`UPDATE carecore_shifts SET status = ${body.action === "archive" ? "cancelled" : "planned"} WHERE id = ${body.id} AND organization_id = ${actor.organizationId} RETURNING id`;
  if (!rows[0]) return NextResponse.json({ error: "Dienst nicht gefunden." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
