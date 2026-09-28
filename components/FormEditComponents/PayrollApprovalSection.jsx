import FormAsterisk from "../Reusables/FormAsterisk/FormAsterisk";
import PresetCommentField from "../Reusables/PresetCommentField";
import Select from "../Reusables/Select";
import { formatDateLong } from "@/public/assets";

const APPROVAL_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

// Placeholder options - value is the label text itself, so the view page,
// PDF, export and emails display it as-is.
const ONE_THIRD_RULE_OPTIONS = [
  { value: "1/3 Rule Met", label: "1/3 Rule Met" },
  { value: "1/3 Rule Not Met", label: "1/3 Rule Not Met" },
];

export default function PayrollApprovalSection({
  formData,
  userRole,
  handleChange,
}) {
  const isReadOnly = userRole !== "payroll";
  return (
    <div className="rounded-xl">
      <div className="px-2 py-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Payroll Approval
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-6 px-2 py-4 md:grid-cols-2">
        {/* Third Rule Assessment */}
        <div className="md:col-span-2">
          <PresetCommentField
            id="one_third_rule"
            label="1/3 Rule Assessment"
            value={formData.one_third_rule}
            options={ONE_THIRD_RULE_OPTIONS}
            handleChange={handleChange}
            readOnly={isReadOnly}
            selectPlaceholder="Select 1/3 rule assessment"
            textPlaceholder="Enter 1/3 rule compliance assessment"
          />
        </div>

        {/* Payroll Approver Name */}
        <div>
          <label
            htmlFor="payroll_approver_name"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            Payroll Approver Name <FormAsterisk />
          </label>
          <input
            type="text"
            id="payroll_approver_name"
            name="payroll_approver_name"
            value={formData.payroll_approver_name}
            onChange={handleChange}
            readOnly={isReadOnly}
            required
            className={`w-full rounded-xl border border-gray-300 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${
              isReadOnly
                ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                : "bg-white dark:bg-gray-950"
            }`}
            placeholder="Enter Payroll approver name"
          />
        </div>

        {/* Approval Status */}
        <div>
          <label
            htmlFor="Payroll_Approval"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            Approval Status <FormAsterisk />
          </label>
          <Select
            id="Payroll_Approval"
            name="Payroll_Approval"
            value={formData.Payroll_Approval || ""}
            onChange={(value) =>
              handleChange({ target: { name: "Payroll_Approval", value } })
            }
            options={APPROVAL_STATUS_OPTIONS}
            className="w-full"
            disabled={isReadOnly}
            required
          />
        </div>

        {/* Approval Date */}
        <div>
          <label
            htmlFor="payroll_approval_date"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            Payroll Approval Date
          </label>
          <input
            type="text"
            id="payroll_approval_date"
            name="payroll_approval_date"
            value={formatDateLong(formData.payroll_approval_date)}
            onChange={handleChange}
            readOnly
            className="w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 px-2 py-[11px] text-sm text-gray-500 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          />
        </div>
      </div>
    </div>
  );
}
