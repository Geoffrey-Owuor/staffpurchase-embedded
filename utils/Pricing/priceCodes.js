// Single source of truth for price codes used across the pricing fetch,
// selection, and display logic.

// Price lists fetched from Orion, one request each.
export const ORION_PRICE_CODES = ["TRADE", "RTLRRP", "ONLINE"];

// DB-managed staff promo price (staff_offer_prices), already discounted.
export const STAFF_OFFER_CODE = "STAFFOFFER";

// Every fetched price basis that takes part in lowest-price selection.
export const PRICE_CODES = [STAFF_OFFER_CODE, ...ORION_PRICE_CODES];

export const PRICE_CODE_LABELS = {
  STAFFOFFER: "Staff Offer",
  TRADE: "Trade Price",
  RTLRRP: "Retail Price",
  ONLINE: "Online Price",
  MANUAL: "Manual / Offer Price",
};
