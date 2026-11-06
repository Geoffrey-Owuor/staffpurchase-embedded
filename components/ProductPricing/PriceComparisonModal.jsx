"use client";
import { useId } from "react";
import Modal from "../Reusables/Modal/Modal";
import ModalHeader from "@/components/Reusables/Modal/ModalHeader";
import {
  PRICE_CODE_LABELS,
  STAFF_OFFER_CODE,
} from "@/utils/Pricing/priceCodes";

// Full screen on mobile (the table needs the width), a card on desktop.
export default function PriceComparisonModal({
  open,
  onClose,
  candidates,
  winnerCode,
  warnings = [],
  pending = false,
  title = "Price Comparison",
}) {
  const titleId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      mobile="fullscreen"
      className="border-gray-200 bg-gray-50 p-4 shadow-2xl md:max-w-lg md:border dark:border-gray-700 dark:bg-gray-950"
    >
      <ModalHeader
        titleId={titleId}
        title={title}
        onClose={onClose}
        padding={4}
      />

      {pending && (
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Discounts only apply to the Trade price. Set{" "}
          <span className="font-medium">Item Status</span> and{" "}
          <span className="font-medium">Payment Terms</span> to see which price
          gets auto-selected.
        </p>
      )}

      {warnings.length > 0 && (
        <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
          {warnings.join(" · ")}
        </p>
      )}

      <div className="small-scrollbar overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-900">
            <tr>
              {["Basis", "Fetched", "Discount", "Effective"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap text-gray-600 dark:text-gray-300"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {candidates.map((c) => {
              const isWinner = !pending && c.priceCode === winnerCode;
              // Trade's discount depends on Item Status/Payment Terms,
              // which aren't set yet while `pending` — Retail/Online are
              // always 0%, so they're never "pending".
              const discountPending = pending && c.priceCode === "TRADE";
              const isStaffOffer = c.priceCode === STAFF_OFFER_CODE;

              return (
                <tr
                  key={c.priceCode}
                  className={
                    isWinner
                      ? "bg-green-50 font-semibold dark:bg-green-950/40"
                      : ""
                  }
                >
                  <td className="px-3 py-2 text-sm whitespace-nowrap">
                    {PRICE_CODE_LABELS[c.priceCode] || c.priceCode}
                    {isWinner && " ✓"}
                  </td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap">
                    {c.available
                      ? Number(c.basePrice).toFixed(2)
                      : isStaffOffer
                        ? "No active offer"
                        : "Unavailable"}
                  </td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap">
                    {!c.available
                      ? "—"
                      : discountPending
                        ? "Pending"
                        : `${Number(c.appliedDiscountRate).toFixed(2)}%`}
                  </td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap">
                    {!c.available
                      ? "—"
                      : discountPending
                        ? "Pending"
                        : Number(c.effectivePrice).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
