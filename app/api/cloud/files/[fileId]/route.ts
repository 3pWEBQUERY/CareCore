import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-context";
import { readableFile } from "@/lib/file-access";
import { carecoreActor } from "@/lib/server-data";
import { deleteFile, updateFile } from "@/lib/shared-files";

export const runtime = "nodejs";
type Context = { params: Promise<{ fileId: string }> };

// Only types that cannot execute script are ever rendered inline; everything else is downloaded.
const inlinePreviewTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "application/pdf",
  "text/plain",
]);

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Bitte erneut anmelden." }, { status: 401 });
    const { fileId } = await params;
    // Not found and not allowed look the same, so file ids cannot be probed.
    const file = await readableFile(actor, fileId);
    if (!file) return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
    const rows = [file];
    const safeName = rows[0].name.replace(/["\r\n]/g, "_");
    const mimeType = (rows[0].mime_type || "").split(";")[0].trim().toLowerCase();
    const preview = new URL(request.url).searchParams.get("preview") === "1" && inlinePreviewTypes.has(mimeType);
    return new Response(new Uint8Array(rows[0].content), {
      headers: {
        "Content-Type": preview
          ? mimeType === "text/plain"
            ? "text/plain; charset=utf-8"
            : mimeType
          : "application/octet-stream",
        "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(rows[0].name)}`,
        // Chrome's PDF viewer refuses to render in a sandboxed document, so PDFs get a restrictive CSP without sandbox.
        "Content-Security-Policy":
          mimeType === "application/pdf" && preview
            ? "default-src 'none'; object-src 'self'"
            : "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Cloud file download failed", error);
    return NextResponse.json({ error: "Datei konnte nicht geladen werden." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Bitte erneut anmelden." }, { status: 401 });
    const { fileId } = await params;
    const file = await updateFile(actor, fileId, (await request.json()) as Record<string, unknown>);
    return NextResponse.json({ file });
  } catch (error) {
    return apiErrorResponse(error, "Datei konnte nicht geändert werden.");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Bitte erneut anmelden." }, { status: 401 });
    const { fileId } = await params;
    await deleteFile(actor, fileId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Datei konnte nicht gelöscht werden.");
  }
}
