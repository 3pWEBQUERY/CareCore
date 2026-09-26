import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { raiResidentDetail, saveRaiAssessment } from "@/lib/rai";

export const runtime = "nodejs";

type Params = { params: Promise<{ residentId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const ctx = await apiContext("rai.manage");
    if (ctx instanceof NextResponse) return ctx;
    return NextResponse.json(await raiResidentDetail(ctx, (await params).residentId));
  } catch (error) {
    return apiErrorResponse(error, "interRAI-Erfassung konnte nicht geladen werden.");
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const ctx = await apiContext("rai.manage");
    if (ctx instanceof NextResponse) return ctx;
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json(await saveRaiAssessment(ctx, (await params).residentId, body));
  } catch (error) {
    return apiErrorResponse(error, "interRAI-Erfassung konnte nicht gespeichert werden.");
  }
}
