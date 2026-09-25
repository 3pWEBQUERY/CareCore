import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb, forbidden, hasPermission } from "@/lib/server-data";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ residentId: string }> }) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    if (!hasPermission(actor, "residents.write")) return forbidden();
    const { residentId } = await context.params;
    const body = await request.json() as { gender?: unknown };
    if (typeof body.gender !== "string" || !["male", "female", "diverse", "unspecified"].includes(body.gender)) return NextResponse.json({ error: "Ungültiges Geschlecht." }, { status: 400 });
    const sql = carecoreDb();
    const rows = await sql`UPDATE carecore_residents SET gender = ${body.gender}, updated_at = NOW() WHERE id = ${residentId} AND organization_id = ${actor.organizationId} RETURNING gender`;
    if (!rows[0]) return NextResponse.json({ error: "Bewohnerakte nicht gefunden." }, { status: 404 });
    return NextResponse.json({ gender: rows[0].gender });
  } catch (error) {
    console.error("Resident PATCH failed", error);
    return NextResponse.json({ error: "Stammdaten konnten nicht gespeichert werden." }, { status: 500 });
  }
}
