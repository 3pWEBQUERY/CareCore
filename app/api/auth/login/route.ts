import { NextResponse } from "next/server";
import { authenticate, createSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { username?: unknown; password?: unknown };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password || username.length > 80 || password.length > 200) {
      return NextResponse.json({ error: "Bitte Benutzername und Passwort vollständig eingeben." }, { status: 400 });
    }
    const user = await authenticate(username, password);
    if (!user) return NextResponse.json({ error: "Benutzername oder Passwort ist nicht korrekt." }, { status: 401 });
    const session = await createSession(user.id);
    const response = NextResponse.json({ user: { username: user.username, displayName: user.display_name, role: user.role } });
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
      priority: "high",
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "DATABASE_URL_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Neon Postgres ist noch nicht verbunden. DATABASE_URL fehlt." }, { status: 503 });
    }
    console.error("Login failed", error);
    return NextResponse.json({ error: "Die Anmeldung ist derzeit nicht verfügbar." }, { status: 500 });
  }
}
