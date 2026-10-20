import { formatWallClock } from "@/utils/Admin/wallClock";

// Shared by the Staff Offers admin pages
export const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:scheme-dark dark:disabled:bg-gray-800";
export const labelClass =
  "mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400";
export const hintClass = "mt-1 text-xs text-gray-500 dark:text-gray-400";
const buttonClass =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
export const neutralButton = `${buttonClass} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800`;
export const primaryButton = `${buttonClass} bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300`;
export const dangerButton = `${buttonClass} border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950`;

const money = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const formatPrice = (value) => `KES ${money.format(value)}`;

export const formatPromoWindow = (promo) =>
  `${formatWallClock(promo.startsAt)} → ${formatWallClock(promo.endsAt)}`;

// Dates only, for narrow table cells: "19 Oct – 19 Nov 2026", or with both
// years when they differ
const shortDate = (value) => formatWallClock(value).split(",")[0];
export function formatPromoDates(promo) {
  const start = shortDate(promo.startsAt);
  const end = shortDate(promo.endsAt);
  const sameYear = promo.startsAt.slice(0, 4) === promo.endsAt.slice(0, 4);
  return `${sameYear ? start.replace(/ \d{4}$/, "") : start} – ${end}`;
}

export const plural = (count, word) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

// The text for a 409 `overlap` refusal's confirmation dialog
export function overlapMessage({ message, overlaps }) {
  const listed = overlaps.sample
    .map((o) => `${o.productCode} (${o.promoName})`)
    .join(", ");
  const more = overlaps.count - overlaps.sample.length;
  return `${message} ${listed}${more > 0 ? ` and ${more} more` : ""}. Continue anyway?`;
}

// Every query a promo change can affect
export function invalidatePromoQueries(queryClient) {
  for (const key of [
    "adminPromos",
    "adminPromo",
    "adminPromoProducts",
    "adminAuditLog",
  ]) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}
