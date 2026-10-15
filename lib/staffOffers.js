import { STAFF_OFFER_CODE } from "@/utils/Pricing/priceCodes";

// Staff Offer prices live in `staff_offer_prices`
// (db/migrations/2026-10-15_staff_offer_prices.sql), managed by hand in the
// DB. Deliberately uncached: a hand-edit must take effect on the next fetch,
// and the offer window is checked against the DB's NOW() at query time.

// The offer currently in force for a product code, as {id, price} or null.
// Applies regardless of item status. When several active offers overlap for
// the same code, the most recently created wins.
export async function getActiveStaffOffer(connection, productCode) {
  const [rows] = await connection.execute(
    `SELECT id, offer_price
     FROM staff_offer_prices
     WHERE product_code = ?
       AND is_active = 1
       AND NOW() BETWEEN starts_at AND ends_at
     ORDER BY created_at DESC, id DESC`,
    [productCode],
  );

  if (rows.length === 0) return null;

  if (rows.length > 1) {
    console.warn(
      `Overlapping active staff offers for ${productCode}; using newest id ${rows[0].id}`,
    );
  }

  return { id: rows[0].id, price: parseFloat(rows[0].offer_price) };
}

export class StaffOfferError extends Error {
  constructor(message) {
    super(message);
    this.status = 409;
  }
}

const sameAmount = (a, b) =>
  Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.005;

const toNumber = (value) =>
  value === "" || value == null ? NaN : parseFloat(value);

const toId = (value) => {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Server-side re-check of the Staff Offer fields on submitted products.
// Returns, per product, the { staffOfferPrice, staffOfferId } values to
// persist — always taken from the DB, never from the client.
//
// - A STAFFOFFER-priced product must use the offer currently in force for
//   its code, at exactly that price with 0% discount; otherwise a
//   StaffOfferError (409) asks the user to re-fetch prices.
// - `storedProducts` (edit path) lets an unchanged, previously saved
//   STAFFOFFER row through even after its offer has ended — saved prices
//   stick until someone re-fetches.
// - For any other basis, the offer is audit-only: recorded when it matches
//   the offer in force, dropped (NULL) otherwise.
export async function verifyStaffOffers(
  connection,
  products,
  storedProducts = [],
) {
  const offersByCode = new Map();
  const activeOfferFor = async (code) => {
    if (!offersByCode.has(code)) {
      offersByCode.set(code, await getActiveStaffOffer(connection, code));
    }
    return offersByCode.get(code);
  };

  const results = [];

  for (const product of products) {
    const code = product.productCode?.trim() ?? "";
    const submittedId = toId(product.staffOfferId);
    const isStaffOffer = product.priceCode === STAFF_OFFER_CODE;

    // Unchanged from what's already saved: keep the stored offer as-is.
    const stored =
      submittedId != null &&
      storedProducts.find(
        (p) =>
          p.staffOfferId === submittedId &&
          p.productCode === code &&
          (!isStaffOffer ||
            (p.priceCode === STAFF_OFFER_CODE &&
              sameAmount(parseFloat(p.tdPrice), toNumber(product.tdPrice)) &&
              sameAmount(
                parseFloat(p.discountedValue),
                toNumber(product.discountedValue),
              ))),
      );
    if (stored) {
      results.push({
        staffOfferPrice: stored.staffOfferPrice,
        staffOfferId: stored.staffOfferId,
      });
      continue;
    }

    const offer = code ? await activeOfferFor(code) : null;
    const matchesOffer = offer != null && offer.id === submittedId;

    if (isStaffOffer) {
      const label = product.itemName || code || "a product";
      if (!matchesOffer) {
        throw new StaffOfferError(
          `The Staff Offer for ${label} has ended or changed. Re-fetch prices and try again.`,
        );
      }
      if (
        !sameAmount(toNumber(product.tdPrice), offer.price) ||
        !sameAmount(toNumber(product.discountRate), 0) ||
        !sameAmount(toNumber(product.discountedValue), offer.price)
      ) {
        throw new StaffOfferError(
          `The Staff Offer price for ${label} doesn't match the current offer. Re-fetch prices and try again.`,
        );
      }
    }

    results.push(
      matchesOffer
        ? { staffOfferPrice: offer.price, staffOfferId: offer.id }
        : { staffOfferPrice: null, staffOfferId: null },
    );
  }

  return results;
}
