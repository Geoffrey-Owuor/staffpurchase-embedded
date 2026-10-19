import { sendNotificationEmail } from "../emailSender";
import generateAdminChangedRequestEmailHTML from "@/utils/EmailTemplates/AdminEmails/AdminChangedRequestEmail";

/**
 * Tells the requester an admin edited or deleted their request. Only called
 * when the admin ticked "notify the requester". Fire-and-forget: handles its
 * own errors. A workflow notification, so NOTIFICATION_EMAILS_ENABLED applies.
 */
export async function adminChangeEmailHandler({
  purchase,
  action,
  reason,
  reopenedStages,
}) {
  if (!purchase.user_email) return;

  try {
    await sendNotificationEmail({
      to: purchase.user_email,
      subject: `Purchase Request ${purchase.reference_number} - ${
        action === "deleted" ? "Removed" : "Updated"
      } by an administrator`,
      html: generateAdminChangedRequestEmailHTML({
        referenceNumber: purchase.reference_number,
        staffName: purchase.staffName,
        action,
        reason,
        reopenedStages,
      }),
    });
  } catch (error) {
    console.error(
      `Admin change email for ${purchase.reference_number} failed:`,
      error.message,
    );
  }
}
