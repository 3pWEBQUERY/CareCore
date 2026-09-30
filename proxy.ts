import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { consumeWrite, isThrottledWrite, rateLimitKey } from "@/lib/rate-limit";
import { carecoreDb } from "@/lib/server-data";

// Schreibende API-Anfragen drosseln; bei einem Fehler der Zählung wird die Anfrage nicht blockiert.
async function throttleApi(request: NextRequest) {
  if (!isThrottledWrite(request.method, request.nextUrl.pathname)) return NextResponse.next();
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const result = await consumeWrite(carecoreDb(), rateLimitKey(request.cookies.get(SESSION_COOKIE)?.value, ip));
    if (!result.allowed)
      return NextResponse.json(
        { error: "Zu viele Änderungen in kurzer Zeit. Bitte einen Moment warten und erneut versuchen." },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
      );
  } catch (error) {
    console.error("Rate limit check failed", error);
  }
  return NextResponse.next();
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) return throttleApi(request);
  if (pathname === "/") return NextResponse.next();
  // Portal für Angehörige und Ärztinnen/Ärzte: eigene Anmeldung (Cookie carecore_portal), prüft die Seite selbst.
  if (pathname === "/portal" || pathname.startsWith("/portal/")) return NextResponse.next();

  if (!pathname.startsWith("/c")) {
    const target = request.nextUrl.clone();
    target.pathname = `/c${pathname}`;
    return NextResponse.redirect(target);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    const user = await getSessionUser(token);
    if (user) return NextResponse.next();
  } catch (error) {
    console.error("Session validation failed", error);
  }

  const login = request.nextUrl.clone();
  login.pathname = "/";
  login.search = "";
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sw.js|sw-crypto.js|manifest.webmanifest|icons/).*)",
  ],
};
