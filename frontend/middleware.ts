import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that require authentication
const protectedPaths = ["/dashboard", "/campaigns/create"];

// Paths that should redirect to dashboard if already authenticated
const authPaths = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("authToken")?.value ||
                request.headers.get("authorization")?.replace("Bearer ", "");

  // Check if the path requires authentication
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  // If accessing a protected path without a token, redirect to login
  if (isProtectedPath && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing auth pages (login/register) with a valid token, redirect to dashboard
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// Configure which paths should be processed by the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
