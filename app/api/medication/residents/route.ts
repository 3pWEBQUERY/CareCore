import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/server-data";
import { listCareUnits, listMedicationResidents, medicationContext, medicationErrorResponse } from "@/lib/medication";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await medicationContext("residents.read");
    if (ctx instanceof NextResponse) return ctx;
    const [residents, careUnits] = await Promise.all([listMedicationResidents(ctx), listCareUnits(ctx)]);
    return NextResponse.json({
      residents,
      careUnits,
      canManage: hasPermission(ctx.actor, "medication.manage"),
      canEditAllergies: hasPermission(ctx.actor, "residents.write"),
    });
  } catch (error) {
    return medicationErrorResponse(error, "Bewohner konnten nicht geladen werden.");
  }
}
