import { randomUUID } from "node:crypto";
import { ApiError, type ApiContext } from "@/lib/api-context";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

// Stores an uploaded file in the organization's file store; `purpose` keeps it out of the personal cloud list.
export async function storeFile(
  ctx: ApiContext,
  file: FormDataEntryValue | null,
  purpose: "certificate" | "document",
  allowedTypes: readonly string[],
) {
  if (!(file instanceof File) || file.size === 0) throw new ApiError("Bitte eine Datei auswählen.");
  if (file.size > MAX_FILE_BYTES) throw new ApiError("Dateien dürfen höchstens 4 MB gross sein.", 413);
  const type = (file.type || "application/octet-stream").split(";")[0].trim().toLowerCase();
  if (!allowedTypes.includes(type)) throw new ApiError("Dieser Dateityp ist hier nicht erlaubt.", 415);
  const name = file.name
    .trim()
    .replace(/[\\/\u0000-\u001f]/g, "-")
    .slice(0, 220);
  if (!name) throw new ApiError("Der Dateiname ist ungültig.");
  const id = randomUUID();
  await ctx.sql`
    INSERT INTO carecore_cloud_files (id, organization_id, name, mime_type, size_bytes, content_base64, uploaded_by, purpose)
    VALUES (${id}, ${ctx.actor.organizationId}, ${name}, ${type}, ${file.size},
      ${Buffer.from(await file.arrayBuffer()).toString("base64")}, ${ctx.actor.id}, ${purpose})`;
  return { id, name, type, size: file.size };
}
