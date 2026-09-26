import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { saveSetting } from "@/lib/settings";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const ctx = await apiContext("administration.manage");
    if (ctx instanceof NextResponse) return ctx;
    const { key } = await params;
    return NextResponse.json({
      settings: await saveSetting(ctx, key, (await request.json()) as Record<string, unknown>),
    });
  } catch (error) {
    return apiErrorResponse(error, "Einstellung konnte nicht gespeichert werden.");
  }
}
