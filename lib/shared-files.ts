import { randomUUID } from "node:crypto";
import { ApiError, iso, type Row } from "@/lib/api-context";
import { carecoreDb, hasPermission, type CarecoreActor } from "@/lib/server-data";
import { auditOrigin } from "@/lib/audit-origin";

// Files of "Meine Dateien" (purpose 'cloud', only the uploader) and of the
// "Gemeinsame Ablage" (purpose 'shared', the whole house, optionally in folders).

export type FileScope = "personal" | "shared";
export type StoredFileRow = {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
  can_edit: boolean;
};
export type SharedFolder = { id: string; name: string; files: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

// Team and administration leads look after the shared storage (folders, others' files).
export const managesSharedFiles = (actor: CarecoreActor) =>
  hasPermission(actor, "administration.manage") || hasPermission(actor, "team.manage");

function org(actor: CarecoreActor) {
  if (!actor.organizationId) throw new ApiError("Keine Organisation zugeordnet.", 400);
  return actor.organizationId;
}

const cleanName = (value: unknown, max: number) =>
  typeof value === "string"
    ? value
        .trim()
        .replace(/[\\/\u0000-\u001f]/g, "-")
        .slice(0, max)
    : "";

function mapFile(row: Row, actor: CarecoreActor): StoredFileRow {
  const own = row.uploaded_by === actor.id;
  return {
    id: String(row.id),
    name: String(row.name),
    mime_type: String(row.mime_type ?? ""),
    size_bytes: Number(row.size_bytes),
    uploaded_by: row.uploaded_by ? String(row.uploaded_by) : null,
    uploaded_by_name: row.uploaded_by_name ? String(row.uploaded_by_name) : null,
    folder_id: row.folder_id ? String(row.folder_id) : null,
    created_at: iso(row.created_at) ?? "",
    updated_at: iso(row.updated_at) ?? "",
    can_edit: own || (row.purpose === "shared" && managesSharedFiles(actor)),
  };
}

export async function listFiles(actor: CarecoreActor, scope: FileScope) {
  const sql = carecoreDb();
  const organizationId = org(actor);
  const [rows, folders] = await Promise.all([
    scope === "shared"
      ? sql`
          SELECT f.id, f.name, f.mime_type, f.size_bytes, f.uploaded_by, f.folder_id, f.purpose, f.created_at, f.updated_at,
            u.display_name AS uploaded_by_name
          FROM carecore_cloud_files f LEFT JOIN carecore_users u ON u.id = f.uploaded_by
          WHERE f.organization_id = ${organizationId} AND f.purpose = 'shared'
          ORDER BY f.created_at DESC`
      : sql`
          SELECT f.id, f.name, f.mime_type, f.size_bytes, f.uploaded_by, f.folder_id, f.purpose, f.created_at, f.updated_at,
            NULL AS uploaded_by_name
          FROM carecore_cloud_files f
          WHERE f.organization_id = ${organizationId} AND f.purpose = 'cloud' AND f.uploaded_by = ${actor.id}
          ORDER BY f.created_at DESC`,
    scope === "shared"
      ? sql`
          SELECT sf.id, sf.name,
            (SELECT COUNT(*) FROM carecore_cloud_files f WHERE f.folder_id = sf.id AND f.purpose = 'shared')::int AS files
          FROM carecore_shared_folders sf WHERE sf.organization_id = ${organizationId} ORDER BY sf.name`
      : Promise.resolve([] as Row[]),
  ]);
  return {
    files: (rows as Row[]).map((row) => mapFile(row, actor)),
    folders: (folders as Row[]).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      files: Number(row.files),
    })),
    canManage: scope === "shared" && managesSharedFiles(actor),
  };
}

async function assertFolder(actor: CarecoreActor, value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !UUID.test(value)) throw new ApiError("Ordner ist ungültig.");
  const rows = await carecoreDb()`
    SELECT id FROM carecore_shared_folders WHERE id = ${value} AND organization_id = ${org(actor)}`;
  if (!rows[0]) throw new ApiError("Ordner nicht gefunden.", 404);
  return value;
}

async function audit(actor: CarecoreActor, entityId: string, action: string, data: unknown) {
  await carecoreDb()`
    INSERT INTO carecore_audit_log (id, organization_id, actor_user_id, session_id, user_agent, entity_type, entity_id, action, after_data)
    VALUES (${randomUUID()}, ${org(actor)}, ${actor.id}, ${auditOrigin(actor).sessionId}, ${auditOrigin(actor).userAgent}, 'shared_file', ${entityId}, ${action}, ${JSON.stringify(data)}::jsonb)`;
}

