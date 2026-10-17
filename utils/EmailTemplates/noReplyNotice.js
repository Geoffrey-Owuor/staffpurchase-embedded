// Shared "unmonitored mailbox" notice, added to every outgoing email by
// sendEmail (lib/emailSender.js) - templates don't add it themselves.
// - A slim line at the top, because people read the top, not the footer.
// - A hidden preheader carrying the subject in front of that line, so inbox
//   previews don't all read "Automated message...".
// - A footer pointing to the app, since a dead end is why people reply.
// Inline styles + tables only (Outlook), with explicit colours.

import { escapeHtml } from "./formatEmailText";

const APP_NAME = "Staff Purchase Portal";

// Zero-width filler after the preheader text stops clients from pulling the
// visible top line into the preview.
const PREVIEW_FILLER = "&#847;&zwnj;&nbsp;".repeat(80);

function topNotice(subject) {
  return `
<div style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;">${escapeHtml(subject)}${PREVIEW_FILLER}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:8px 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#6b7280;">
      Automated message from ${APP_NAME} &middot; please don&rsquo;t reply to this email
    </td>
  </tr>
</table>`;
}

function footerNotice() {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const followUp = appUrl
    ? `To follow up, open <a href="${escapeHtml(appUrl)}" style="color:#4b5563;font-weight:bold;text-decoration:underline;">${APP_NAME}</a>.`
    : `To follow up, open ${APP_NAME}.`;
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:600px;width:100%;">
        <tr>
          <td align="center" style="border-top:1px solid #e5e7eb;padding:14px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">
            This email was sent from an unmonitored mailbox, so replies are not read.<br>
            ${followUp}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// Inserts the notices just inside <body> / before </body> for full HTML
// documents, or at the start / end of a fragment.
export function withNoReplyNotice(html, subject) {
  const top = topNotice(subject);
  const footer = footerNotice();

  // Index slicing, not String.replace: a "$&" in the subject would be read
  // as a replacement pattern.
  const bodyOpen = /<body[^>]*>/i.exec(html);
  let result = bodyOpen
    ? `${html.slice(0, bodyOpen.index + bodyOpen[0].length)}${top}${html.slice(bodyOpen.index + bodyOpen[0].length)}`
    : `${top}${html}`;

  const bodyClose = result.toLowerCase().lastIndexOf("</body>");
  result =
    bodyClose === -1
      ? `${result}${footer}`
      : `${result.slice(0, bodyClose)}${footer}${result.slice(bodyClose)}`;

  return result;
}
