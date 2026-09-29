import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { readHiddenVitals, readSettings, readTerminology, systemStatus } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await apiContext("administration.manage");
    if (ctx instanceof NextResponse) return ctx;
    const [settings, system, terminology, hiddenVitals] = await Promise.all([
      readSettings(ctx),
      systemStatus(ctx),
      readTerminology(ctx),
      readHiddenVitals(ctx),
    ]);
    return NextResponse.json({ settings, system, terminology, hiddenVitals });
  } catch (error) {
    return apiErrorResponse(error, "Konfiguration konnte nicht geladen werden.");
  }
}
