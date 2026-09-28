import { NextResponse } from "next/server";
import type { ResidentAuditEntry } from "@/lib/resident-audit-labels";
import { carecoreActor, carecoreDb, forbidden, hasPermission } from "@/lib/server-data";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Änderungsprotokoll einer Bewohnerakte (neueste zuerst). Sichtbar für alle, die die Akte bearbeiten dürfen.
export async function GET(request: Request, context: { params: Promise<{ residentId: string }> }) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    if (!hasPermission(actor, "residents.write")) return forbidden();
    const { residentId } = await context.params;
    if (!UUID.test(residentId)) return NextResponse.json({ error: "Bewohnerakte nicht verfügbar." }, { status: 404 });
    const sql = carecoreDb();
    const resident =
      await sql`SELECT id FROM carecore_residents WHERE id = ${residentId} AND organization_id = ${actor.organizationId}`;
    if (!resident[0]) return NextResponse.json({ error: "Bewohnerakte nicht verfügbar." }, { status: 404 });
    const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit")) || 100, 1), 500);
    const rows = (await sql`
      SELECT a.id, a.created_at, a.entity_type, a.action, a.before_data, a.after_data, COALESCE(u.display_name, 'System') AS actor
      FROM carecore_audit_log a LEFT JOIN carecore_users u ON u.id = a.actor_user_id
      WHERE a.organization_id = ${actor.organizationId}
        AND (a.entity_id = ${residentId} OR COALESCE(a.after_data ->> 'residentId', a.before_data ->> 'residentId') = ${residentId})
      ORDER BY a.created_at DESC
      LIMIT ${limit}`) as Array<Record<string, unknown>>;
    const entries: ResidentAuditEntry[] = rows.map((row) => ({
      id: String(row.id),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      actor: String(row.actor),
      entityType: String(row.entity_type),
      action: String(row.action),
      before: (row.before_data as Record<string, unknown> | null) ?? null,
      after: (row.after_data as Record<string, unknown> | null) ?? null,
    }));
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Resident audit GET failed", error);
    return NextResponse.json({ error: "Änderungsprotokoll konnte nicht geladen werden." }, { status: 500 });
  }
}
