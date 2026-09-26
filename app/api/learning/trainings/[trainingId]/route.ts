import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { addSession, assignTraining, updateTraining } from "@/lib/learning";

export const runtime = "nodejs";

// { action: "update", ...fields } | { action: "archive" } | { action: "assign", userIds, dueOn } | { action: "session", date, start, end, location, capacity }
export async function POST(request: Request, { params }: { params: Promise<{ trainingId: string }> }) {
  try {
    const ctx = await apiContext("team.manage");
    if (ctx instanceof NextResponse) return ctx;
    const { trainingId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === "assign") return NextResponse.json({ assigned: await assignTraining(ctx, trainingId, body) });
    if (body.action === "session")
      return NextResponse.json({ id: await addSession(ctx, trainingId, body) }, { status: 201 });
    await updateTraining(ctx, trainingId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Schulung konnte nicht geändert werden.");
  }
}
