import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { scheduleData } from "@/lib/schedule";

export const runtime = "nodejs";

// ?from=YYYY-MM-DD&to=YYYY-MM-DD&scope=mine|team&careUnitId=
export async function GET(request: Request) {
  try {
    const ctx = await apiContext("residents.read");
    if (ctx instanceof NextResponse) return ctx;
    return NextResponse.json(await scheduleData(ctx, new URL(request.url).searchParams));
  } catch (error) {
    return apiErrorResponse(error, "Dienstplan konnte nicht geladen werden.");
  }
}
