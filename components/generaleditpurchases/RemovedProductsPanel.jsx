import { Undo2 } from "lucide-react";
import FormAsterisk from "../Reusables/FormAsterisk/FormAsterisk";
import { REASON_MAX_LENGTH } from "@/utils/Admin/adminConstants";

// CC edit page: the products CC removed in this edit (as recorded at
// submission), each with Undo, plus the required reason. Nothing is removed
// until the form is saved; api/generaleditpurchases audits the removal and
// emails the requester.
export default function RemovedProductsPanel({
  removedProducts,
  onRestore,
  reason,
  onReasonChange,
  isDeclining,
}) {
  if (removedProducts.length === 0) return null;

  return (
    <div className="mx-2 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        Removing {removedProducts.length}{" "}
        {removedProducts.length === 1 ? "product" : "products"}
      </h3>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
        Removed when you save. The requester is emailed the removed items and
        your reason, and the removal is kept in the audit log.
      </p>

      <ul className="mt-3 divide-y divide-red-200 dark:divide-red-900">
        {removedProducts.map((product) => (
          <li
            key={product.id}
            className="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <span className="min-w-0 text-gray-900 dark:text-white">
              <span className="font-semibold">{product.productCode}</span>
              <span className="block truncate text-gray-600 dark:text-gray-400">
                {product.itemName} · Ksh{" "}
                {(parseFloat(product.discountedValue) || 0).toFixed(2)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onRestore(product.id)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-red-100 dark:text-gray-300 dark:hover:bg-red-900/50"
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </button>
          </li>
        ))}
      </ul>

      {isDeclining && (
        <p className="mt-3 rounded-lg bg-amber-100 p-2 text-xs dark:bg-amber-950">
          Products can't be removed from a request you're declining. Undo the
          removals or change your approval decision.
        </p>
      )}

      <label
        htmlFor="productRemovalReason"
        className="mt-3 mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
      >
        Reason for removing <FormAsterisk />
      </label>
      <textarea
        id="productRemovalReason"
        rows={3}
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        maxLength={REASON_MAX_LENGTH}
        required
        placeholder="e.g. Item out of stock, requester asked to drop it..."
        className="w-full rounded-xl border border-gray-300 bg-white px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
      />
    </div>
  );
}
