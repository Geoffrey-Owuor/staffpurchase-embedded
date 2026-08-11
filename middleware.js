import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Verify JWT
async function verifyEdgeJWT(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { valid: true, role: payload.role };
  } catch {
    // Catching expired or tampered tokens
    return { valid: false };
  }
}

const redirectIfLoggedInPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export default async function middleware(request) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("session_token")?.value;

  // 1. HANDLE THE PROTECTED DASHBOARD ROUTE
  // Role-specific gating (who can see /dashboard/payment-tracking, etc.) lives
  // in the relevant layout.js now that every role shares one route tree -
  // this only needs to confirm a valid session exists.
  if (pathname.startsWith("/dashboard")) {
    // Case A: No token at all
    if (!sessionToken) {
      return NextResponse.redirect(new URL(`${BASE_PATH}/login`, request.url));
    }

    const { valid } = await verifyEdgeJWT(sessionToken);

    // Case B: Token has expired or is invalid
    if (!valid) {
      const response = NextResponse.redirect(
        new URL(`${BASE_PATH}/login`, request.url),
      );
      response.cookies.delete("session_token"); // Hard clean from browser
      return response;
    }
  }

  // 2. HANDLE PUBLIC AUTH PATHS (Your existing redirect logic)
  if (redirectIfLoggedInPaths.includes(pathname)) {
    if (sessionToken) {
      const { valid } = await verifyEdgeJWT(sessionToken);

      if (valid) {
        return NextResponse.redirect(
          new URL(`${BASE_PATH}/dashboard`, request.url),
        );
      }
    }
  }

  return NextResponse.next();
}

// CRITICAL: Update matcher to monitor your dashboard routes
export const config = {
  matcher: [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/dashboard/:path*",
  ],
};
