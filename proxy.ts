import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/") return NextResponse.next();

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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
