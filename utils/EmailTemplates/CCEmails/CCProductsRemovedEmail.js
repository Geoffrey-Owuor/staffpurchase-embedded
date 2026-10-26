import { escapeHtml, multilineHtml } from "../formatEmailText";

const formatKsh = (value) =>
  `Ksh ${(parseFloat(value) || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Sent to the requester when Credit Control removes products from their
// request (api/generaleditpurchases). `removedProducts` are the stored rows.
const generateCCProductsRemovedEmailHTML = ({
  referenceNumber,
  staffName,
  removedProducts,
  reason,
  newTotal,
}) => {
  const rowsHtml = removedProducts
    .map(
      (product) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eeeeee;">${escapeHtml(product.productCode)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eeeeee;">${escapeHtml(product.itemName)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eeeeee; text-align: right;">${formatKsh(product.discountedValue)}</td>
        </tr>`,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Products Removed From Your Request</title>
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
                      <h1 style="color: #B71C1C; font-size: 24px; text-align: center; margin: 0 0 15px 0;">Products Removed From Your Request</h1>
                      <p style="color: #555555; font-size: 15px;">Hello ${escapeHtml(staffName)},</p>
                      <p style="color: #555555; font-size: 15px;">Credit Control removed the following ${removedProducts.length === 1 ? "product" : "products"} from your purchase request <strong>${escapeHtml(referenceNumber)}</strong>:</p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #333333; border-collapse: collapse;">
                        <tr style="background: #f0f0f0; text-align: left;">
                          <th style="padding: 8px;">Product Code</th>
                          <th style="padding: 8px;">Item</th>
                          <th style="padding: 8px; text-align: right;">Value</th>
                        </tr>
                        ${rowsHtml}
                      </table>
                      <p style="color: #555555; font-size: 15px;">The new request total is <strong>${formatKsh(newTotal)}</strong>.</p>
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

export default generateCCProductsRemovedEmailHTML;
