import { sendNotificationEmail } from "../emailSender";
import generateCCProductsRemovedEmailHTML from "@/utils/EmailTemplates/CCEmails/CCProductsRemovedEmail";

/**
 * Tells the requester Credit Control removed products from their request.
 * Fire-and-forget: handles its own errors. A workflow notification, so
 * NOTIFICATION_EMAILS_ENABLED applies.
 */
export async function ccProductsRemovedEmailHandler({
  purchase,
  removedProducts,
  reason,
  newTotal,
}) {
  if (!purchase.user_email) return;

  try {
    await sendNotificationEmail({
      to: purchase.user_email,
      subject: `Purchase Request ${purchase.reference_number} - Products removed by Credit Control`,
      html: generateCCProductsRemovedEmailHTML({
        referenceNumber: purchase.reference_number,
        staffName: purchase.staffName,
        removedProducts,
        reason,
        newTotal,
      }),
    });
  } catch (error) {
    console.error(
      `Products removed email for ${purchase.reference_number} failed:`,
      error.message,
    );
  }
}
