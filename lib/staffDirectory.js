// lib/staffDirectory.js
// Server-only client for the Hotpoint Apps Hub staff lookup API
// (requisitions_automation app/api/staff/lookup), which reads the HR-managed
// company_staff_data table. Configured by STAFF_LOOKUP_API_URL (the full
// URL of that route, reached server-to-server) and STAFF_LOOKUP_API_KEY (its
// shared secret). Not "use server" on purpose - it must not become a
// callable action.
//
// Registration fails CLOSED on "unavailable" (a personal email can't be let
// in unchecked); sign-in fails OPEN (a Hub outage must not lock everyone out).
import pool from "@/lib/db";

const TIMEOUT_MS = 5000;

// Code-verified mailboxes on these domains may register without their email
// being on file; their payroll number must still match an active record.
const COMPANY_EMAIL_DOMAINS = ["hotpoint.co.ke"];

export function isCompanyEmail(email) {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  return COMPANY_EMAIL_DOMAINS.includes(domain);
}

// Payroll numbers are typed by hand, so they're compared ignoring case and
// surrounding spaces (the Hub API does the same)
export const payrollKey = (payrollNo) =>
  typeof payrollNo === "string" ? payrollNo.trim().toUpperCase() : "";

// Looks a staff record up by { email } or { staffNumber }. Resolves to
//   { status: "found", active, staff: { staffNumber, name, department } }
//   { status: "not_found" }
//   { status: "unavailable" }  - not configured, timed out, or Hub error
export async function lookupStaff({ email, staffNumber }) {
  const url = process.env.STAFF_LOOKUP_API_URL;
  const key = process.env.STAFF_LOOKUP_API_KEY;
  if (!url || !key) {
    console.error("STAFF_LOOKUP_API_URL/STAFF_LOOKUP_API_KEY are not set");
    return { status: "unavailable" };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-staff-lookup-key": key,
      },
      body: JSON.stringify(email ? { email } : { staffNumber }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`Staff lookup failed with status ${response.status}`);
      return { status: "unavailable" };
    }
    const data = await response.json();
    if (!data.found) return { status: "not_found" };
    return { status: "found", active: data.active === true, staff: data.staff };
  } catch (error) {
    console.error("Staff lookup failed:", error.message);
    return { status: "unavailable" };
  }
}

// Sign-in gate (password login, SSO, check-session). Returns false only when
// the staff directory says the account's payroll number is deactivated.
// Everything else signs in: an active match marks the account verified, and
// no match or an unreachable Hub leaves it as it is (accounts from before
// registration was checked are grandfathered - see
// db/migrations/2026-10-20_staff_verification.sql).
export async function isStaffAllowed(userId, payrollNo) {
  if (!payrollKey(payrollNo)) return true;

  const result = await lookupStaff({ staffNumber: payrollNo });
  if (result.status !== "found") return true;

  try {
    await pool.execute(
      result.active
        ? `UPDATE users SET staff_verified_at = NOW()
           WHERE id = ? AND staff_verified_at IS NULL`
        : `UPDATE users SET staff_verified_at = NULL WHERE id = ?`,
      [userId],
    );
  } catch (error) {
    console.error("Couldn't record the staff check:", error.message);
  }
  return result.active;
}

export const STAFF_INACTIVE_MESSAGE =
  "Your staff record is inactive, so you can't sign in. Please contact HR.";
