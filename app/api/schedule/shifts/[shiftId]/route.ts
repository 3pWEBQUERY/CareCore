import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { changeShift } from "@/lib/schedule";

export const runtime = "nodejs";

// { action: "assign", userId } | { action: "take" } | { action: "cancel", reason }
export async function POST(request: Request, { params }: { params: Promise<{ shiftId: string }> }) {
  try {
    const ctx = await apiContext("residents.read");
    if (ctx instanceof NextResponse) return ctx;
    await changeShift(ctx, (await params).shiftId, (await request.json()) as Record<string, unknown>);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Dienst konnte nicht geändert werden.");
  }
}
