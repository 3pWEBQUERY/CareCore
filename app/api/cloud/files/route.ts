import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-context";
import { carecoreActor } from "@/lib/server-data";
import { listFiles, uploadFile } from "@/lib/shared-files";

export const runtime = "nodejs";

// "Meine Dateien" are personal; "?scope=shared" lists the house's shared storage.
export async function GET(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Bitte erneut anmelden." }, { status: 401 });
    const scope = new URL(request.url).searchParams.get("scope") === "shared" ? "shared" : "personal";
    return NextResponse.json(await listFiles(actor, scope));
  } catch (error) {
    return apiErrorResponse(error, "Dateien konnten nicht geladen werden.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Bitte erneut anmelden." }, { status: 401 });
    const file = await uploadFile(actor, await request.formData());
    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Datei konnte nicht gespeichert werden.");
  }
}
