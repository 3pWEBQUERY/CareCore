import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { readPreferences } from "@/lib/user-settings";
import { START_PAGES } from "@/lib/user-settings-shared";

// Sitzung anlegen und als Cookie setzen – nach dem Passwort oder, mit Zwei-Faktor-Anmeldung, nach dem Code.
export async function sessionResponse(
  user: { id: string; username: string; display_name: string; role: string },
  userAgent: string | null,
) {
  const session = await createSession(user.id, userAgent);
  // The start page chosen in the personal settings.
  const startPath = START_PAGES[(await readPreferences(user.id)).startPage].path;
  const response = NextResponse.json({
    user: { username: user.username, displayName: user.display_name, role: user.role },
    startPath,
  });
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
