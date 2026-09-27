import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-context";
import { carecoreActor } from "@/lib/server-data";
import { deleteFolder, saveFolder } from "@/lib/shared-files";

export const runtime = "nodejs";
type Context = { params: Promise<{ folderId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Bitte erneut anmelden." }, { status: 401 });
    const { folderId } = await params;
    await saveFolder(actor, folderId, (await request.json()) as Record<string, unknown>);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Ordner konnte nicht umbenannt werden.");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const actor = await carecoreActor();
    if (!actor?.organizationId) return NextResponse.json({ error: "Bitte erneut anmelden." }, { status: 401 });
    const { folderId } = await params;
    await deleteFolder(actor, folderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Ordner konnte nicht gelöscht werden.");
  }
}
