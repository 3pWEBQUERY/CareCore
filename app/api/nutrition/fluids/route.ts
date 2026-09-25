import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { addFluid } from "@/lib/nutrition";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ctx = await apiContext("documentation.write");
    if (ctx instanceof NextResponse) return ctx;
    return NextResponse.json(
      { id: await addFluid(ctx, (await request.json()) as Record<string, unknown>) },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, "Trinkeintrag konnte nicht gespeichert werden.");
  }
}
