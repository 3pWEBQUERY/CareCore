import { removeMedia } from "@/lib/storage";
import { ApiError, assertUuid, auditStatement, iso, type ApiContext, type Row } from "@/lib/api-context";
import { hasPermission } from "@/lib/server-data";
import { readSettings } from "@/lib/settings";

// Aufbewahrung und Löschung von Akten: Die Frist legt die Einrichtung fest (Leitung › Konfiguration). Nach Ablauf
// schlägt CareCore Akten ausgetretener und verstorbener Personen zur endgültigen Löschung vor; gelöscht wird nur auf
// ausdrückliche Bestätigung der Administration, nie automatisch.

export type RetentionCase = {
  id: string;
  name: string;
  status: "discharged" | "deceased" | "archived";
  exitedOn: string;
  dueOn: string;
};

function requireAdmin(ctx: ApiContext) {
  if (!hasPermission(ctx.actor, "administration.manage"))
    throw new ApiError("Löschungen nimmt die Administration vor.", 403);
}

async function retentionYears(ctx: ApiContext) {
  const setting = (await readSettings(ctx)).residentRetentionYears;
  return setting.enabled && setting.value ? setting.value : null;
}

// Akten, deren Aufbewahrungsfrist abgelaufen ist (Austritt = Todestag, Austrittsdatum oder Ende des letzten Aufenthalts).
async function dueRows(ctx: ApiContext, years: number, residentId: string | null) {
  return (await ctx.sql`
    WITH org AS (SELECT timezone FROM carecore_organizations WHERE id = ${ctx.actor.organizationId}),
    exits AS (
      SELECT r.id, r.first_name, r.last_name, r.status,
        COALESCE(r.deceased_on, r.discharged_on,
          (SELECT MAX(s.ended_at AT TIME ZONE org.timezone)::date FROM carecore_resident_stays s WHERE s.resident_id = r.id)) AS exited_on
      FROM carecore_residents r CROSS JOIN org
      WHERE r.organization_id = ${ctx.actor.organizationId} AND r.status IN ('discharged', 'deceased', 'archived')
        AND (${residentId}::uuid IS NULL OR r.id = ${residentId}::uuid))
    SELECT e.*, (e.exited_on + make_interval(years => ${years}::int))::date AS due_on
    FROM exits e CROSS JOIN org
    WHERE e.exited_on IS NOT NULL
      AND e.exited_on + make_interval(years => ${years}::int) <= (NOW() AT TIME ZONE org.timezone)::date
    ORDER BY e.exited_on, e.last_name`) as Row[];
}

export async function retentionOverview(ctx: ApiContext) {
  requireAdmin(ctx);
  const years = await retentionYears(ctx);
  if (!years) return { years: null, cases: [] as RetentionCase[] };
  const rows = await dueRows(ctx, years, null);
  return {
    years,
    cases: rows.map((row): RetentionCase => ({
      id: String(row.id),
      name: `${row.first_name} ${row.last_name}`,
      status: row.status as RetentionCase["status"],
      exitedOn: (iso(row.exited_on) ?? "").slice(0, 10),
      dueOn: (iso(row.due_on) ?? "").slice(0, 10),
    })),
  };
}

// Endgültige Löschung einer Akte nach Ablauf der Frist. Zur Bestätigung ist der vollständige Name einzugeben.
// Entfernt: Akte mit allen verknüpften Einträgen (Dokumentation, Medikation, Wunden, Vitalwerte …), Dokumente samt
// Dateien, Aufgaben, Übergaben, KI-Entwürfe und Benachrichtigungen zur Person. Qualitätsereignisse bleiben für die Statistik ohne
// Beschreibung und ohne Personenbezug. Im Protokoll bleiben die Einträge ohne Inhalte stehen.
export async function deleteResidentRecord(ctx: ApiContext, residentIdInput: unknown, confirmation: unknown) {
  requireAdmin(ctx);
  const residentId = assertUuid(residentIdInput, "Akte");
  const years = await retentionYears(ctx);
  if (!years) throw new ApiError("Bitte zuerst die Aufbewahrungsfrist festlegen.", 409);
  const [row] = await dueRows(ctx, years, residentId);
  if (!row) throw new ApiError("Die Aufbewahrungsfrist dieser Akte ist nicht abgelaufen.", 409);
  const name = `${row.first_name} ${row.last_name}`;
  if (typeof confirmation !== "string" || confirmation.trim() !== name)
    throw new ApiError("Bitte zur Bestätigung den vollständigen Namen eingeben.");
  const org = ctx.actor.organizationId;
  // Medien im Bucket: Schlüssel vorher merken, nach dem Löschen in der Datenbank entfernen.
  const media = (await ctx.sql`
    SELECT storage_key FROM carecore_cloud_files WHERE organization_id = ${org} AND storage_key IS NOT NULL AND id IN (
      SELECT file_id FROM carecore_documents WHERE resident_id = ${residentId} AND file_id IS NOT NULL)
    UNION ALL
    SELECT p.storage_key FROM carecore_wound_photos p JOIN carecore_wounds w ON w.id = p.wound_id
    WHERE w.resident_id = ${residentId} AND p.storage_key IS NOT NULL
    UNION ALL
    SELECT photo_storage_key FROM carecore_residents WHERE id = ${residentId} AND photo_storage_key IS NOT NULL`) as Row[];
  await ctx.sql.transaction([
    ctx.sql`
      DELETE FROM carecore_cloud_files WHERE organization_id = ${org} AND id IN (
        SELECT file_id FROM carecore_documents WHERE resident_id = ${residentId} AND file_id IS NOT NULL)`,
    ctx.sql`DELETE FROM carecore_documents WHERE organization_id = ${org} AND resident_id = ${residentId}`,
    ctx.sql`DELETE FROM carecore_tasks WHERE organization_id = ${org} AND resident_id = ${residentId}`,
    ctx.sql`DELETE FROM carecore_handovers WHERE resident_id = ${residentId}`,
    ctx.sql`DELETE FROM carecore_ai_drafts WHERE organization_id = ${org} AND resident_id = ${residentId}`,
    ctx.sql`
      DELETE FROM carecore_notifications
      WHERE user_id IN (SELECT user_id FROM carecore_user_profiles WHERE organization_id = ${org})
        AND (entity_id = ${residentId} OR link_url LIKE ${`%${residentId}%`}
          OR POSITION(${name} IN CONCAT_WS(' ', title, body)) > 0)`,
    ctx.sql`
      UPDATE carecore_quality_events SET resident_id = NULL, description = 'Gelöscht nach Ablauf der Aufbewahrungsfrist.',
        resolution = NULL, updated_at = NOW()
      WHERE organization_id = ${org} AND resident_id = ${residentId}`,
    ctx.sql`
      UPDATE carecore_audit_log SET before_data = NULL, after_data = NULL
      WHERE organization_id = ${org} AND (entity_id = ${residentId}
        OR after_data ->> 'residentId' = ${residentId} OR before_data ->> 'residentId' = ${residentId})`,
    ctx.sql`DELETE FROM carecore_residents WHERE organization_id = ${org} AND id = ${residentId}`,
    auditStatement(ctx, "resident_retention", residentId, "deleted", null, {
      exitedOn: (iso(row.exited_on) ?? "").slice(0, 10),
      retentionYears: years,
    }),
  ]);
  await removeMedia(media.map((entry) => entry.storage_key));
}
