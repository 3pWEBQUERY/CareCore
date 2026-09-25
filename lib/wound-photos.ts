import { randomUUID } from "node:crypto";
import { ApiError, assertUuid, iso, num, text, writeAudit, type ApiContext, type Row } from "@/lib/api-context";

// Wound photos are stored as bytea in carecore_wound_photos and only served through
// the authenticated API. Swapping to an object store only requires changing this file.

const MAX_BYTES = 3 * 1024 * 1024;

export type WoundPhoto = {
  id: string;
  woundId: string;
  caption: string | null;
  takenAt: string;
  uploadedBy: string | null;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

function detectImageType(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  return null;
}

async function assertWound(ctx: ApiContext, woundIdInput: unknown) {
  const woundId = assertUuid(woundIdInput, "Wunde");
  const rows = (await ctx.sql`
    SELECT w.id, w.status FROM carecore_wounds w
    JOIN carecore_residents r ON r.id = w.resident_id AND r.organization_id = ${ctx.actor.organizationId}
    WHERE w.id = ${woundId}`) as Row[];
  if (!rows[0]) throw new ApiError("Wunde nicht gefunden.", 404);
  return { id: woundId, status: String(rows[0].status) };
}

export async function listPhotos(ctx: ApiContext, woundIdInput: unknown): Promise<WoundPhoto[]> {
  const wound = await assertWound(ctx, woundIdInput);
  const rows = (await ctx.sql`
    SELECT p.id, p.wound_id, p.caption, p.taken_at, p.size_bytes, p.width, p.height, u.display_name AS uploaded_by
    FROM carecore_wound_photos p LEFT JOIN carecore_users u ON u.id = p.uploaded_by
    WHERE p.wound_id = ${wound.id} AND p.deleted_at IS NULL
    ORDER BY p.taken_at DESC`) as Row[];
  return rows.map((row) => ({
    id: String(row.id),
    woundId: String(row.wound_id),
    caption: (row.caption as string | null) ?? null,
    takenAt: iso(row.taken_at) ?? "",
    uploadedBy: (row.uploaded_by as string | null) ?? null,
    sizeBytes: Number(row.size_bytes),
    width: num(row.width),
    height: num(row.height),
  }));
}

export async function storePhoto(ctx: ApiContext, woundIdInput: unknown, form: FormData) {
  const wound = await assertWound(ctx, woundIdInput);
  if (wound.status === "closed") throw new ApiError("Die Wunde ist abgeschlossen. Bitte zuerst wieder eröffnen.", 409);
  if (form.get("consent") !== "true")
    throw new ApiError("Bitte bestätigen, dass die Einwilligung zur Fotodokumentation vorliegt.");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new ApiError("Bitte ein Foto auswählen.");
  if (file.size > MAX_BYTES) throw new ApiError("Das Foto ist zu gross (höchstens 3 MB).", 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = detectImageType(bytes);
  if (!mimeType) throw new ApiError("Nur JPEG-, PNG- oder WebP-Fotos sind erlaubt.");
  const takenAtInput = form.get("takenAt");
  const takenAt =
    typeof takenAtInput === "string" && !Number.isNaN(Date.parse(takenAtInput)) ? new Date(takenAtInput) : new Date();
  if (takenAt.getTime() > Date.now() + 5 * 60_000) throw new ApiError("Der Aufnahmezeitpunkt liegt in der Zukunft.");
  const dimension = (key: string) => {
    const value = Number(form.get(key));
    return Number.isInteger(value) && value > 0 && value < 20000 ? value : null;
  };
  const id = randomUUID();
  await ctx.sql`
    INSERT INTO carecore_wound_photos (id, organization_id, wound_id, mime_type, size_bytes, width, height, content, caption, taken_at, consent_confirmed, uploaded_by)
    VALUES (${id}, ${ctx.actor.organizationId}, ${wound.id}, ${mimeType}, ${bytes.length}, ${dimension("width")}, ${dimension("height")},
      ${bytes}, ${text(form.get("caption"), 240) || null}, ${takenAt.toISOString()}, TRUE, ${ctx.actor.id})`;
  await writeAudit(ctx, "wound_photo", id, "uploaded", null, { woundId: wound.id, sizeBytes: bytes.length, mimeType });
  return id;
}

export async function readPhoto(ctx: ApiContext, photoIdInput: unknown) {
  const id = assertUuid(photoIdInput, "Foto");
  const rows = (await ctx.sql`
    SELECT mime_type, content FROM carecore_wound_photos
    WHERE id = ${id} AND organization_id = ${ctx.actor.organizationId} AND deleted_at IS NULL`) as Row[];
  if (!rows[0]) throw new ApiError("Foto nicht gefunden.", 404);
  return { mimeType: String(rows[0].mime_type), content: Buffer.from(rows[0].content as Uint8Array) };
}

export async function hidePhoto(ctx: ApiContext, photoIdInput: unknown, reasonInput: unknown) {
  const id = assertUuid(photoIdInput, "Foto");
  const reason = text(reasonInput, 1000);
  if (!reason) throw new ApiError("Bitte einen Grund angeben, z. B. „falscher Bewohner“ oder „unscharf“.");
  const rows = (await ctx.sql`
    UPDATE carecore_wound_photos SET deleted_at = NOW(), deleted_by = ${ctx.actor.id}, delete_reason = ${reason}
    WHERE id = ${id} AND organization_id = ${ctx.actor.organizationId} AND deleted_at IS NULL
    RETURNING wound_id`) as Row[];
  if (!rows[0]) throw new ApiError("Foto nicht gefunden.", 404);
  await writeAudit(ctx, "wound_photo", id, "hidden", null, { woundId: rows[0].wound_id, reason });
}
