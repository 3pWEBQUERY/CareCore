import { NextResponse } from "next/server";
import {
  listOrders,
  listResidentMovements,
  medicationContext,
  medicationErrorResponse,
  updateMedicationAllergies,
} from "@/lib/medication";

export const runtime = "nodejs";
type Context = { params: Promise<{ residentId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const ctx = await medicationContext("residents.read");
    if (ctx instanceof NextResponse) return ctx;
    const { residentId } = await params;
    const [orders, movements] = await Promise.all([
      listOrders(ctx, residentId),
      listResidentMovements(ctx, residentId),
    ]);
    return NextResponse.json({ orders, movements });
  } catch (error) {
    return medicationErrorResponse(error, "Medikation konnte nicht geladen werden.");
  }
}

// Updates the documented medication allergies of the resident.
export async function PATCH(request: Request, { params }: Context) {
  try {
    const ctx = await medicationContext("residents.write");
    if (ctx instanceof NextResponse) return ctx;
    const { residentId } = await params;
    const body = (await request.json()) as { allergies?: unknown };
    return NextResponse.json({ allergies: await updateMedicationAllergies(ctx, residentId, body.allergies) });
  } catch (error) {
    return medicationErrorResponse(error, "Allergien konnten nicht gespeichert werden.");
  }
}
