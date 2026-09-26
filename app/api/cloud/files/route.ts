import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function GET() {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Bitte erneut anmelden." }, { status: 401 });
    const sql = carecoreDb();
    const files = (await sql`
      SELECT id, name, mime_type, size_bytes, uploaded_by, created_at, updated_at
      FROM carecore_cloud_files
      WHERE organization_id = ${actor.organizationId} AND purpose = 'cloud'
      ORDER BY created_at DESC
    `) as unknown as Array<{
      id: string;
      name: string;
      mime_type: string;
      size_bytes: number;
      uploaded_by: string | null;
      created_at: string;
      updated_at: string;
    }>;
    return NextResponse.json({ files });
  } catch (error) {
    console.error("Cloud file list failed", error);
    return NextResponse.json({ error: "Dateien konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Bitte erneut anmelden." }, { status: 401 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0)
      return NextResponse.json({ error: "Bitte wähle eine Datei aus." }, { status: 400 });
    if (file.size > MAX_FILE_BYTES)
      return NextResponse.json({ error: "Dateien dürfen höchstens 4 MB gross sein." }, { status: 413 });
    const name = file.name
      .trim()
      .replace(/[\\/\u0000-\u001f]/g, "-")
      .slice(0, 220);
    if (!name) return NextResponse.json({ error: "Der Dateiname ist ungültig." }, { status: 400 });
    const content = Buffer.from(await file.arrayBuffer()).toString("base64");
    const sql = carecoreDb();
    const rows = await sql`
      INSERT INTO carecore_cloud_files (id, organization_id, name, mime_type, size_bytes, content_base64, uploaded_by)
      VALUES (${randomUUID()}, ${actor.organizationId}, ${name}, ${file.type || "application/octet-stream"}, ${file.size}, ${content}, ${actor.id})
      RETURNING id, name, mime_type, size_bytes, uploaded_by, created_at, updated_at
    `;
    return NextResponse.json({ file: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Cloud file upload failed", error);
    return NextResponse.json({ error: "Datei konnte nicht gespeichert werden." }, { status: 500 });
  }
}
