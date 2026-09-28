// Single source of truth for Orion price codes used across the pricing fetch,
// selection, and display logic.
export const PRICE_CODES = ["TRADE", "RTLRRP", "ONLINE"];

export const PRICE_CODE_LABELS = {
  TRADE: "Trade Price",
  RTLRRP: "Retail Price",
  ONLINE: "Online Price",
  MANUAL: "Manual / Offer Price",
};
