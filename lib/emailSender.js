//lib/emailSender.js
// -- OLD EMAIL SENDING METHOD - GOOGLE WITH NODEMAILER
// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   host: "smtp.gmail.com",
//   port: 465,
//   secure: true,
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_APP_PASSWORD,
//   },
// });

// export async function sendEmail({ to, subject, html, attachments }) {
//   try {
//     const mailOptions = {
//       from: `"Staff Purchase Portal" <${process.env.GMAIL_USER}>`,
//       to,
//       subject,
//       html,
//     };
//     if (attachments) {
//       mailOptions.attachments = attachments.map((attachment) => ({
//         filename: attachment.filename || document.pdf,
//         content: attachment.content,
//         contentType: "application/pdf",
//         disposition: "attachment",
//         // You can also use 'disposition: "attachment"' to ensure it's downloaded
//       }));
//     }

//     await transporter.sendMail(mailOptions);
//     return { success: true };
//   } catch (error) {
//     console.error("Email failed:", error.message);
//     return { success: false, error: error.message };
//   }
// }

// -- NEW EMAIL SENDING METHOD - MICROSOFT GRAPH API WITH AZURE MSL NODE PACKAGE

import { ConfidentialClientApplication } from "@azure/msal-node";
import { parseRecipientList } from "./emailValidation";
import { createLimiter, sleep } from "@/utils/createLimiter";
import { withNoReplyNotice } from "@/utils/EmailTemplates/noReplyNotice";

