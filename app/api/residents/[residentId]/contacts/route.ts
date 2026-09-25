import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb, forbidden, hasPermission } from "@/lib/server-data";

export const runtime = "nodejs";

type ContactInput = { fullName?: unknown; relationship?: unknown; phone?: unknown; email?: unknown; isPrimary?: unknown; isEmergencyContact?: unknown };

async function residentContext(residentId: string) {
  const actor = await carecoreActor();
  if (!actor?.organizationId) return null;
  const sql = carecoreDb();
  const resident = await sql`SELECT id FROM carecore_residents WHERE id = ${residentId} AND organization_id = ${actor.organizationId} LIMIT 1`;
  return resident[0] ? { actor, sql } : null;
}

function contactValues(input: ContactInput) {
  const value = (key: keyof ContactInput, limit: number) => typeof input[key] === "string" ? input[key].trim().slice(0, limit) : "";
  return { fullName: value("fullName", 160), relationship: value("relationship", 100), phone: value("phone", 60), email: value("email", 160), isPrimary: input.isPrimary === true, isEmergencyContact: input.isEmergencyContact === true };
}

export async function GET(_request: Request, context: { params: Promise<{ residentId: string }> }) {
  try {
    const { residentId } = await context.params;
    const active = await residentContext(residentId);
    if (!active) return NextResponse.json({ error: "Bewohnerakte nicht verfügbar." }, { status: 404 });
    if (!hasPermission(active.actor, "residents.read")) return forbidden();
    const contacts = await active.sql`SELECT id, full_name, relationship, phone, email, is_primary, is_emergency_contact, updated_at FROM carecore_resident_contacts WHERE resident_id = ${residentId} ORDER BY is_primary DESC, is_emergency_contact DESC, full_name ASC`;
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("Contacts GET failed", error);
    return NextResponse.json({ error: "Kontaktpersonen konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ residentId: string }> }) {
  try {
    const { residentId } = await context.params;
    const active = await residentContext(residentId);
    if (!active) return NextResponse.json({ error: "Bewohnerakte nicht verfügbar." }, { status: 404 });
    if (!hasPermission(active.actor, "residents.write")) return forbidden();
    const input = contactValues(await request.json() as ContactInput);
    if (!input.fullName) return NextResponse.json({ error: "Bitte gib einen Namen an." }, { status: 400 });
    if (input.isPrimary) await active.sql`UPDATE carecore_resident_contacts SET is_primary = FALSE, updated_at = NOW() WHERE resident_id = ${residentId}`;
    const rows = await active.sql`INSERT INTO carecore_resident_contacts (id, resident_id, full_name, relationship, phone, email, is_primary, is_emergency_contact) VALUES (${randomUUID()}, ${residentId}, ${input.fullName}, ${input.relationship || null}, ${input.phone || null}, ${input.email || null}, ${input.isPrimary}, ${input.isEmergencyContact}) RETURNING id, full_name, relationship, phone, email, is_primary, is_emergency_contact, updated_at`;
    return NextResponse.json({ contact: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Contacts POST failed", error);
    return NextResponse.json({ error: "Kontaktperson konnte nicht gespeichert werden." }, { status: 500 });
  }
}
