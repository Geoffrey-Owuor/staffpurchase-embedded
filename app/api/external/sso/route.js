import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth";
import crypto from "crypto";
import { basePath } from "@/public/assets";
import { isValidRole } from "@/utils/routes";
import pool from "@/lib/db";

export async function GET(request) {
  // 1. Inspect headers sent by Nginx, falling back to local headers if accessed directly
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "127.0.0.1:10556";

  // 2. Mathematically construct the exact base URL the user is currently using
  // Embedded via Nginx:   https://192.168.0.27:4443
  // Accessed Directly:    http://192.168.0.27:10556
  const baseUrl = `${proto}://${host}`;

  try {
    const { searchParams } = new URL(request.url);

    const email = searchParams.get("email");
    const timestamp = searchParams.get("timestamp");
    const signature = searchParams.get("signature");

    if (!email || !timestamp || !signature) {
      console.log("Some required fields are missing");
      return NextResponse.redirect(new URL(`${basePath}/login`, baseUrl));
    }

    // The timestamp must be epoch milliseconds. Anything else would turn
    // into NaN below, and NaN comparisons are always false - silently
    // skipping the expiry check - so reject it outright.
    if (!/^\d{13}$/.test(timestamp)) {
      console.log("Timestamp is not epoch milliseconds", { raw: timestamp });
      return NextResponse.redirect(new URL(`${basePath}/login`, baseUrl));
    }

    // 1. Prevent Replay Attacks (link expires in 2 minutes - 120000 milliseconds).
    // The timestamp comes from the embedding host's server clock, not the
    // user's device, so allow it to be up to 30s ahead of this server's
    // clock to absorb normal NTP drift between the two servers.
    const MAX_AGE_MS = 120000;
    const MAX_FUTURE_SKEW_MS = 30000;
    const now = Date.now();
    const timeDiff = now - parseInt(timestamp, 10);
    if (timeDiff > MAX_AGE_MS || timeDiff < -MAX_FUTURE_SKEW_MS) {
      // timeDiff < 0: host clock ahead of this server.
      // timeDiff > 120000: stale/reused/prefetched link, or host clock behind.
      console.log("There is a timestamp difference", {
        raw: timestamp,
        now,
        timeDiff,
        referer: request.headers.get("referer"),
        secFetchDest: request.headers.get("sec-fetch-dest"),
        purpose:
          request.headers.get("sec-purpose") || request.headers.get("purpose"),
        userAgent: request.headers.get("user-agent"),
      });
      return NextResponse.redirect(new URL(`${basePath}/login`, baseUrl));
    }

    // 2. Recreate the signature using the shared secret
    const secret = process.env.SSO_SHARED_SECRET;
    if (!secret) {
      console.error("SSO_SHARED_SECRET is not set - refusing SSO sign-in");
      return NextResponse.redirect(new URL(`${basePath}/login`, baseUrl));
    }
    const dataToSign = `${email}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(dataToSign)
      .digest("hex");

    // 3. Compare signatures in constant time (timingSafeEqual requires
    // equal-length buffers, so a length mismatch is a mismatch outright)
    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      console.log("Signatures are not matching");
      return NextResponse.redirect(new URL(`${basePath}/login`, baseUrl));
    }

    // If there is already a valid session for this same user, redirect
    // directly to the dashboard - but only if the account hasn't been
    // disabled since the session was issued (the JWT itself has no way of
    // knowing that).
    const existingSession = await getCurrentUser();
    const isSameUser =
      existingSession.valid &&
      existingSession.email?.toLowerCase() === email.toLowerCase();

    // A session for a different account (shared PC, account switch on the
    // host) must never be reused. Drop it up front so a failed sign-in
    // below can't leave the previous user signed in.
    if (existingSession.valid && !isSameUser) {
      (await cookies()).delete("session_token");
    }

    if (isSameUser) {
      const [existingUser] = await pool.execute(
        `SELECT is_active FROM users WHERE id = ? LIMIT 1`,
        [existingSession.id],
      );

      if (existingUser.length === 0 || !existingUser[0].is_active) {
        const response = NextResponse.redirect(
          new URL(`${basePath}/login`, baseUrl),
        );
        response.cookies.delete("session_token"); // Hard clean from browser
        return response;
      }

      const redirectLink = isValidRole(existingSession.role)
        ? `${basePath}/dashboard`
        : `${basePath}/login`;

      return NextResponse.redirect(new URL(redirectLink, baseUrl));
    }

    // Check if the user exists or not
    const [user] = await pool.execute(
      `SELECT id, name, payrollNo, department, role, is_active FROM users WHERE email = ? LIMIT 1`,
      [email],
    );

    // No user found
    if (user.length === 0) {
      return NextResponse.redirect(new URL(`${basePath}/login`, baseUrl));
    }

    // User exists assign the user object
    const userObject = user[0];

    // User account is disabled
    if (!userObject.is_active) {
      return NextResponse.redirect(new URL(`${basePath}/login`, baseUrl));
    }

    //Create the user session
    await createSession(
      userObject.id,
      userObject.role,
      userObject.name,
      email,
      userObject.payrollNo,
      userObject.department,
    );

    // Success: redirect the user to the dashboard
    const redirectLink = isValidRole(userObject.role)
      ? `${basePath}/dashboard`
      : `${basePath}/login`;
    return NextResponse.redirect(new URL(redirectLink, baseUrl));
  } catch (error) {
    console.error("Error while trying to create the user session:", error);
    return NextResponse.redirect(new URL(`${basePath}/login`, baseUrl));
  }
}