const msalConfig = {
  auth: {
    clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
    authority: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}`,
    clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

// MSAL caches the app token in memory, so this only hits the network when
// the cached token is missing/expiring - but that call can fail on its own
// ("network_error: Network request failed"), so it runs inside the retry loop.
async function getAccessToken() {
  const result = await cca.acquireTokenByClientCredential({
    // Using Graph scope now
    scopes: ["https://graph.microsoft.com/.default"],
  });
  return result?.accessToken;
}

// --- RESILIENCE SETTINGS ---
// Exchange Online allows ~4 concurrent requests per mailbox per app, and PM2
// runs several workers, so each worker only sends a couple at a time. The
// rest queue instead of all hitting Graph (and the uplink) at once.
const graphLimit = createLimiter(2);
const MAX_ATTEMPTS = 4;
const ATTEMPT_TIMEOUT_MS = 30000;
const MAX_RETRY_AFTER_MS = 60000;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

class GraphSendError extends Error {
  constructor(message, { retryable, retryAfterMs } = {}) {
    super(message);
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

// Exponential backoff with jitter (~1s, 2s, 4s) so workers that failed
// together don't all retry in the same instant.
const backoffMs = (attempt) =>
  1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 1000);

async function sendGraphMailOnce(emailPayload) {
  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (error) {
    // Token endpoint unreachable - transient, retry.
    throw new GraphSendError(`Token request failed: ${error.message}`, {
      retryable: true,
    });
  }
  if (!accessToken) {
    throw new GraphSendError("Failed to retrieve access token", {
      retryable: true,
    });
  }

  let response;
  try {
    response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${process.env.EMAIL_SENDER}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      },
    );
  } catch (error) {
    // "fetch failed" (connect timeout, DNS, reset) or our own timeout.
    const reason =
      error.name === "TimeoutError"
        ? `timed out after ${ATTEMPT_TIMEOUT_MS / 1000}s`
        : `${error.message}${error.cause?.code ? ` (${error.cause.code})` : ""}`;
    throw new GraphSendError(`Network error: ${reason}`, { retryable: true });
  }

  if (response.ok) return;

  const retryAfter = parseInt(response.headers.get("Retry-After"), 10);
  const errorData = await response.json().catch(() => ({}));
  throw new GraphSendError(
    errorData.error?.message ||
      `Failed to send email via Graph (Status: ${response.status})`,
    {
      // Anything else (e.g. 400 Bad Request) won't succeed on retry.
      retryable: RETRYABLE_STATUSES.has(response.status),
      retryAfterMs: Number.isFinite(retryAfter)
        ? Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS)
        : undefined,
    },
  );
}

export const sendEmail = async ({ to, cc, subject, html, attachments }) => {
  try {
    // Validate recipients before Graph sees them - Graph rejects the whole
    // message if even one recipient is empty or malformed, so drop bad
    // entries (and log them) rather than failing delivery for everyone else.
    const toList = parseRecipientList(to);
    const ccList = parseRecipientList(cc ?? []);
    const dropped = [...toList.invalid, ...ccList.invalid];

    if (dropped.length) {
      console.warn(
        `Email "${subject}": skipping invalid recipient(s): ${dropped.map((r) => `'${r}'`).join(", ")}`,
      );
    }
    if (!toList.valid.length) {
      throw new Error(`No valid recipients for email "${subject}"`);
    }

    // Format recipients for Graph API
    const toRecipients = toList.valid.map((email) => ({
      emailAddress: { address: email },
    }));

    const ccRecipients = ccList.valid.map((email) => ({
      emailAddress: { address: email },
    }));

    // Format attachments for Graph API
    const formattedAttachments = attachments?.map((file) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: file.filename,
      // Graph requires content to be a Base64 string
      contentBytes: file.content, //Already converted to base64 string in generate purchasePdf
    }));

    // Construct the Graph Message object
    const emailPayload = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          // Every email (notifications and auth) gets the unmonitored-
          // mailbox notice - templates don't add it themselves.
          content: withNoReplyNotice(html, subject),
        },
        toRecipients: toRecipients,
        ccRecipients: ccRecipients,
        attachments: formattedAttachments || [],
      },
      saveToSentItems: "true",
    };

    // --- RETRY LOGIC: THROTTLING, NETWORK FAILURES & 5XX ---
    // The limiter slot is only held for the attempt itself, not the backoff
    // wait, so a retrying email doesn't block others in the queue.
    for (let attempt = 1; ; attempt++) {
      try {
        await graphLimit(() => sendGraphMailOnce(emailPayload));
        if (attempt > 1) {
          console.info(`Email "${subject}" sent on attempt ${attempt}.`);
        }
        return { success: true };
      } catch (error) {
        if (!error.retryable || attempt >= MAX_ATTEMPTS) {
          throw new Error(
            `${error.message} (after ${attempt} attempt${attempt > 1 ? "s" : ""})`,
          );
        }
        const waitTime = error.retryAfterMs ?? backoffMs(attempt);
        console.warn(
          `Email "${subject}" attempt ${attempt}/${MAX_ATTEMPTS} failed: ${error.message}. Retrying in ${(waitTime / 1000).toFixed(1)}s...`,
        );
        await sleep(waitTime);
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // Subject + recipients so a dropped notification can be resent by hand.
    console.error(
      `Graph Email failed: "${subject}" to ${[].concat(to).join(", ")}: ${errorMessage}`,
    );
    return { success: false, error: errorMessage };
  }
};

// -- NOTIFICATION EMAILS KILL SWITCH --
// NOTIFICATION_EMAILS_ENABLED=false (case-insensitive) skips workflow
// notification emails only (purchase submission + approval/decline chain).
// Missing, "true", or anything else sends as normal. Auth emails
// (verification codes, password resets) always go through sendEmail
// directly and are never skipped, since users can't proceed without them.
let warnedUnrecognized = false;
let loggedDisabled = false;

export function notificationEmailsEnabled() {
  const raw = process.env.NOTIFICATION_EMAILS_ENABLED;
  if (raw === undefined) return true;

  const value = raw.trim().toLowerCase();
  if (value === "false") {
    if (!loggedDisabled) {
      loggedDisabled = true;
      console.warn(
        "[email] NOTIFICATION_EMAILS_ENABLED=false - workflow notification emails are disabled and will be skipped.",
      );
    }
    return false;
  }

  if (value !== "true" && !warnedUnrecognized) {
    warnedUnrecognized = true;
    console.warn(
      `[email] Unrecognized NOTIFICATION_EMAILS_ENABLED value '${raw}' - expected 'true' or 'false'. Notification emails will be sent.`,
    );
  }
  return true;
}

export const sendNotificationEmail = async (email) => {
  if (!notificationEmailsEnabled()) {
    const ccPart = email.cc?.length ? ` (cc: ${[].concat(email.cc).join(", ")})` : "";
    console.info(
      `[email] Skipped (NOTIFICATION_EMAILS_ENABLED=false): "${email.subject}" to ${[].concat(email.to).join(", ")}${ccPart}`,
    );
    return { success: true, skipped: true };
  }
  return sendEmail(email);
};
