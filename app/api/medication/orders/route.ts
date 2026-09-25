import { NextResponse } from "next/server";
import { createOrder, medicationContext, medicationErrorResponse, parseOrderInput } from "@/lib/medication";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ctx = await medicationContext("medication.manage");
    if (ctx instanceof NextResponse) return ctx;
    const body = (await request.json()) as Record<string, unknown>;
    const id = await createOrder(ctx, body.residentId, parseOrderInput(body));
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return medicationErrorResponse(error, "Verordnung konnte nicht gespeichert werden.");
  }
}
