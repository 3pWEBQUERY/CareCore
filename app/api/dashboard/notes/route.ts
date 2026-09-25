import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";

function parseNote(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 160) : "";
  const body = typeof input.body === "string" ? input.body.trim().slice(0, 4000) : "";
  if (!title || !body) return null;
  return { title, body, pinned: input.pinned === true };
}

export async function GET() {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    const sql = carecoreDb();
    const notes = await sql`SELECT id, title, body, pinned, created_at, updated_at
      FROM carecore_staff_notes WHERE organization_id = ${actor.organizationId} AND user_id = ${actor.id}
      ORDER BY pinned DESC, updated_at DESC LIMIT 100`;
    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Dashboard notes GET failed", error);
    return NextResponse.json({ error: "Notizen konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    const note = parseNote(await request.json());
    if (!note) return NextResponse.json({ error: "Titel und Notiztext sind erforderlich." }, { status: 400 });
    const sql = carecoreDb();
    const rows = await sql`INSERT INTO carecore_staff_notes (id, organization_id, user_id, title, body, pinned)
      VALUES (${randomUUID()}, ${actor.organizationId}, ${actor.id}, ${note.title}, ${note.body}, ${note.pinned})
      RETURNING id, title, body, pinned, created_at, updated_at`;
    return NextResponse.json({ note: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Dashboard notes POST failed", error);
    return NextResponse.json({ error: "Notiz konnte nicht gespeichert werden." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    const input = (await request.json()) as Record<string, unknown>;
    if (typeof input.id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.id))
      return NextResponse.json({ error: "Ungültige Notiz." }, { status: 400 });
    const note = parseNote(input);
    if (!note) return NextResponse.json({ error: "Titel und Notiztext sind erforderlich." }, { status: 400 });
    const sql = carecoreDb();
    const rows =
      await sql`UPDATE carecore_staff_notes SET title = ${note.title}, body = ${note.body}, pinned = ${note.pinned}, updated_at = NOW()
      WHERE id = ${input.id} AND organization_id = ${actor.organizationId} AND user_id = ${actor.id}
      RETURNING id, title, body, pinned, created_at, updated_at`;
    if (!rows[0]) return NextResponse.json({ error: "Notiz nicht gefunden." }, { status: 404 });
    return NextResponse.json({ note: rows[0] });
  } catch (error) {
    console.error("Dashboard notes PATCH failed", error);
    return NextResponse.json({ error: "Notiz konnte nicht gespeichert werden." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    const input = (await request.json()) as { id?: unknown };
    if (typeof input.id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.id))
      return NextResponse.json({ error: "Ungültige Notiz." }, { status: 400 });
    const sql = carecoreDb();
    const rows =
      await sql`DELETE FROM carecore_staff_notes WHERE id = ${input.id} AND organization_id = ${actor.organizationId} AND user_id = ${actor.id} RETURNING id`;
    if (!rows[0]) return NextResponse.json({ error: "Notiz nicht gefunden." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dashboard notes DELETE failed", error);
    return NextResponse.json({ error: "Notiz konnte nicht gelöscht werden." }, { status: 500 });
  }
}
