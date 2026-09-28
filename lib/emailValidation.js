// lib/emailValidation.js
// Shared email validation - safe to import from both client components and
// server routes (no Node-only imports here; the DNS/MX check lives in
// lib/emailDomainCheck.js). Every place that accepts an email from a user, or
// hands recipients to the Graph API, should go through these helpers so we
// reject bad addresses before Graph does.

// Deliberately pragmatic, not full RFC 5322: ASCII local part without
// leading/trailing/consecutive dots, dot-separated domain labels that don't
// start or end with a hyphen, and an alphabetic TLD of at least 2 chars.
const EMAIL_REGEX =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;

export const INVALID_EMAIL_MESSAGE = "Please enter a valid email address";

// Trim and lowercase. Safe to apply to lookups too: MySQL's default
// collations compare case-insensitively, so existing mixed-case rows still match.
export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email) {
  if (typeof email !== "string") return false;
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return false;

  const atIndex = email.lastIndexOf("@");
  if (atIndex < 1 || atIndex > MAX_LOCAL_PART_LENGTH) return false;

  return EMAIL_REGEX.test(email);
}

// Normalizes and validates in one step. Returns the normalized email, or null
// when it isn't valid - use at every API boundary that accepts an email.
export function parseEmail(email) {
  const normalized = normalizeEmail(email);
  return isValidEmail(normalized) ? normalized : null;
}

// Turns whatever recipient shape we have (a single address, an array, or a
// DB string like "a@x.com, b@x.com; c@x.com") into a deduplicated list of
// valid addresses, plus the entries that were rejected. Empty entries (e.g.
// from a trailing comma) are dropped silently - they're what Graph reports as
// "Recipient '' is not resolved".
export function parseRecipientList(recipients) {
  const raw = (Array.isArray(recipients) ? recipients : [recipients])
    .filter((entry) => typeof entry === "string")
    .flatMap((entry) => entry.split(/[,;\s]+/));

  const valid = [];
  const invalid = [];

  for (const entry of raw) {
    const normalized = normalizeEmail(entry);
    if (!normalized) continue;

    if (!isValidEmail(normalized)) {
      invalid.push(entry.trim());
    } else if (!valid.includes(normalized)) {
      valid.push(normalized);
    }
  }

  return { valid, invalid };
}
