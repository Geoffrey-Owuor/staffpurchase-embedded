import { escapeHtml, multilineHtml } from "../formatEmailText";

// Sent to the requester when an admin edits (optionally reopening approval
// stages) or deletes their request and chose to notify them.
// `action`: "edited" | "deleted"; `reopenedStages`: stage labels reset to pending.
const generateAdminChangedRequestEmailHTML = ({
  referenceNumber,
  staffName,
  action,
  reason,
  reopenedStages = [],
}) => {
  const heading =
    action === "deleted"
      ? "Purchase Request Removed"
      : "Purchase Request Updated";
  const summary =
    action === "deleted"
      ? `Your purchase request <strong>${escapeHtml(referenceNumber)}</strong> has been removed by a system administrator.`
      : `Your purchase request <strong>${escapeHtml(referenceNumber)}</strong> has been updated by a system administrator.`;
  const reopenedHtml =
    reopenedStages.length > 0
      ? `<p style="color: #555555; font-size: 15px;">The following approval stages were reopened and will be reviewed again: <strong>${reopenedStages.map(escapeHtml).join(", ")}</strong>.</p>`
      : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${heading}</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color:#ffffff;">
        <center>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <h1 style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 26px; font-weight: 800; color: #1a2340; letter-spacing: -0.5px; line-height: 1.2;">
                  Hotpoint <span style="font-weight: 400; color: #B30000; font-size: 24px;">Appliances Ltd</span>
                </h1>
              </td>
            </tr>
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0" style="background: #fcfcfc; border-top: 5px solid #B71C1C; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                  <tr>
                    <td style="padding: 25px;">
                      <h1 style="color: #B71C1C; font-size: 24px; text-align: center; margin: 0 0 15px 0;">${heading}</h1>
                      <p style="color: #555555; font-size: 15px;">Hello ${escapeHtml(staffName)},</p>
                      <p style="color: #555555; font-size: 15px;">${summary}</p>
                      ${reopenedHtml}
                      <h3 style="color: #333;">Reason</h3>
                      <p style="color: #555555; font-size: 15px;">${multilineHtml(reason)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </center>
      </body>
    </html>
  `;
};

export default generateAdminChangedRequestEmailHTML;
