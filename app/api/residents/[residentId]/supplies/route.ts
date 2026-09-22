import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";

type SupplyInput = { itemName?: unknown; category?: unknown; unit?: unknown; currentQuantity?: unknown; targetQuantity?: unknown; status?: unknown; notes?: unknown };

async function residentContext(residentId: string) {
  const actor = await carecoreActor();
  if (!actor?.organizationId) return null;
  const sql = carecoreDb();
  const resident = await sql`SELECT id FROM carecore_residents WHERE id = ${residentId} AND organization_id = ${actor.organizationId} LIMIT 1`;
  return resident[0] ? { actor, sql } : null;
}

function supplyValues(input: SupplyInput) {
  const text = (key: keyof SupplyInput, limit: number) => typeof input[key] === "string" ? input[key].trim().slice(0, limit) : "";
  const quantity = (key: "currentQuantity" | "targetQuantity") => typeof input[key] === "number" && Number.isInteger(input[key]) ? Math.max(0, Math.min(100000, input[key] as number)) : 0;
  const status = input.status === "blocked" || input.status === "archived" ? input.status : "active";
  return { itemName: text("itemName", 180), category: text("category", 80) || "Pflege & Hygiene", unit: text("unit", 40) || "Stück", currentQuantity: quantity("currentQuantity"), targetQuantity: quantity("targetQuantity"), status, notes: text("notes", 2000) };
}

export async function GET(_request: Request, context: { params: Promise<{ residentId: string }> }) {
  try {
    const { residentId } = await context.params;
    const active = await residentContext(residentId);
    if (!active) return NextResponse.json({ error: "Bewohnerakte nicht verfügbar." }, { status: 404 });
    const supplies = await active.sql`SELECT id, item_name, category, unit, current_quantity, target_quantity, status, notes, updated_at FROM carecore_resident_supplies WHERE resident_id = ${residentId} ORDER BY status = 'active' DESC, category, item_name`;
    return NextResponse.json({ supplies });
  } catch (error) { console.error("Supplies GET failed", error); return NextResponse.json({ error: "Pflegebedarf konnte nicht geladen werden." }, { status: 500 }); }
}

export async function POST(request: Request, context: { params: Promise<{ residentId: string }> }) {
  try {
    const { residentId } = await context.params;
    const active = await residentContext(residentId);
    if (!active) return NextResponse.json({ error: "Bewohnerakte nicht verfügbar." }, { status: 404 });
    const input = supplyValues(await request.json() as SupplyInput);
    if (!input.itemName) return NextResponse.json({ error: "Bitte gib eine Bezeichnung an." }, { status: 400 });
    const rows = await active.sql`INSERT INTO carecore_resident_supplies (id, resident_id, item_name, category, unit, current_quantity, target_quantity, status, notes, updated_by) VALUES (${randomUUID()}, ${residentId}, ${input.itemName}, ${input.category}, ${input.unit}, ${input.currentQuantity}, ${input.targetQuantity}, ${input.status}, ${input.notes || null}, ${active.actor.id}) RETURNING id, item_name, category, unit, current_quantity, target_quantity, status, notes, updated_at`;
    return NextResponse.json({ supply: rows[0] }, { status: 201 });
  } catch (error) { console.error("Supplies POST failed", error); return NextResponse.json({ error: "Pflegebedarf konnte nicht gespeichert werden." }, { status: 500 }); }
}
