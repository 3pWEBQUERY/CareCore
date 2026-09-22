import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { carecoreActor, carecoreDb } from "@/lib/server-data";

export const runtime = "nodejs";
type ProductInput = { itemName?: unknown; category?: unknown; unit?: unknown; description?: unknown; defaultTargetQuantity?: unknown; currentStockQuantity?: unknown; status?: unknown };
const isAdmin = (role: string) => role === "admin";
const cleanText = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const quantity = (value: unknown) => typeof value === "number" && Number.isInteger(value) ? Math.max(0, Math.min(100000, value)) : 0;

export async function GET() {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Keine Anmeldung." }, { status: 401 });
    const sql = carecoreDb();
    const products = actor.role === "admin"
      ? await sql`SELECT id, item_name, category, unit, description, default_target_quantity, current_stock_quantity, status, created_at, updated_at FROM carecore_care_supply_products WHERE organization_id = ${actor.organizationId} ORDER BY status = 'active' DESC, category, item_name`
      : await sql`SELECT id, item_name, category, unit, description, default_target_quantity, current_stock_quantity, status, created_at, updated_at FROM carecore_care_supply_products WHERE organization_id = ${actor.organizationId} AND status = 'active' ORDER BY category, item_name`;
    return NextResponse.json({ products });
  } catch (error) { console.error("Care supply product GET failed", error); return NextResponse.json({ error: "Pflegeprodukte konnten nicht geladen werden." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor || !isAdmin(actor.role) || !actor.organizationId) return NextResponse.json({ error: "Nur Administratoren können den Produktkatalog verwalten." }, { status: 403 });
    const input = await request.json() as ProductInput;
    const itemName = cleanText(input.itemName, 180);
    const category = cleanText(input.category, 80) || "Pflege & Hygiene";
    const unit = cleanText(input.unit, 40) || "Stück";
    const description = cleanText(input.description, 1200);
    const target = quantity(input.defaultTargetQuantity);
    const currentStock = quantity(input.currentStockQuantity);
    if (!itemName) return NextResponse.json({ error: "Bitte gib einen Produktnamen an." }, { status: 400 });
    const sql = carecoreDb();
    const rows = await sql`INSERT INTO carecore_care_supply_products (id, organization_id, item_name, category, unit, description, default_target_quantity, current_stock_quantity, created_by, updated_by) VALUES (${randomUUID()}, ${actor.organizationId}, ${itemName}, ${category}, ${unit}, ${description || null}, ${target}, ${currentStock}, ${actor.id}, ${actor.id}) RETURNING id, item_name, category, unit, description, default_target_quantity, current_stock_quantity, status, created_at, updated_at`;
    return NextResponse.json({ product: rows[0] }, { status: 201 });
  } catch (error) {
    if (String(error).toLowerCase().includes("duplicate")) return NextResponse.json({ error: "Ein Pflegeprodukt mit diesem Namen ist bereits vorhanden." }, { status: 409 });
    console.error("Care supply product POST failed", error);
    return NextResponse.json({ error: "Pflegeprodukt konnte nicht gespeichert werden." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor || !isAdmin(actor.role) || !actor.organizationId) return NextResponse.json({ error: "Nur Administratoren können den Produktkatalog verwalten." }, { status: 403 });
    const input = await request.json() as ProductInput & { id?: unknown };
    const id = typeof input.id === "string" ? input.id : "";
    const itemName = cleanText(input.itemName, 180);
    const category = cleanText(input.category, 80) || "Pflege & Hygiene";
    const unit = cleanText(input.unit, 40) || "Stück";
    const description = cleanText(input.description, 1200);
    const currentStock = quantity(input.currentStockQuantity);
    const status = input.status === "blocked" || input.status === "archived" ? input.status : "active";
    if (!id || !itemName) return NextResponse.json({ error: "Produkt und Bezeichnung sind erforderlich." }, { status: 400 });
    const sql = carecoreDb();
    const rows = await sql`UPDATE carecore_care_supply_products SET item_name = ${itemName}, category = ${category}, unit = ${unit}, description = ${description || null}, default_target_quantity = ${quantity(input.defaultTargetQuantity)}, current_stock_quantity = ${currentStock}, status = ${status}, updated_by = ${actor.id}, updated_at = NOW() WHERE id = ${id} AND organization_id = ${actor.organizationId} RETURNING id, item_name, category, unit, description, default_target_quantity, current_stock_quantity, status, created_at, updated_at`;
    if (!rows[0]) return NextResponse.json({ error: "Pflegeprodukt nicht gefunden." }, { status: 404 });
    return NextResponse.json({ product: rows[0] });
  } catch (error) {
    if (String(error).toLowerCase().includes("duplicate")) return NextResponse.json({ error: "Ein Pflegeprodukt mit diesem Namen ist bereits vorhanden." }, { status: 409 });
    console.error("Care supply product PATCH failed", error);
    return NextResponse.json({ error: "Pflegeprodukt konnte nicht aktualisiert werden." }, { status: 500 });
  }
}
