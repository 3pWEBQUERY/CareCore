import { NextResponse } from "next/server";
import {
  medicationContext,
  medicationErrorResponse,
  parseOrderInput,
  setOrderStatus,
  updateOrder,
} from "@/lib/medication";

export const runtime = "nodejs";
type Context = { params: Promise<{ orderId: string }> };

// With `status` the order is paused, resumed or stopped; otherwise its content is updated.
export async function PATCH(request: Request, { params }: Context) {
  try {
    const ctx = await medicationContext("medication.manage");
    if (ctx instanceof NextResponse) return ctx;
    const { orderId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    if ("status" in body) await setOrderStatus(ctx, orderId, body.status, body.reason);
    else await updateOrder(ctx, orderId, parseOrderInput(body));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return medicationErrorResponse(error, "Verordnung konnte nicht aktualisiert werden.");
  }
}
