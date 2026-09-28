// lib/emailDomainCheck.js
// Server-only: checks that an email's domain can actually receive mail, so
// typo'd domains (e.g. "gmial.con", "hotpoint.co.kr") are caught at
// registration instead of surfacing later as Graph "Recipient not resolved"
// errors.
//
// Fails OPEN: only a definitive "this domain doesn't exist / has no mail
// server" answer rejects the address. Timeouts and resolver errors let the
// email through so a DNS hiccup never blocks registration.
import { promises as dns } from "dns";

const DNS_TIMEOUT_MS = 3000;

// Resolver codes that mean the domain definitively has no records of that type
const NO_RECORD_CODES = new Set(["ENOTFOUND", "ENODATA"]);

function withTimeout(promise) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(Object.assign(new Error("DNS timeout"), { code: "ETIMEOUT" })),
      DNS_TIMEOUT_MS,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function hasRecords(resolve, domain) {
  try {
    const records = await withTimeout(resolve(domain));
    return records.length > 0;
  } catch (error) {
    if (NO_RECORD_CODES.has(error.code)) return false;
    throw error;
  }
}

export async function emailDomainAcceptsMail(email) {
  const domain = email.slice(email.lastIndexOf("@") + 1);

  try {
    const mx = await withTimeout(dns.resolveMx(domain));
    // RFC 7505 "null MX" (a single "." exchange) means the domain accepts no mail
    return !(mx.length === 1 && mx[0].exchange === "");
  } catch (error) {
    if (!NO_RECORD_CODES.has(error.code)) {
      console.warn(
        `MX lookup for ${domain} failed (${error.code || error.message}); allowing address`,
      );
      return true;
    }
  }

  // No MX records: RFC 5321 falls back to the domain's A/AAAA record
  try {
    return (
      (await hasRecords(dns.resolve4, domain)) ||
      (await hasRecords(dns.resolve6, domain))
    );
  } catch (error) {
    console.warn(
      `A/AAAA lookup for ${domain} failed (${error.code || error.message}); allowing address`,
    );
    return true;
  }
}
