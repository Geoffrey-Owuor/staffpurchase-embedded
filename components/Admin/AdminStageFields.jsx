"use client";
import Select from "../Reusables/Select";
import PresetCommentField from "../Reusables/PresetCommentField";
import { TableApprovalStatus } from "../Reusables/TableApprovalStatus";
import { APPROVAL_STAGES } from "@/utils/Approvals/approvalStages";
import {
  EMPLOYMENT_STATUS_OPTIONS,
  HR_COMMENT_OPTIONS,
  ONE_THIRD_RULE_OPTIONS,
  PROBATION_OPTIONS,
  PURCHASE_HISTORY_COMMENT_OPTIONS,
} from "@/utils/Approvals/stageFieldOptions";
import { formatDateLong } from "@/public/assets";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white";
const labelClass =
  "mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400";

// The data each approval stage recorded, editable by admin. Approval
// statuses and sign-offs are shown read-only - they only change by
// reopening (see AdminEditPurchase).
export default function AdminStageFields({ purchase, values, onChange }) {
  const handleChange = (e) => onChange(e.target.name, e.target.value);
  const select = (name, options, placeholder = "Select") => (
    <Select
      id={`admin-${name}`}
      value={values[name] ?? ""}
      onChange={(value) => onChange(name, value)}
      options={options}
      placeholder={placeholder}
      className="w-full"
    />
  );
  const text = (name, type = "text") => (
    <input
      id={`admin-${name}`}
      name={name}
      type={type}
      step={type === "number" ? "0.01" : undefined}
      value={values[name] ?? ""}
      onChange={handleChange}
      className={inputClass}
    />
  );
  const textarea = (name) => (
    <textarea
      id={`admin-${name}`}
      name={name}
      rows={3}
      value={values[name] ?? ""}
      onChange={handleChange}
      className={inputClass}
    />
  );

  const fieldsByStage = {
    payroll: (
      <div className="md:col-span-2">
        <PresetCommentField
          id="one_third_rule"
          label="1/3 Rule"
          value={values.one_third_rule}
          options={ONE_THIRD_RULE_OPTIONS}
          handleChange={handleChange}
        />
      </div>
    ),
    hr: (
      <>
        <div>
          <label htmlFor="admin-is_employed" className={labelClass}>
            Employment Status
          </label>
          {select("is_employed", EMPLOYMENT_STATUS_OPTIONS)}
        </div>
        <div>
          <label htmlFor="admin-on_probation" className={labelClass}>
            On Probation
          </label>
          {select("on_probation", PROBATION_OPTIONS)}
        </div>
        <div className="md:col-span-2">
          <PresetCommentField
            id="hr_comments"
            label="HR Comments"
            value={values.hr_comments}
            options={HR_COMMENT_OPTIONS}
            handleChange={handleChange}
          />
        </div>
      </>
    ),
    cc: (
      <>
        <div className="md:col-span-2">
          <label htmlFor="admin-credit_period" className={labelClass}>
            Credit Period Given & Mode of Payments
          </label>
          {textarea("credit_period")}
        </div>
        <div className="md:col-span-2">
          <PresetCommentField
            id="purchase_history_comments"
            label="Purchase History Comments"
            value={values.purchase_history_comments}
            options={PURCHASE_HISTORY_COMMENT_OPTIONS}
            handleChange={handleChange}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="admin-pending_invoices" className={labelClass}>
            Pending Invoices
          </label>
          {text("pending_invoices")}
        </div>
      </>
    ),
    bi: (
      <>
        <div>
          <label htmlFor="admin-invoice_date" className={labelClass}>
            Date of Invoice
          </label>
          {text("invoice_date", "date")}
        </div>
        <div>
          <label htmlFor="admin-invoice_number" className={labelClass}>
            Invoice Number
          </label>
          {text("invoice_number")}
        </div>
        <div>
          <label htmlFor="admin-invoice_amount" className={labelClass}>
            Invoice Amount
          </label>
          {text("invoice_amount", "number")}
        </div>
        <div className="md:col-span-2">
          <label htmlFor="admin-payment_reference" className={labelClass}>
            Payment Reference
          </label>
          {textarea("payment_reference")}
        </div>
      </>
    ),
  };

  return (
    <div className="space-y-4 px-2">
      {APPROVAL_STAGES.map((stage) => {
        const approverName = purchase[`${stage.prefix}_approver_name`];
        const approvalDate = purchase[`${stage.prefix}_approval_date`];
        return (
          <section
            key={stage.key}
            className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {stage.label}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {approverName && (
                  <span>
                    {approverName}
                    {approvalDate ? ` · ${formatDateLong(approvalDate)}` : ""}
                  </span>
                )}
                <TableApprovalStatus
                  status={purchase[stage.approvalField] || "pending"}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {fieldsByStage[stage.key]}
            </div>
          </section>
        );
      })}
    </div>
  );
}
