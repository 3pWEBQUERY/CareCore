import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/server-data";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { listCareUnits } from "@/lib/medication";
import { listMedicationResidents } from "@/lib/medication-orders";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await apiContext("residents.read");
    if (ctx instanceof NextResponse) return ctx;
    const [residents, careUnits] = await Promise.all([listMedicationResidents(ctx), listCareUnits(ctx)]);
    return NextResponse.json({
      residents,
      careUnits,
      canManage: hasPermission(ctx.actor, "medication.manage"),
      canEditAllergies: hasPermission(ctx.actor, "residents.write"),
    });
  } catch (error) {
    return apiErrorResponse(error, "Bewohner konnten nicht geladen werden.");
  }
}
