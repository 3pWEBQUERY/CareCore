import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await carecoreActor();
    if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    const sql = carecoreDb();
    const notifications =
      await sql`SELECT id, title, body, type, priority, link_url, read_at, created_at FROM carecore_notifications WHERE user_id = ${actor.id} ORDER BY created_at DESC LIMIT 100`;
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Notifications GET failed", error);
    return NextResponse.json({ error: "Benachrichtigungen konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    const body = (await request.json()) as { id?: unknown; all?: unknown };
    const sql = carecoreDb();
    if (body.all === true) {
      await sql`UPDATE carecore_notifications SET read_at = COALESCE(read_at, NOW()) WHERE user_id = ${actor.id}`;
    } else if (typeof body.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id)) {
      await sql`UPDATE carecore_notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ${body.id} AND user_id = ${actor.id}`;
    } else return NextResponse.json({ error: "Ungültige Benachrichtigung." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notifications PATCH failed", error);
    return NextResponse.json({ error: "Änderung konnte nicht gespeichert werden." }, { status: 500 });
  }
}
