import crypto from "crypto";

// Shared by the admin purchase routes (app/api/admin/purchases/[id]).

export const PRODUCT_COLUMNS = `id, itemName, itemStatus, productPolicy, productCode, priceCode, tdPrice,
  discountRate, discountedValue, tradePrice, retailPrice, onlinePrice, staffOfferPrice, staffOfferId`;

// Loads a request and its products. `lock` takes FOR UPDATE row locks, for
// use inside a transaction.
export async function loadPurchase(connection, id, { lock = false } = {}) {
  const forUpdate = lock ? " FOR UPDATE" : "";
  const [rows] = await connection.execute(
    `SELECT * FROM purchasesinfo WHERE id = ?${forUpdate}`,
    [id],
  );
  if (rows.length === 0) return null;

  const [products] = await connection.execute(
    `SELECT ${PRODUCT_COLUMNS} FROM purchase_products WHERE purchase_id = ? ORDER BY id${forUpdate}`,
    [id],
  );

  return { purchase: rows[0], products };
}

// Fingerprint of a request as loaded. The editor sends back the version it
// was opened with and the save is refused if it no longer matches, so an
// approver acting meanwhile is never silently overwritten (purchasesinfo has
// no updated_at to compare instead).
export function purchaseVersion({ purchase, products }) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ purchase, products }))
    .digest("hex")
    .slice(0, 32);
}

// What the audit log records: the full request and its line items (minus
// row ids), so a deleted request can be rebuilt from its log entry.
export function purchaseSnapshot({ purchase, products }) {
  return {
    ...purchase,
    products: products.map(({ id, ...product }) => product),
  };
}

// A DATE column as YYYY-MM-DD (mysql2 hands DATE back as a local-midnight
// Date, which would shift a day once serialized to UTC JSON).
export function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  const pad = (n) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}
