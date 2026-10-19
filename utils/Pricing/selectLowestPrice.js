import { PRICE_CODES } from "./priceCodes";

// Picks the cheapest effective price among the fetched prices (the three
// Orion prices plus an active Staff Offer, when there is one).
//
// TRADE is the only basis discount policies apply to; STAFFOFFER (already
// discounted), RTLRRP and ONLINE are always taken at 0% discount. A price of null/undefined/0/negative is
// treated as "unavailable" (e.g. the Orion fetch failed for that code and
// fell back to 0.00) and is excluded from the comparison so a failed fetch
// can never accidentally "win" as the cheapest option.
//
// Tie-break order when effective prices are equal:
// STAFFOFFER > TRADE > RTLRRP > ONLINE (PRICE_CODES order).
const TIE_BREAK_ORDER = PRICE_CODES;

const isUsablePrice = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export function selectLowestPrice({ prices, discountRate }) {
  const rate = Number.isFinite(parseFloat(discountRate))
    ? parseFloat(discountRate)
    : 0;

  const candidates = TIE_BREAK_ORDER.map((code) => {
    const rawPrice = prices?.[code];
    const available = isUsablePrice(rawPrice);
    const appliedDiscountRate = code === "TRADE" ? rate : 0;
    const effectivePrice = available
      ? code === "TRADE"
        ? rawPrice * (1 - appliedDiscountRate / 100)
        : rawPrice
      : null;

    return {
      priceCode: code,
      basePrice: available ? rawPrice : null,
      appliedDiscountRate,
      effectivePrice,
      available,
    };
  });

  const usableCandidates = candidates.filter((c) => c.available);

  if (usableCandidates.length === 0) {
    return { winner: null, candidates };
  }

  const winner = usableCandidates.reduce((lowest, candidate) =>
    candidate.effectivePrice < lowest.effectivePrice ? candidate : lowest,
  );

  return { winner, candidates };
}
