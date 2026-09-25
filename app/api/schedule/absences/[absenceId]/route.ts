import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { decideAbsence } from "@/lib/schedule";

export const runtime = "nodejs";

// { action: "approve" | "reject" | "revoke" | "withdraw", note? }
export async function POST(request: Request, { params }: { params: Promise<{ absenceId: string }> }) {
  try {
    const ctx = await apiContext("residents.read");
    if (ctx instanceof NextResponse) return ctx;
    return NextResponse.json(
      await decideAbsence(ctx, (await params).absenceId, (await request.json()) as Record<string, unknown>),
    );
  } catch (error) {
    return apiErrorResponse(error, "Abwesenheit konnte nicht geändert werden.");
  }
}
