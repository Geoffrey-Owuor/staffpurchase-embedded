// Shared login lockout policy — used by app/api/login/route.js, SSO and the
// admin user pages.
// A lockout is password_attempts >= MAX_LOGIN_ATTEMPTS. It's deliberately
// separate from users.is_active, which only an admin changes: a successful
// password reset or an admin "Unlock" sets password_attempts back to 0.
export const MAX_LOGIN_ATTEMPTS = 3;

export const LOCKED_OUT_MESSAGE =
  "Too many failed attempts. Reset your password or contact the administrator.";

export function isLockedOut(passwordAttempts) {
  return (passwordAttempts ?? 0) >= MAX_LOGIN_ATTEMPTS;
}
