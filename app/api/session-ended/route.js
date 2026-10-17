import { NextResponse } from "next/server";
import { basePath } from "@/public/assets";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";

// Where the dashboard layout sends a session whose JWT is still valid but
// whose account was deactivated or had its session_version bumped. A server
// component can't delete cookies, and redirecting straight to /login would
// loop (middleware bounces a valid-looking JWT from /login back to
// /dashboard), so the cookie is cleared here first.
export async function GET(request) {
  const response = NextResponse.redirect(
    new URL(`${basePath}/login`, getRequestBaseUrl(request)),
  );
  response.cookies.delete("session_token");
  return response;
}
