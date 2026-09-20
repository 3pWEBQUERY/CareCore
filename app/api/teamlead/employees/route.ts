import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/auth";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";
const allowed = (role: string) => role === "admin" || role === "leitung";

export async function GET() {
  const actor = await carecoreActor();
  if (!actor || !allowed(actor.role) || !actor.organizationId) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  const sql = carecoreDb();
  const rows = await sql`SELECT u.id, u.username, u.display_name, u.role, u.active, u.archived_at, COALESCE(p.job_title, '') AS job_title, COALESCE(cu.name, '') AS care_unit_name FROM carecore_users u LEFT JOIN carecore_user_profiles p ON p.user_id = u.id LEFT JOIN carecore_care_units cu ON cu.id = p.primary_care_unit_id WHERE p.organization_id = ${actor.organizationId} ORDER BY u.active DESC, u.display_name`;
  const units = await sql`SELECT id, name FROM carecore_care_units WHERE active = TRUE ORDER BY name`;
  return NextResponse.json({ employees: rows, units });
}

export async function POST(request: Request) {
  const actor = await carecoreActor();
  if (!actor || !allowed(actor.role) || !actor.organizationId) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" && ["leitung", "pflege", "arzt", "mitarbeitende:r"].includes(body.role) ? body.role : "mitarbeitende:r";
  if (!displayName || !username || password.length < 10) return NextResponse.json({ error: "Name, Benutzername und ein Passwort mit mindestens 10 Zeichen sind erforderlich." }, { status: 400 });
  const sql = carecoreDb();
  const userId = randomUUID();
  try {
    await sql`INSERT INTO carecore_users (id, username, display_name, role, password_hash) VALUES (${userId}, ${username}, ${displayName}, ${role}, ${await hashPassword(password)})`;
    await sql`INSERT INTO carecore_user_profiles (user_id, organization_id, job_title, primary_care_unit_id) VALUES (${userId}, ${actor.organizationId}, ${typeof body.jobTitle === "string" ? body.jobTitle : "Mitarbeitende:r"}, ${typeof body.primaryCareUnitId === "string" ? body.primaryCareUnitId : null})`;
    return NextResponse.json({ id: userId }, { status: 201 });
  } catch (error) {
    if (String(error).toLowerCase().includes("duplicate")) return NextResponse.json({ error: "Der Benutzername ist bereits vergeben." }, { status: 409 });
    throw error;
  }
}

export async function PATCH(request: Request) {
  const actor = await carecoreActor();
  if (!actor || !allowed(actor.role)) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  const body = await request.json() as { id?: string; action?: string; displayName?: string; role?: string };
  if (!body.id) return NextResponse.json({ error: "Mitarbeiter fehlt." }, { status: 400 });
  const sql = carecoreDb();
  if (body.action === "archive") await sql`UPDATE carecore_users SET active = FALSE, archived_at = NOW(), archived_by = ${actor.id}, updated_at = NOW() WHERE id = ${body.id}`;
  else if (body.action === "restore") await sql`UPDATE carecore_users SET active = TRUE, archived_at = NULL, archived_by = NULL, updated_at = NOW() WHERE id = ${body.id}`;
  else await sql`UPDATE carecore_users SET display_name = COALESCE(${body.displayName ?? null}, display_name), role = COALESCE(${body.role ?? null}, role), updated_at = NOW() WHERE id = ${body.id}`;
  return NextResponse.json({ ok: true });
}
