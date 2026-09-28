"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import ClientPortal from "../Reusables/ClientPortal/ClientPortal";
import { PRICE_CODE_LABELS } from "@/utils/Pricing/priceCodes";

export default function PriceComparisonModal({
  open,
  onClose,
  candidates,
  winnerCode,
  warnings = [],
  pending = false,
  title = "Price Comparison",
}) {
  // Lock page scroll and allow Escape to close while the modal is open
  // (matches ChangeLogModal's behavior).
  useEffect(() => {
    if (!open) return;

    document.documentElement.style.overflow = "hidden";
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.documentElement.style.overflow = "unset";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ClientPortal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto w-full max-w-lg rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-950"
        >
          <div className="mb-3 flex items-start justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              type="button"
              className="cursor-pointer rounded-full bg-gray-100 p-1.5 text-gray-700 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              aria-label="Close price comparison"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {pending && (
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Discounts only apply to the Trade price. Set{" "}
              <span className="font-medium">Item Status</span> and{" "}
              <span className="font-medium">Payment Terms</span> to see which
              price gets auto-selected.
            </p>
          )}

          {warnings.length > 0 && (
            <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
              {warnings.join(" · ")}
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
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
        </motion.div>
      </motion.div>
    </ClientPortal>
  );
}
