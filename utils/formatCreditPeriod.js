// Returns the credit period as a positive whole number of months, or null if
// the value isn't one. Guards against Number()'s coercions (null, "", false
// -> 0; true -> 1) as well as NaN, negatives and decimals.
export const parseCreditPeriod = (period) => {
  if (period == null || period === "" || typeof period === "boolean") {
    return null;
  }
  const months = Number(period);
  return Number.isInteger(months) && months > 0 ? months : null;
};

// Display string for a credit period, e.g. "1 month" / "3 months".
export const formatCreditPeriod = (period, fallback = "N/A") => {
  const months = parseCreditPeriod(period);
  if (months === null) return fallback;
  return `${months} ${months === 1 ? "month" : "months"}`;
};

// Payment terms that carry a credit period
export const CREDIT_PAYMENT_TERMS = ["CREDIT", "CASH AND CREDIT"];
export const usesCredit = (paymentTerms) =>
  CREDIT_PAYMENT_TERMS.includes(paymentTerms);
