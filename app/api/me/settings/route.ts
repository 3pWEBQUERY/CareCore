import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-context";
import { carecoreActor } from "@/lib/server-data";
import { savePreferences, userSettings } from "@/lib/user-settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await carecoreActor();
    if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    return NextResponse.json(await userSettings(actor));
  } catch (error) {
    return apiErrorResponse(error, "Einstellungen konnten nicht geladen werden.");
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    const preferences = await savePreferences(actor, (await request.json()) as Record<string, unknown>);
    return NextResponse.json({ preferences });
  } catch (error) {
    return apiErrorResponse(error, "Einstellung konnte nicht gespeichert werden.");
  }
}
