import { formatDateLong } from "@/public/assets";
import FormAsterisk from "../Reusables/FormAsterisk/FormAsterisk";
import Select from "../Reusables/Select";

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "contract", label: "Contract" },
  { value: "permanent", label: "Permanent" },
];

const PROBATION_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const APPROVAL_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

export default function HRApprovalSection({
  formData,
  handleChange,
  userRole,
}) {
  const isReadOnly = userRole !== "hr";

  return (
    <div className="rounded-xl">
      <div className="px-2 py-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          HR Approval
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-6 px-2 py-4 md:grid-cols-2">
        {/* Employment Status */}
        <div>
          <label
            htmlFor="is_employed"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            Employment Status <FormAsterisk />
          </label>
          <Select
            id="is_employed"
            name="is_employed"
            value={formData.is_employed || ""}
            onChange={(value) =>
              handleChange({ target: { name: "is_employed", value } })
            }
            options={EMPLOYMENT_STATUS_OPTIONS}
            placeholder="Select status"
            className="w-full"
            disabled={isReadOnly}
            required
          />
        </div>

        {/* Probation */}
        <div>
          <label
            htmlFor="on_probation"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            Probation? <FormAsterisk />
          </label>
          <Select
            id="on_probation"
            name="on_probation"
            value={formData.on_probation || ""}
            onChange={(value) =>
              handleChange({ target: { name: "on_probation", value } })
            }
            options={PROBATION_OPTIONS}
            placeholder="Select status"
            className="w-full"
            disabled={isReadOnly}
            required
          />
        </div>

        {/* Approval Status */}
        <div>
          <label
            htmlFor="HR_Approval"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            Approval Status <FormAsterisk />
          </label>
          <Select
            id="HR_Approval"
            name="HR_Approval"
            value={formData.HR_Approval || ""}
            onChange={(value) =>
              handleChange({ target: { name: "HR_Approval", value } })
            }
            options={APPROVAL_STATUS_OPTIONS}
            className="w-full"
            disabled={isReadOnly}
            required
          />
        </div>

        {/* Approver Name */}
        <div>
          <label
            htmlFor="hr_approver_name"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            HR Approver Name <FormAsterisk />
          </label>
          <input
            type="text"
            id="hr_approver_name"
            name="hr_approver_name"
            value={formData.hr_approver_name}
            onChange={handleChange}
            readOnly={isReadOnly}
            required
            className={`w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${
              isReadOnly
                ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                : "bg-white dark:bg-gray-950"
            }`}
            placeholder="Enter HR approver name"
          />
        </div>

        {/* Approval Date */}
        <div>
          <label
            htmlFor="hr_approval_date"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            HR Approval Date
          </label>
          <input
            type="text"
            id="hr_approval_date"
            name="hr_approval_date"
            value={formatDateLong(formData.hr_approval_date)}
            onChange={handleChange}
            readOnly
            className="w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          />
        </div>

        {/* Comments */}
        <div className="md:col-span-2">
          <label
            htmlFor="hr_comments"
            className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-400"
          >
            HR Comments <FormAsterisk />
          </label>
          <textarea
            id="hr_comments"
            name="hr_comments"
            rows={3}
            value={formData.hr_comments}
            onChange={handleChange}
            readOnly={isReadOnly}
            required
            className={`w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${
              isReadOnly
                ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                : "bg-white dark:bg-gray-950"
            }`}
            placeholder="Enter HR comments"
          />
        </div>
      </div>
    </div>
  );
}
