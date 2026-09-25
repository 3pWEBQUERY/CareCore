import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";
type Context = { params: Promise<{ fileId: string }> };

// Only types that cannot execute script are ever rendered inline; everything else is downloaded.
const inlinePreviewTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm",
  "application/pdf", "text/plain",
]);

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Bitte erneut anmelden." }, { status: 401 });
    const { fileId } = await params;
    const sql = carecoreDb();
    const rows = await sql`
      SELECT name, mime_type, content_base64
      FROM carecore_cloud_files
      WHERE id = ${fileId} AND organization_id = ${actor.organizationId}
      LIMIT 1
    ` as unknown as Array<{ name: string; mime_type: string; content_base64: string }>;
    if (!rows[0]) return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
    const safeName = rows[0].name.replace(/["\r\n]/g, "_");
    const mimeType = (rows[0].mime_type || "").split(";")[0].trim().toLowerCase();
    const preview = new URL(request.url).searchParams.get("preview") === "1" && inlinePreviewTypes.has(mimeType);
    return new Response(Buffer.from(rows[0].content_base64, "base64"), {
      headers: {
        "Content-Type": preview ? (mimeType === "text/plain" ? "text/plain; charset=utf-8" : mimeType) : "application/octet-stream",
        "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(rows[0].name)}`,
        // Chrome's PDF viewer refuses to render in a sandboxed document, so PDFs get a restrictive CSP without sandbox.
        "Content-Security-Policy": mimeType === "application/pdf" && preview ? "default-src 'none'; object-src 'self'" : "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
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
    const body = await request.json() as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim().replace(/[\\/\u0000-\u001f]/g, "-").slice(0, 220) : "";
    if (!name) return NextResponse.json({ error: "Bitte gib einen gültigen Dateinamen an." }, { status: 400 });
    const sql = carecoreDb();
    const rows = await sql`
      UPDATE carecore_cloud_files SET name = ${name}, updated_at = NOW()
      WHERE id = ${fileId} AND organization_id = ${actor.organizationId}
      RETURNING id, name, mime_type, size_bytes, uploaded_by, created_at, updated_at
    `;
    if (!rows[0]) return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
    return NextResponse.json({ file: rows[0] });
  } catch (error) {
    console.error("Cloud file rename failed", error);
    return NextResponse.json({ error: "Datei konnte nicht umbenannt werden." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Bitte erneut anmelden." }, { status: 401 });
    const { fileId } = await params;
    const sql = carecoreDb();
    const rows = await sql`DELETE FROM carecore_cloud_files WHERE id = ${fileId} AND organization_id = ${actor.organizationId} RETURNING id`;
    if (!rows[0]) return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Cloud file delete failed", error);
    return NextResponse.json({ error: "Datei konnte nicht gelöscht werden." }, { status: 500 });
  }
}
