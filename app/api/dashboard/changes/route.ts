import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await carecoreActor();
    if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    if (!actor.organizationId) return NextResponse.json({ changes: [] });
    const sql = carecoreDb();
    const changes = await sql`SELECT d.id, d.title, d.body, d.importance, d.occurred_at, r.first_name, r.last_name FROM carecore_documentation_entries d JOIN carecore_residents r ON r.id = d.resident_id WHERE r.organization_id = ${actor.organizationId} ORDER BY d.occurred_at DESC LIMIT 12`;
    return NextResponse.json({ changes });
  } catch (error) { console.error("Dashboard changes GET failed", error); return NextResponse.json({ error: "Änderungen konnten nicht geladen werden." }, { status: 500 }); }
}
