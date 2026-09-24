import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";
type Context = { params: Promise<{ fileId: string }> };

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
    const preview = new URL(request.url).searchParams.get("preview") === "1";
    return new Response(Buffer.from(rows[0].content_base64, "base64"), {
      headers: {
        "Content-Type": rows[0].mime_type || "application/octet-stream",
        "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(rows[0].name)}`,
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
