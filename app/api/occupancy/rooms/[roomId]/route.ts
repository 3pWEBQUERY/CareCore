import { NextResponse } from "next/server";
import { apiContext, apiErrorResponse } from "@/lib/api-context";
import { saveRoom } from "@/lib/occupancy";

export const runtime = "nodejs";

type Context = { params: Promise<{ roomId: string }> };

// Zimmer ändern (Name, Betten, stillgelegt).
export async function PATCH(request: Request, { params }: Context) {
  try {
    const ctx = await apiContext("administration.manage");
    if (ctx instanceof NextResponse) return ctx;
    const { roomId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    await saveRoom(ctx, roomId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Zimmer konnte nicht gespeichert werden.");
  }
}
