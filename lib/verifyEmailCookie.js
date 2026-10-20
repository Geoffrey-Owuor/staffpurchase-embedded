// lib/verifyEmailCookie.js
// Server-only: the short-lived `verify_email` cookie that ties the three
// registration steps to the browser that asked for the code. The register
// pages and the APIs that finish registration (staffdetails,
// completeregistration) all require it and only act on the email it names,
// so knowing someone's freshly verified email isn't enough to finish their
// registration from another browser.
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { basePath } from "@/public/assets";

const COOKIE_NAME = "verify_email";
const MAX_AGE_SECONDS = 300; // 5 minutes, like the code itself

// The app root (basePath-aware), so both /register/* pages and
// /api/register/* routes receive it
const COOKIE_PATH = `${basePath}/`;

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

export async function setVerifyEmailCookie(email) {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(secret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    // As before: the app is also reached over plain HTTP internally
    secure: false,
    sameSite: "strict",
    path: COOKIE_PATH,
    maxAge: MAX_AGE_SECONDS,
  });
}

// The email the cookie was issued for, or null if it's missing/expired/forged
export async function getVerifyEmailCookie() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export async function clearVerifyEmailCookie() {
  (await cookies()).set({
    name: COOKIE_NAME,
    value: "",
    path: COOKIE_PATH,
    maxAge: 0,
  });
}
