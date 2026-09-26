import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { planDuties } from "@/lib/schedule-planning";

export const runtime = "nodejs";

// Plans one or more duties (optionally recurring) for a person or as open slots.
export async function POST(request: Request) {
  try {
    const ctx = await apiContext("schedule.manage");
    if (ctx instanceof NextResponse) return ctx;
    return NextResponse.json(await planDuties(ctx, (await request.json()) as Record<string, unknown>), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Dienst konnte nicht eingeteilt werden.");
  }
}
