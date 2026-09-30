import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { readPreferences } from "@/lib/user-settings";
import { START_PAGES } from "@/lib/user-settings-shared";

// Sitzung anlegen und als Cookie setzen – nach dem Passwort oder, mit Zwei-Faktor-Anmeldung, nach dem Code.
type SessionUser = { id: string; username: string; display_name: string; role: string };

export async function sessionResponse(user: SessionUser, userAgent: string | null) {
  // The start page chosen in the personal settings.
  const startPath = START_PAGES[(await readPreferences(user.id)).startPage].path;
  const response = NextResponse.json({
    user: { username: user.username, displayName: user.display_name, role: user.role },
    startPath,
  });
  return withSession(response, user, userAgent);
}

// Nach SSO: Sitzung anlegen und zur gewünschten Seite oder zur persönlichen Startseite weiterleiten.
export async function sessionRedirect(
  user: SessionUser,
  userAgent: string | null,
  origin: string,
  next: string | null,
) {
  const startPath = next ?? START_PAGES[(await readPreferences(user.id)).startPage].path;
  return withSession(NextResponse.redirect(new URL(startPath, origin), 303), user, userAgent);
}

async function withSession(response: NextResponse, user: SessionUser, userAgent: string | null) {
  const session = await createSession(user.id, userAgent);
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
    priority: "high",
  });
  return response;
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
