import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
const publicRoutes = ["/", ...authRoutes];

function isPublicPath(pathname: string): boolean {
  if (publicRoutes.includes(pathname)) return true;
  if (pathname.startsWith("/share/")) return true;
  return false;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isPublicRoute = isPublicPath(pathname);

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
