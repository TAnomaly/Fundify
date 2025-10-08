import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that require authentication
const protectedPaths = ["/dashboard", "/campaigns/create"];

// Paths that should redirect to dashboard if already authenticated
const authPaths = ["/login", "/register"];

// Simple JWT validation - checks if token is expired
function isTokenValid(token: string): boolean {
  try {
    // JWT structure: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Decode payload (base64url)
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    // Check expiration
    if (payload.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        return false; // Token expired
      }
    }

    return true;
  } catch (error) {
    return false; // Invalid token format
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("authToken")?.value ||
                request.headers.get("authorization")?.replace("Bearer ", "");

  // Validate token if it exists
  const hasValidToken = token ? isTokenValid(token) : false;

  // Check if the path requires authentication
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  // If token exists but is invalid, clear it
  if (token && !hasValidToken) {
    const response = NextResponse.next();
    response.cookies.set('authToken', '', { maxAge: 0, path: '/' });
    return response;
  }

  // If accessing a protected path without a valid token, redirect to login
  if (isProtectedPath && !hasValidToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing auth pages (login/register) with a valid token, redirect to dashboard
  if (isAuthPath && hasValidToken) {
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
