import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb, forbidden, hasPermission } from "@/lib/server-data";

export const runtime = "nodejs";
type Context = { params: Promise<{ residentId: string; observationId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    if (!hasPermission(actor, "documentation.write")) return forbidden();
    const { residentId, observationId } = await context.params;
    const input = (await request.json()) as Record<string, unknown>;
    const kind = typeof input.kind === "string" ? input.kind : "";
    const label = typeof input.label === "string" ? input.label.trim() : "";
    const location = typeof input.location === "string" ? input.location.trim() : "";
    const status = typeof input.status === "string" ? input.status.trim() : "";
    const notes = typeof input.notes === "string" ? input.notes.trim() : "";
    const x = Number(input.x),
      y = Number(input.y),
      z = Number(input.z);
    if (
      !["wound", "redness", "fracture", "other"].includes(kind) ||
      !label ||
      label.length > 120 ||
      !location ||
      location.length > 160 ||
      status.length > 120 ||
      notes.length > 4000 ||
      ![x, y, z].every((value) => Number.isFinite(value) && Math.abs(value) <= 3)
    )
      return NextResponse.json({ error: "Ungültige Befundangaben." }, { status: 400 });
    const sql = carecoreDb();
    const rows =
      await sql`UPDATE carecore_body_observations o SET kind = ${kind}, label = ${label}, location = ${location}, status = ${status || "Beobachten"}, notes = ${notes}, body_x = ${x}, body_y = ${y}, body_z = ${z}, updated_by = ${actor.id}, updated_at = NOW() FROM carecore_residents r WHERE o.id = ${observationId} AND o.resident_id = ${residentId} AND o.archived_at IS NULL AND r.id = o.resident_id AND r.organization_id = ${actor.organizationId} RETURNING o.id, o.kind, o.label, o.location, o.status, o.notes, o.body_x, o.body_y, o.body_z, o.created_at, o.updated_at, o.wound_id`;
    if (!rows[0]) return NextResponse.json({ error: "Befund nicht gefunden." }, { status: 404 });
    return NextResponse.json({ observation: { ...rows[0], author: actor.display_name } });
  } catch (error) {
    console.error("Body observation PATCH failed", error);
    return NextResponse.json({ error: "Befund konnte nicht gespeichert werden." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    if (!hasPermission(actor, "documentation.write")) return forbidden();
    const { residentId, observationId } = await context.params;
    const sql = carecoreDb();
    const rows =
      await sql`UPDATE carecore_body_observations o SET archived_at = NOW(), updated_by = ${actor.id}, updated_at = NOW() FROM carecore_residents r WHERE o.id = ${observationId} AND o.resident_id = ${residentId} AND o.archived_at IS NULL AND r.id = o.resident_id AND r.organization_id = ${actor.organizationId} RETURNING o.id`;
    if (!rows[0]) return NextResponse.json({ error: "Befund nicht gefunden." }, { status: 404 });
    return NextResponse.json({ archived: true });
  } catch (error) {
    console.error("Body observation DELETE failed", error);
    return NextResponse.json({ error: "Befund konnte nicht archiviert werden." }, { status: 500 });
  }
}