export async function uploadFile(actor: CarecoreActor, form: FormData) {
  const scope: FileScope = form.get("scope") === "shared" ? "shared" : "personal";
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new ApiError("Bitte wähle eine Datei aus.");
  if (file.size > MAX_FILE_BYTES) throw new ApiError("Dateien dürfen höchstens 4 MB gross sein.", 413);
  const name = cleanName(file.name, 220);
  if (!name) throw new ApiError("Der Dateiname ist ungültig.");
  const folderId = scope === "shared" ? await assertFolder(actor, form.get("folderId")) : null;
  const id = randomUUID();
  const rows = await carecoreDb()`
    INSERT INTO carecore_cloud_files (id, organization_id, name, mime_type, size_bytes, content_base64, uploaded_by, purpose, folder_id)
    VALUES (${id}, ${org(actor)}, ${name}, ${file.type || "application/octet-stream"}, ${file.size},
      ${Buffer.from(await file.arrayBuffer()).toString("base64")}, ${actor.id}, ${scope === "shared" ? "shared" : "cloud"}, ${folderId})
    RETURNING id, name, mime_type, size_bytes, uploaded_by, folder_id, purpose, created_at, updated_at`;
  if (scope === "shared") await audit(actor, id, "uploaded", { name, folderId });
  return mapFile({ ...rows[0], uploaded_by_name: actor.display_name }, actor);
}

async function editableFile(actor: CarecoreActor, fileId: string) {
  if (!UUID.test(fileId)) throw new ApiError("Datei nicht gefunden.", 404);
  const rows = (await carecoreDb()`
    SELECT id, name, purpose, uploaded_by, folder_id FROM carecore_cloud_files
    WHERE id = ${fileId} AND organization_id = ${org(actor)} AND purpose IN ('cloud', 'shared')`) as Row[];
  const file = rows[0];
  const own = file?.uploaded_by === actor.id;
  // Not found and not allowed look the same, so file ids cannot be probed.
  if (!file || (file.purpose === "cloud" && !own) || (file.purpose === "shared" && !own && !managesSharedFiles(actor)))
    throw new ApiError("Datei nicht gefunden.", 404);
  return file;
}

// Rename, move to another folder, or share a personal file with the house.
export async function updateFile(actor: CarecoreActor, fileId: string, body: Record<string, unknown>) {
  const file = await editableFile(actor, fileId);
  const name = body.name === undefined ? String(file.name) : cleanName(body.name, 220);
  if (!name) throw new ApiError("Bitte gib einen gültigen Dateinamen an.");
  const share = body.share === true && file.purpose === "cloud";
  const shared = share || file.purpose === "shared";
  const folderId = shared
    ? body.folderId === undefined
      ? ((file.folder_id as string | null) ?? null)
      : await assertFolder(actor, body.folderId)
    : null;
  const rows = await carecoreDb()`
    UPDATE carecore_cloud_files SET name = ${name}, folder_id = ${folderId},
      purpose = ${shared ? "shared" : "cloud"}, updated_at = NOW()
    WHERE id = ${fileId}
    RETURNING id, name, mime_type, size_bytes, uploaded_by, folder_id, purpose, created_at, updated_at`;
  if (shared) await audit(actor, fileId, share ? "shared" : "updated", { name, folderId });
  return mapFile(rows[0], actor);
}

export async function deleteFile(actor: CarecoreActor, fileId: string) {
  const file = await editableFile(actor, fileId);
  await carecoreDb()`DELETE FROM carecore_cloud_files WHERE id = ${fileId}`;
  if (file.purpose === "shared") await audit(actor, fileId, "deleted", { name: file.name });
}

function assertManager(actor: CarecoreActor) {
  if (!managesSharedFiles(actor)) throw new ApiError("Ordner verwaltet die Team- oder Administrationsleitung.", 403);
}

export async function saveFolder(actor: CarecoreActor, folderId: string | null, body: Record<string, unknown>) {
  assertManager(actor);
  const name = cleanName(body.name, 120);
  if (!name) throw new ApiError("Bitte einen Ordnernamen angeben.");
  const sql = carecoreDb();
  try {
    if (folderId) {
      await assertFolder(actor, folderId);
      await sql`UPDATE carecore_shared_folders SET name = ${name} WHERE id = ${folderId}`;
      return folderId;
    }
    const id = randomUUID();
    await sql`INSERT INTO carecore_shared_folders (id, organization_id, name, created_by) VALUES (${id}, ${org(actor)}, ${name}, ${actor.id})`;
    return id;
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") throw new ApiError("Diesen Ordner gibt es bereits.", 409);
    throw error;
  }
}

// Deleting a folder keeps its files; they move to "Allgemein".
export async function deleteFolder(actor: CarecoreActor, folderId: string) {
  assertManager(actor);
  await assertFolder(actor, folderId);
  await carecoreDb()`DELETE FROM carecore_shared_folders WHERE id = ${folderId}`;
}
