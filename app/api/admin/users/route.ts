import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { deleteManagedUser, listManagedUsers, updateManagedUser } from "@/lib/admin-users";

export const runtime = "nodejs";

async function adminUser() {
  const cookieStore = await cookies();
  const user = await getSessionUser(cookieStore.get(SESSION_COOKIE)?.value);
  return user?.role === "admin" ? user : null;
}

function errorResponse(error: unknown) {
  if (error instanceof Error && error.message === "DATABASE_URL_NOT_CONFIGURED") return NextResponse.json({ error: "Datenbank ist nicht konfiguriert." }, { status: 503 });
  if (error instanceof Error && ["CANNOT_LOCK_SELF", "CANNOT_DELETE_SELF"].includes(error.message)) return NextResponse.json({ error: "Das eigene Administrationskonto kann nicht gesperrt oder gelöscht werden." }, { status: 400 });
  if (error instanceof Error && error.message === "CARE_UNIT_NOT_FOUND") return NextResponse.json({ error: "Der gewählte Wohnbereich ist nicht verfügbar." }, { status: 400 });
  if (error instanceof Error && error.message === "INVALID_USER_INPUT") return NextResponse.json({ error: "Name, Benutzername und Rolle sind erforderlich." }, { status: 400 });
  console.error("Admin users request failed", error);
  return NextResponse.json({ error: "Benutzerverwaltung konnte nicht aktualisiert werden." }, { status: 500 });
}

export async function GET() {
  try {
    if (!(await adminUser())) return NextResponse.json({ error: "Keine Administrationsberechtigung." }, { status: 403 });
    return NextResponse.json(await listManagedUsers());
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await adminUser(); if (!actor) return NextResponse.json({ error: "Keine Administrationsberechtigung." }, { status: 403 });
    const body = await request.json() as { userId?: unknown; displayName?: unknown; username?: unknown; role?: unknown; jobTitle?: unknown; phone?: unknown; primaryCareUnitId?: unknown; action?: unknown };
    if (typeof body.userId !== "string") return NextResponse.json({ error: "Benutzer fehlt." }, { status: 400 });
    const action = body.action === "lock" || body.action === "restore" ? body.action : undefined;
    return NextResponse.json(await updateManagedUser(actor.id, body.userId, { displayName: typeof body.displayName === "string" ? body.displayName : undefined, username: typeof body.username === "string" ? body.username : undefined, role: typeof body.role === "string" ? body.role : undefined, jobTitle: typeof body.jobTitle === "string" ? body.jobTitle : undefined, phone: typeof body.phone === "string" ? body.phone : undefined, primaryCareUnitId: typeof body.primaryCareUnitId === "string" || body.primaryCareUnitId === null ? body.primaryCareUnitId : undefined, action }));
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    const actor = await adminUser(); if (!actor) return NextResponse.json({ error: "Keine Administrationsberechtigung." }, { status: 403 });
    const body = await request.json() as { userId?: unknown };
    if (typeof body.userId !== "string") return NextResponse.json({ error: "Benutzer fehlt." }, { status: 400 });
    return NextResponse.json(await deleteManagedUser(actor.id, body.userId));
  } catch (error) { return errorResponse(error); }
}
