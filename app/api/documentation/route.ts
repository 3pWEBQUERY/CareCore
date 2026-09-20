import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await carecoreActor();
    if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    if (!actor.organizationId) return NextResponse.json({ entries: [] });
    const sql = carecoreDb();
    const entries = await sql`SELECT d.id, d.title, d.body, d.category, d.importance, d.occurred_at,
      r.first_name, r.last_name, COALESCE(ro.name, '') AS room, COALESCE(u.display_name, '') AS author
      FROM carecore_documentation_entries d
      JOIN carecore_residents r ON r.id = d.resident_id
      LEFT JOIN carecore_users u ON u.id = d.author_user_id
      LEFT JOIN LATERAL (SELECT room_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1) stay ON TRUE
      LEFT JOIN carecore_rooms ro ON ro.id = stay.room_id
      WHERE r.organization_id = ${actor.organizationId}
      ORDER BY d.occurred_at DESC LIMIT 250`;
    return NextResponse.json({ entries });
  } catch (error) { console.error("Documentation GET failed", error); return NextResponse.json({ error: "Dokumentation konnte nicht geladen werden." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    const body = await request.json() as Record<string, unknown>;
    const residentName = typeof body.residentName === "string" ? body.residentName.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim().slice(0, 10000) : "";
    const category = typeof body.category === "string" ? body.category.trim().slice(0, 80) : "Pflege";
    const importance = ["standard", "important", "visit", "observation", "critical"].includes(String(body.importance)) ? String(body.importance) : "standard";
    const occurredAt = typeof body.occurredAt === "string" && !Number.isNaN(Date.parse(body.occurredAt)) ? new Date(body.occurredAt).toISOString() : new Date().toISOString();
    if (!residentName || !content) return NextResponse.json({ error: "Bewohner und Eintrag sind Pflichtfelder." }, { status: 400 });
    const sql = carecoreDb();
    const residents = await sql`SELECT r.id, stay.care_unit_id FROM carecore_residents r LEFT JOIN LATERAL (SELECT care_unit_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1) stay ON TRUE WHERE r.organization_id = ${actor.organizationId ?? null} AND r.first_name || ' ' || r.last_name = ${residentName} LIMIT 1`;
    if (!residents[0]) return NextResponse.json({ error: "Bewohner nicht gefunden." }, { status: 404 });
    const id = randomUUID();
    await sql`INSERT INTO carecore_documentation_entries (id, resident_id, care_unit_id, author_user_id, category, title, body, occurred_at, importance) VALUES (${id}, ${residents[0].id}, ${residents[0].care_unit_id}, ${actor.id}, ${category}, ${category}, ${content}, ${occurredAt}, ${importance})`;
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) { console.error("Documentation POST failed", error); return NextResponse.json({ error: "Dokumentation konnte nicht gespeichert werden." }, { status: 500 }); }
}
