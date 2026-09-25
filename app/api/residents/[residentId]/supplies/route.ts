import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb, forbidden, hasPermission } from "@/lib/server-data";

export const runtime = "nodejs";

type SupplyInput = { itemName?: unknown; productId?: unknown; quantity?: unknown; category?: unknown; unit?: unknown; currentQuantity?: unknown; targetQuantity?: unknown; status?: unknown; notes?: unknown };

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
    if (!hasPermission(active.actor, "residents.read")) return forbidden();
    const [supplies, products] = await Promise.all([
      active.sql`SELECT id, product_id, item_name, category, unit, current_quantity, target_quantity, status, notes, updated_at FROM carecore_resident_supplies WHERE resident_id = ${residentId} ORDER BY status = 'active' DESC, category, item_name`,
      active.sql`SELECT id, item_name, category, unit, default_target_quantity FROM carecore_care_supply_products WHERE organization_id = ${active.actor.organizationId} AND status = 'active' ORDER BY category, item_name`,
    ]);
    return NextResponse.json({ supplies, products });
  } catch (error) { console.error("Supplies GET failed", error); return NextResponse.json({ error: "Pflegebedarf konnte nicht geladen werden." }, { status: 500 }); }
}

export async function POST(request: Request, context: { params: Promise<{ residentId: string }> }) {
  try {
    const { residentId } = await context.params;
    const active = await residentContext(residentId);
    if (!active) return NextResponse.json({ error: "Bewohnerakte nicht verfügbar." }, { status: 404 });
    if (!hasPermission(active.actor, "residents.write")) return forbidden();
    const body = await request.json() as SupplyInput;
    if (typeof body.productId === "string" && body.productId) {
      const quantity = typeof body.quantity === "number" && Number.isInteger(body.quantity) ? Math.max(1, Math.min(100000, body.quantity)) : 0;
      const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "";
      if (!quantity) return NextResponse.json({ error: "Bitte gib eine Stückzahl oder Menge grösser als null an." }, { status: 400 });
      const sql = active.sql;
      const supplyId = randomUUID();
      const transactionId = randomUUID();
      const rows = await sql`
        WITH product AS (
          SELECT id, item_name, category, unit, default_target_quantity
          FROM carecore_care_supply_products
          WHERE id = ${body.productId} AND organization_id = ${active.actor.organizationId} AND status = 'active'
        ), resident_scope AS (
          SELECT id FROM carecore_residents WHERE id = ${residentId} AND organization_id = ${active.actor.organizationId}
        ), upserted AS (
          INSERT INTO carecore_resident_supplies (id, resident_id, product_id, item_name, category, unit, current_quantity, target_quantity, status, notes, updated_by)
          SELECT ${supplyId}, ${residentId}, product.id, product.item_name, product.category, product.unit, ${quantity}, product.default_target_quantity, 'active', NULLIF(${notes}, ''), ${active.actor.id}
          FROM product CROSS JOIN resident_scope
          ON CONFLICT (resident_id, product_id) WHERE product_id IS NOT NULL
          DO UPDATE SET current_quantity = carecore_resident_supplies.current_quantity + EXCLUDED.current_quantity,
            target_quantity = GREATEST(carecore_resident_supplies.target_quantity, EXCLUDED.target_quantity),
            status = 'active', notes = COALESCE(NULLIF(EXCLUDED.notes, ''), carecore_resident_supplies.notes),
            updated_by = EXCLUDED.updated_by, updated_at = NOW()
          RETURNING id, product_id, resident_id, item_name, category, unit, current_quantity, target_quantity, status, notes, updated_at
        ), recorded AS (
          INSERT INTO carecore_resident_supply_transactions (id, resident_id, product_id, resident_supply_id, quantity, action, notes, created_by)
          SELECT ${transactionId}, ${residentId}, product.id, upserted.id, ${quantity}, 'issued', NULLIF(${notes}, ''), ${active.actor.id}
          FROM upserted JOIN product ON product.id = upserted.product_id
          RETURNING id
        )
        SELECT upserted.* FROM upserted CROSS JOIN recorded`;
      if (!rows[0]) return NextResponse.json({ error: "Das Pflegeprodukt ist nicht mehr verfügbar." }, { status: 404 });
      return NextResponse.json({ supply: rows[0], transactionId }, { status: 201 });
    }
    const input = supplyValues(body);
    if (!input.itemName) return NextResponse.json({ error: "Bitte gib eine Bezeichnung an." }, { status: 400 });
    const rows = await active.sql`INSERT INTO carecore_resident_supplies (id, resident_id, item_name, category, unit, current_quantity, target_quantity, status, notes, updated_by) VALUES (${randomUUID()}, ${residentId}, ${input.itemName}, ${input.category}, ${input.unit}, ${input.currentQuantity}, ${input.targetQuantity}, ${input.status}, ${input.notes || null}, ${active.actor.id}) RETURNING id, item_name, category, unit, current_quantity, target_quantity, status, notes, updated_at`;
    return NextResponse.json({ supply: rows[0] }, { status: 201 });
  } catch (error) { console.error("Supplies POST failed", error); return NextResponse.json({ error: "Pflegebedarf konnte nicht gespeichert werden." }, { status: 500 }); }
}
