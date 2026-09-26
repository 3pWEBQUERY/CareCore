import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { changeAssignment } from "@/lib/schedule-planning";

export const runtime = "nodejs";

// { action: "confirm" | "remove" }
export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const ctx = await apiContext("residents.read");
    if (ctx instanceof NextResponse) return ctx;
    await changeAssignment(ctx, (await params).assignmentId, (await request.json()) as Record<string, unknown>);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Einteilung konnte nicht geändert werden.");
  }
}
