import { NextResponse } from "next/server";
import { documentScheduledDose, listRound, medicationContext, medicationErrorResponse } from "@/lib/medication";
import { ROUNDS, type RoundKey } from "@/lib/medication-shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await medicationContext("residents.read");
    if (ctx instanceof NextResponse) return ctx;
    const params = new URL(request.url).searchParams;
    const round = params.get("round") as RoundKey;
    if (!(round in ROUNDS)) return NextResponse.json({ error: "Unbekannte Runde." }, { status: 400 });
    return NextResponse.json(await listRound(ctx, round, params.get("date")));
  } catch (error) {
    return medicationErrorResponse(error, "Medikamentenrunde konnte nicht geladen werden.");
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await medicationContext("medication.manage");
    if (ctx instanceof NextResponse) return ctx;
    await documentScheduledDose(ctx, (await request.json()) as Record<string, unknown>);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return medicationErrorResponse(error, "Gabe konnte nicht dokumentiert werden.");
  }
}
