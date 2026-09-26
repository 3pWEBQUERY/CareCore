import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { readSettings, systemStatus } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await apiContext("administration.manage");
    if (ctx instanceof NextResponse) return ctx;
    const [settings, system] = await Promise.all([readSettings(ctx), systemStatus(ctx)]);
    return NextResponse.json({ settings, system });
  } catch (error) {
    return apiErrorResponse(error, "Konfiguration konnte nicht geladen werden.");
  }
}
