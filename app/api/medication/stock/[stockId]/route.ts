import { NextResponse } from "next/server";
import { correctStock, medicationContext, medicationErrorResponse } from "@/lib/medication";

export const runtime = "nodejs";
type Context = { params: Promise<{ stockId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const ctx = await medicationContext("medication.manage");
    if (ctx instanceof NextResponse) return ctx;
    const { stockId } = await params;
    await correctStock(ctx, stockId, (await request.json()) as Record<string, unknown>);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return medicationErrorResponse(error, "Bestand konnte nicht korrigiert werden.");
  }
}
