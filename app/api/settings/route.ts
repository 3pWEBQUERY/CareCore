import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { readSettings, readTerminology, systemStatus } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await apiContext("administration.manage");
    if (ctx instanceof NextResponse) return ctx;
    const [settings, system, terminology] = await Promise.all([
      readSettings(ctx),
      systemStatus(ctx),
      readTerminology(ctx),
    ]);
    return NextResponse.json({ settings, system, terminology });
  } catch (error) {
    return apiErrorResponse(error, "Konfiguration konnte nicht geladen werden.");
  }
}
