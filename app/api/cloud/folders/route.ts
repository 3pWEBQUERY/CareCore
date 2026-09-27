import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-context";
import { carecoreActor } from "@/lib/server-data";
import { saveFolder } from "@/lib/shared-files";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Bitte erneut anmelden." }, { status: 401 });
    const id = await saveFolder(actor, null, (await request.json()) as Record<string, unknown>);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Ordner konnte nicht angelegt werden.");
  }
}
