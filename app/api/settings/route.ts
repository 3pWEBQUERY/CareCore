import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { logoUpdatedAt } from "@/lib/branding";
import { readHiddenVitals, readSettings, readTerminology, systemStatus } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await apiContext("administration.manage");
    if (ctx instanceof NextResponse) return ctx;
    const [settings, system, terminology, hiddenVitals, logo] = await Promise.all([
      readSettings(ctx),
      systemStatus(ctx),
      readTerminology(ctx),
      readHiddenVitals(ctx),
      logoUpdatedAt(ctx),
    ]);
    return NextResponse.json({ settings, system, terminology, hiddenVitals, logoUpdatedAt: logo });
  } catch (error) {
    return apiErrorResponse(error, "Konfiguration konnte nicht geladen werden.");
  }
}
