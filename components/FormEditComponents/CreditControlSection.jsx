import { useRef, useState } from "react";
import { formatDateLong } from "@/public/assets";
import FormAsterisk from "../Reusables/FormAsterisk/FormAsterisk";
import Select from "../Reusables/Select";

const APPROVAL_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

// Placeholder options - value is the label text itself, so the view page,
// PDF, export and emails display it as-is.
const PURCHASE_HISTORY_COMMENT_OPTIONS = [
  {
    value: "Item not purchased in the last 1 year period",
    label: "Item not purchased in the last 1 year period",
  },
  {
    value: "Same item purchased in the last 1 year period",
    label: "Same item purchased in the last 1 year period",
  },
  {
    value: "Change of mind, staff no longer wants to purchase",
    label: "Change of mind, staff no longer wants to purchase",
  },
];

export default function CreditControlSection({
  formData,
  handleChange,
  userRole,
}) {
  const isReadOnly = userRole !== "cc";

  // Purchase History Comments is a preset dropdown by default, with a toggle
  // to type free text instead. Records already holding a non-preset comment
  // (older free-text records, or a previously typed custom one) open in
  // free-text mode so the full comment stays visible and editable.
  const comment = formData.purchase_history_comments || "";
  const isPresetComment = (value) =>
    PURCHASE_HISTORY_COMMENT_OPTIONS.some((o) => o.value === value);
  const [isCustomComment, setIsCustomComment] = useState(
    () => comment !== "" && !isPresetComment(comment),
  );
  // Remembers typed text across toggles so switching to the list and back
  // doesn't lose it.
  const customDraftRef = useRef(isCustomComment ? comment : "");

  const setComment = (value) =>
    handleChange({ target: { name: "purchase_history_comments", value } });

  const toggleCommentMode = () => {
    if (isCustomComment) {
      customDraftRef.current = comment;
      if (!isPresetComment(comment)) setComment("");
    } else if (customDraftRef.current) {
      setComment(customDraftRef.current);
    }
    setIsCustomComment(!isCustomComment);
  };

  return (
    <div className="rounded-xl">
      <div className="px-2 py-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Credit Control Approval
        </h3>
      </div>
      {userRole === "cc" && (
        <div className="mx-2 rounded-lg bg-amber-100 p-2 dark:bg-amber-950">
          <p className="text-xs">
            <span className="font-semibold">Note: </span>
            Don't forget to check the "Other Details" field for items being
            bought at offer prices
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 px-2 py-4 md:grid-cols-2">
        {/* Full-width text fields */}
        <div className="md:col-span-2">
          <label
            htmlFor="credit_period"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            Credit Period Given & Mode of Payments <FormAsterisk />
          </label>
          <textarea
            id="credit_period"
            name="credit_period"
            rows={4}
            value={formData.credit_period}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={`w-full rounded-xl border border-gray-300 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${isReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
            placeholder="Enter credit period assessment (1-3 paragraphs)"
            required
          />
        </div>

        <div className="md:col-span-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label
              htmlFor="purchase_history_comments"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-400"
            >
              Credit Control Comments <FormAsterisk />
            </label>
            {!isReadOnly && (
              <button
                type="button"
                onClick={toggleCommentMode}
                className="cursor-pointer text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-white"
              >
                {isCustomComment ? "Choose from list" : "Type my own comment"}
              </button>
            )}
          </div>
          {isCustomComment ? (
            <textarea
              id="purchase_history_comments"
              name="purchase_history_comments"
              rows={4}
              value={comment}
              onChange={(e) => {
                customDraftRef.current = e.target.value;
                handleChange(e);
              }}
              readOnly={isReadOnly}
              className={`w-full rounded-xl border border-gray-300 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${isReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
              placeholder="Enter your comments"
              required
            />
          ) : (
            <Select
              id="purchase_history_comments"
              name="purchase_history_comments"
              value={comment}
              onChange={setComment}
              options={PURCHASE_HISTORY_COMMENT_OPTIONS}
              placeholder="Select comment"
              className="w-full"
              disabled={isReadOnly}
              required
            />
          )}
        </div>

        {/* Two-column fields */}
        <div>
          <label
            htmlFor="pending_invoices"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            Pending Invoices/Outstanding Amounts <FormAsterisk />
          </label>
          <input
            type="text"
            id="pending_invoices"
            name="pending_invoices"
            value={formData.pending_invoices}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={`w-full rounded-xl border border-gray-300 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${isReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
            placeholder="Enter pending invoices details"
            required
          />
        </div>

        <div>
          <label
            htmlFor="CC_Approval"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            Approval Status <FormAsterisk />
          </label>
          <Select
            id="CC_Approval"
            name="CC_Approval"
            value={formData.CC_Approval || ""}
            onChange={(value) =>
              handleChange({ target: { name: "CC_Approval", value } })
            }
            options={APPROVAL_STATUS_OPTIONS}
            className="w-full"
            disabled={isReadOnly}
            required
          />
        </div>

        <div>
          <label
            htmlFor="cc_signature"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            Checked By <FormAsterisk />
          </label>
          <input
            type="text"
            id="cc_approver_name"
            name="cc_approver_name"
            value={formData.cc_approver_name}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={`w-full rounded-xl border border-gray-300 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${isReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
            placeholder="Enter verifier's name"
            required
          />
        </div>

        <div>
          <label
            htmlFor="cc_approval_date"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            Credit Approval Date
          </label>
          <input
            type="text"
            id="cc_approval_date"
            name="cc_approval_date"
            value={formatDateLong(formData.cc_approval_date)}
            onChange={handleChange}
            readOnly
            className="w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 px-2 py-[11px] text-sm text-gray-500 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          />
        </div>
      </div>
    </div>
  );
}
