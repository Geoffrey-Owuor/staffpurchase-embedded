"use client";
import { useState } from "react";
import { PRICE_CODE_LABELS } from "@/utils/Pricing/priceCodes";
import PriceComparisonModal from "./PriceComparisonModal";

// Inline trigger (note text + "Compare" button) for the price comparison
// modal. Available as soon as there's at least one usable fetched/stored
// price — including before Item Status/Payment Terms are chosen, since a
// user may just want to check prices without filling in the rest of the
// form yet (`pending` covers that case).
export default function PriceComparisonPanel({
  candidates,
  winnerCode,
  warnings = [],
  pending = false,
  title,
}) {
  const [open, setOpen] = useState(false);

  const hasAnyCandidate = candidates.some((c) => c.available);
  if (!hasAnyCandidate) return null;

  const winnerCandidate = candidates.find((c) => c.priceCode === winnerCode);

  let noteText;
  if (pending) {
    noteText = "3 prices fetched.";
  } else if (winnerCandidate) {
    noteText =
      winnerCode === "TRADE" && winnerCandidate.appliedDiscountRate > 0
        ? `Trade price after ${Number(winnerCandidate.appliedDiscountRate).toFixed(2)}% discount - lowest of the fetched prices.`
        : `${PRICE_CODE_LABELS[winnerCode] || winnerCode} - lowest of the fetched prices.`;
  } else if (winnerCode === "MANUAL") {
    noteText = "Price manually set by Credit Control.";
  } else {
    noteText = "3 prices fetched.";
  }

  return (
    <>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {noteText}{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-semibold text-gray-700 underline underline-offset-2 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          Compare
        </button>
      </p>

      <PriceComparisonModal
        open={open}
        onClose={() => setOpen(false)}
        candidates={candidates}
        winnerCode={winnerCode}
        warnings={warnings}
        pending={pending}
        title={title}
      />
    </>
  );
}
