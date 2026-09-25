import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/server-data";
import {
  listCareUnits,
  listMedicationResidents,
  listStock,
  medicationContext,
  medicationErrorResponse,
  receiveStock,
} from "@/lib/medication";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await medicationContext("residents.read");
    if (ctx instanceof NextResponse) return ctx;
    const [stock, careUnits, residents] = await Promise.all([
      listStock(ctx),
      listCareUnits(ctx),
      listMedicationResidents(ctx),
    ]);
    return NextResponse.json({
      ...stock,
      careUnits,
      residents: residents.map(({ id, name }) => ({ id, name })),
      canManage: hasPermission(ctx.actor, "medication.manage"),
    });
  } catch (error) {
    return medicationErrorResponse(error, "Bestände konnten nicht geladen werden.");
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await medicationContext("medication.manage");
    if (ctx instanceof NextResponse) return ctx;
    const id = await receiveStock(ctx, (await request.json()) as Record<string, unknown>);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return medicationErrorResponse(error, "Wareneingang konnte nicht gebucht werden.");
  }
}
