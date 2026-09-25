import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb, forbidden, hasPermission, type Permission } from "@/lib/server-data";

export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
async function access(residentId: string, permission: Permission) {
  const actor = await carecoreActor();
  if (!actor?.organizationId || !/^[0-9a-f-]{36}$/i.test(residentId)) return null;
  if (!hasPermission(actor, permission)) return "forbidden" as const;
  const sql = carecoreDb();
  const rows =
    await sql`SELECT id FROM carecore_residents WHERE id = ${residentId} AND organization_id = ${actor.organizationId} LIMIT 1`;
  return rows[0] ? sql : null;
}

function hasValidImageSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg")
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png")
    return (
      bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  if (mimeType === "image/webp")
    return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
}

export async function GET(request: Request, context: { params: Promise<{ residentId: string }> }) {
  try {
    const { residentId } = await context.params;
    const sql = await access(residentId, "residents.read");
    if (!sql) return NextResponse.json({ error: "Bewohnerakte nicht verfügbar." }, { status: 404 });
    if (sql === "forbidden") return forbidden();
    const rows =
      await sql`SELECT photo_base64, photo_mime_type, photo_updated_at FROM carecore_residents WHERE id = ${residentId} LIMIT 1`;
    const resident = rows[0];
    if (new URL(request.url).searchParams.get("format") === "raw") {
      if (!resident?.photo_base64 || !allowedTypes.has(String(resident.photo_mime_type))) {
        return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
      }
      const image = Buffer.from(String(resident.photo_base64), "base64");
      return new NextResponse(new Uint8Array(image), {
        headers: {
          "Content-Type": String(resident.photo_mime_type),
          "Content-Length": String(image.byteLength),
          "Cache-Control": "private, max-age=60",
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": "inline",
        },
      });
    }
    const photoDataUrl =
      resident?.photo_base64 && allowedTypes.has(String(resident.photo_mime_type))
        ? `data:${resident.photo_mime_type};base64,${resident.photo_base64}`
        : null;
    return NextResponse.json(
      { photoDataUrl, updatedAt: resident?.photo_updated_at ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Resident photo GET failed", error);
    return NextResponse.json({ error: "Bewohnerbild konnte nicht geladen werden." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ residentId: string }> }) {
  try {
    const { residentId } = await context.params;
    const sql = await access(residentId, "residents.write");
    if (!sql) return NextResponse.json({ error: "Bewohnerakte nicht verfügbar." }, { status: 404 });
    if (sql === "forbidden") return forbidden();
    const input = (await request.json()) as { photoDataUrl?: unknown };
    if (typeof input.photoDataUrl !== "string")
      return NextResponse.json({ error: "Bitte ein Bild auswählen." }, { status: 400 });
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.photoDataUrl);
    if (!match || !allowedTypes.has(match[1]))
      return NextResponse.json({ error: "Erlaubt sind JPEG-, PNG- und WebP-Bilder." }, { status: 400 });
    const image = Buffer.from(match[2], "base64");
    if (!image.length || image.length > MAX_PHOTO_BYTES)
      return NextResponse.json({ error: "Das optimierte Bild darf höchstens 1 MB gross sein." }, { status: 413 });
    if (!hasValidImageSignature(image, match[1]))
      return NextResponse.json({ error: "Die Bilddatei ist ungültig." }, { status: 400 });
    const base64 = image.toString("base64");
    const rows =
      await sql`UPDATE carecore_residents SET photo_base64 = ${base64}, photo_mime_type = ${match[1]}, photo_updated_at = NOW(), updated_at = NOW() WHERE id = ${residentId} RETURNING photo_updated_at`;
    if (!rows[0]) return NextResponse.json({ error: "Bewohnerakte nicht gefunden." }, { status: 404 });
    return NextResponse.json({
      photoDataUrl: `data:${match[1]};base64,${base64}`,
      updatedAt: rows[0].photo_updated_at,
    });
  } catch (error) {
    console.error("Resident photo PUT failed", error);
    return NextResponse.json({ error: "Bewohnerbild konnte nicht gespeichert werden." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ residentId: string }> }) {
  try {
    const { residentId } = await context.params;
    const sql = await access(residentId, "residents.write");
    if (!sql) return NextResponse.json({ error: "Bewohnerakte nicht verfügbar." }, { status: 404 });
    if (sql === "forbidden") return forbidden();
    await sql`UPDATE carecore_residents SET photo_base64 = NULL, photo_mime_type = NULL, photo_updated_at = NULL, updated_at = NOW() WHERE id = ${residentId}`;
    return NextResponse.json({ photoDataUrl: null });
  } catch (error) {
    console.error("Resident photo DELETE failed", error);
    return NextResponse.json({ error: "Bewohnerbild konnte nicht entfernt werden." }, { status: 500 });
  }
}
