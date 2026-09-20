import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await carecoreActor();
    if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    if (!actor.organizationId) return NextResponse.json({ tasks: [] });
    const sql = carecoreDb();
    const tasks = await sql`SELECT t.id, t.title, t.description, t.priority, t.status, t.due_at, t.assigned_to,
      COALESCE(r.first_name || ' ' || r.last_name, '') AS resident_name,
      COALESCE(u.display_name, '') AS owner_name,
      COALESCE(cu.name, '') AS care_unit
      FROM carecore_tasks t
      LEFT JOIN carecore_residents r ON r.id = t.resident_id
      LEFT JOIN carecore_users u ON u.id = t.assigned_to
      LEFT JOIN carecore_care_units cu ON cu.id = t.care_unit_id
      WHERE t.organization_id = ${actor.organizationId}
      ORDER BY t.due_at NULLS LAST, t.created_at DESC LIMIT 250`;
    return NextResponse.json({ tasks, currentUserId: actor.id });
  } catch (error) { console.error("Tasks GET failed", error); return NextResponse.json({ error: "Aufgaben konnten nicht geladen werden." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    if (!actor.organizationId) return NextResponse.json({ error: "Keine Organisation zugeordnet." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 240) : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 5000) : "";
    const priority = ["low", "normal", "high", "critical"].includes(String(body.priority)) ? String(body.priority) : "normal";
    const dueAt = typeof body.dueAt === "string" && !Number.isNaN(Date.parse(body.dueAt)) ? new Date(body.dueAt).toISOString() : null;
    if (!title) return NextResponse.json({ error: "Aufgabentitel fehlt." }, { status: 400 });
    const sql = carecoreDb();
    const residentName = typeof body.residentName === "string" ? body.residentName.trim() : "";
    const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() : "";
    const residents = residentName ? await sql`SELECT id FROM carecore_residents WHERE organization_id = ${actor.organizationId} AND first_name || ' ' || last_name = ${residentName} LIMIT 1` : [];
    const owners = ownerName ? await sql`SELECT u.id FROM carecore_users u JOIN carecore_user_profiles p ON p.user_id = u.id WHERE p.organization_id = ${actor.organizationId} AND u.display_name = ${ownerName} AND u.active = TRUE LIMIT 1` : [];
    const id = randomUUID();
    await sql`INSERT INTO carecore_tasks (id, organization_id, resident_id, assigned_to, created_by, title, description, priority, due_at) VALUES (${id}, ${actor.organizationId}, ${residents[0]?.id ?? null}, ${owners[0]?.id ?? actor.id}, ${actor.id}, ${title}, ${description}, ${priority}, ${dueAt})`;
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) { console.error("Tasks POST failed", error); return NextResponse.json({ error: "Aufgabe konnte nicht gespeichert werden." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    const body = await request.json() as { id?: unknown; completed?: unknown };
    if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || typeof body.completed !== "boolean") return NextResponse.json({ error: "Ungültige Aufgabe." }, { status: 400 });
    const sql = carecoreDb();
    const rows = await sql`UPDATE carecore_tasks SET status = ${body.completed ? "completed" : "open"}, completed_at = ${body.completed ? new Date().toISOString() : null}, updated_at = NOW() WHERE id = ${body.id} AND organization_id = ${actor.organizationId ?? null} RETURNING id`;
    if (!rows[0]) return NextResponse.json({ error: "Aufgabe nicht gefunden." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { console.error("Tasks PATCH failed", error); return NextResponse.json({ error: "Aufgabe konnte nicht aktualisiert werden." }, { status: 500 }); }
}
