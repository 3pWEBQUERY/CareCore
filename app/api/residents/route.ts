import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await carecoreActor();
    if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    if (!actor.organizationId) return NextResponse.json({ residents: [], units: [] });
    const sql = carecoreDb();
    const [rows, units] = await Promise.all([
      sql`SELECT r.id, r.first_name, r.last_name, r.status, r.admitted_on, r.notes,
          COALESCE(su.name, '') AS care_unit, COALESCE(ro.name, '') AS room,
          COALESCE(cp.care_level, '') AS care_level,
          COALESCE(flag.severity, 'stable') AS severity,
          COALESCE(flag.label, r.notes, 'Keine aktuellen Hinweise') AS note,
          COALESCE(flag.created_at, r.updated_at) AS last_update
        FROM carecore_residents r
        LEFT JOIN LATERAL (SELECT care_unit_id, room_id FROM carecore_resident_stays WHERE resident_id = r.id AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1) stay ON TRUE
        LEFT JOIN carecore_care_units su ON su.id = stay.care_unit_id
        LEFT JOIN carecore_rooms ro ON ro.id = stay.room_id
        LEFT JOIN LATERAL (SELECT care_level FROM carecore_care_plans WHERE resident_id = r.id AND status = 'active' ORDER BY updated_at DESC LIMIT 1) cp ON TRUE
        LEFT JOIN LATERAL (SELECT label, severity, created_at FROM carecore_resident_clinical_flags WHERE resident_id = r.id AND active = TRUE ORDER BY created_at DESC LIMIT 1) flag ON TRUE
        WHERE r.organization_id = ${actor.organizationId}
        ORDER BY r.last_name, r.first_name`,
      sql`SELECT cu.id, cu.name FROM carecore_care_units cu JOIN carecore_sites s ON s.id = cu.site_id WHERE s.organization_id = ${actor.organizationId} AND cu.active = TRUE ORDER BY cu.name`,
    ]);
    return NextResponse.json({ residents: rows, units });
  } catch (error) {
    console.error("Residents GET failed", error);
    return NextResponse.json({ error: "Bewohner konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    if (!actor.organizationId) return NextResponse.json({ error: "Keine Organisation zugeordnet." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const value = (key: string, limit: number) => typeof body[key] === "string" ? (body[key] as string).trim().slice(0, limit) : "";
    const firstName = value("firstName", 100);
    const lastName = value("lastName", 100);
    const unitName = value("unit", 160);
    const roomName = value("room", 80);
    const birthDate = value("birthDate", 10);
    const admissionDate = value("admissionDate", 10);
    const careLevel = value("careLevel", 80);
    const note = value("note", 2000);
    const gender = ({ Weiblich: "female", Männlich: "male", Divers: "diverse", "Keine Angabe": "unspecified" } as Record<string, string>)[value("gender", 40)] ?? "unspecified";
    const ownerName = value("owner", 120);
    const status = ({ Aktiv: "active", "Eintritt geplant": "planned", "Vorläufig": "planned" } as Record<string, string>)[value("status", 40)] ?? "active";
    if (!firstName || !lastName || !unitName || !roomName || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{4}-\d{2}-\d{2}$/.test(admissionDate)) return NextResponse.json({ error: "Bitte alle Pflichtfelder vollständig ausfüllen." }, { status: 400 });
    const sql = carecoreDb();
    const units = await sql`SELECT cu.id FROM carecore_care_units cu JOIN carecore_sites s ON s.id = cu.site_id WHERE s.organization_id = ${actor.organizationId} AND cu.name = ${unitName} AND cu.active = TRUE LIMIT 1`;
    if (!units[0]) return NextResponse.json({ error: "Wohnbereich nicht gefunden." }, { status: 400 });
    const unitId = units[0].id as string;
    const owners = ownerName ? await sql`SELECT u.id FROM carecore_users u JOIN carecore_user_profiles p ON p.user_id = u.id WHERE p.organization_id = ${actor.organizationId} AND u.display_name = ${ownerName} AND u.active = TRUE LIMIT 1` : [];
    const ownerId = (owners[0]?.id as string | undefined) ?? actor.id;
    const rooms = await sql`INSERT INTO carecore_rooms (id, care_unit_id, name, room_number) VALUES (${randomUUID()}, ${unitId}, ${roomName}, ${roomName.replace(/\D/g, "") || null}) ON CONFLICT (care_unit_id, name) DO UPDATE SET active = TRUE RETURNING id`;
    const residentId = randomUUID();
    await sql`INSERT INTO carecore_residents (id, organization_id, first_name, last_name, date_of_birth, gender, status, admitted_on, notes, primary_care_user_id) VALUES (${residentId}, ${actor.organizationId}, ${firstName}, ${lastName}, ${birthDate}, ${gender}, ${status}, ${admissionDate}, ${note || null}, ${ownerId})`;
    await sql`INSERT INTO carecore_resident_stays (id, resident_id, care_unit_id, room_id, started_at, created_by) VALUES (${randomUUID()}, ${residentId}, ${unitId}, ${rooms[0].id}, ${new Date(`${admissionDate}T12:00:00Z`).toISOString()}, ${actor.id})`;
    if (careLevel) await sql`INSERT INTO carecore_care_plans (id, resident_id, owner_user_id, care_level, focus) VALUES (${randomUUID()}, ${residentId}, ${ownerId}, ${careLevel}, ${note || "Aufnahme und Pflegebedarf prüfen."})`;
    return NextResponse.json({ id: residentId }, { status: 201 });
  } catch (error) {
    console.error("Residents POST failed", error);
    return NextResponse.json({ error: "Bewohner konnte nicht aufgenommen werden." }, { status: 500 });
  }
}
