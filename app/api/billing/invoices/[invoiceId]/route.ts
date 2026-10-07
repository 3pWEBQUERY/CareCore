import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { cancelInvoice, invoiceDetail } from "@/lib/invoices";

export const runtime = "nodejs";

type Params = { params: Promise<{ invoiceId: string }> };

// Rechnung mit Zahlteil (SVG) zum Drucken.
export async function GET(_request: Request, { params }: Params) {
  try {
    const ctx = await apiContext("billing.manage");
    if (ctx instanceof NextResponse) return ctx;
    return NextResponse.json(await invoiceDetail(ctx, (await params).invoiceId));
  } catch (error) {
    return apiErrorResponse(error, "Die Rechnung konnte nicht geladen werden.");
  }
}

// { reason } – Rechnung stornieren.
export async function POST(request: Request, { params }: Params) {
  try {
    const ctx = await apiContext("billing.manage");
    if (ctx instanceof NextResponse) return ctx;
    await cancelInvoice(ctx, (await params).invoiceId, (await request.json()) as Record<string, unknown>);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Die Rechnung konnte nicht storniert werden.");
  }
}
