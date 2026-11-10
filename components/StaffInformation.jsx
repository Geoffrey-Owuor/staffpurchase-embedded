import FormAsterisk from "./Reusables/FormAsterisk/FormAsterisk";
import { isRequesterRole } from "@/utils/routes";
import { CONTACT_EMAIL_MAX_LENGTH } from "@/lib/emailValidation";

const StaffInformation = ({
  formData,
  handleChange,
  userRole,
  approversPurchasing,
  contactEmailMode = "readonly", // "new" (New Purchase) | "admin" | "readonly"
}) => {
  const isReadOnly = !isRequesterRole(userRole) && !approversPurchasing;
  const isNewRequest = contactEmailMode === "new";
  const isEmailReadOnly = contactEmailMode === "readonly";
  return (
    <div className="rounded-xl">
      <div className="rounded-t-xl px-2 py-3 text-lg font-semibold text-gray-900 dark:text-white">
        Staff Information
      </div>
      <div className="px-2 py-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <label
              htmlFor="staffName"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
            >
              Staff Name <FormAsterisk />
            </label>
            <input
              type="text"
              id="staffName"
              name="staffName"
              value={formData.staffName}
              onChange={handleChange}
              className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${isReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
              required
              readOnly={isReadOnly}
            />
          </div>

          <div>
            <label
              htmlFor="payrollNo"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
            >
              Payroll No <FormAsterisk />
            </label>
            <input
              type="text"
              id="payrollNo"
              name="payrollNo"
              value={formData.payrollNo}
              onChange={handleChange}
              className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${isReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
              required
              readOnly={isReadOnly}
            />
          </div>

          <div>
            <label
              htmlFor="department"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
            >
              Department <FormAsterisk />
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${isReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
              required
              readOnly={isReadOnly}
            />
          </div>

          <div>
            <label
              htmlFor="user_email"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
            >
              Contact Email {isNewRequest && <FormAsterisk />}
            </label>
            <input
              type="email"
              id="user_email"
              name="user_email"
              value={formData.user_email}
              onChange={handleChange}
              maxLength={CONTACT_EMAIL_MAX_LENGTH}
              aria-describedby={isNewRequest ? "user_email_note" : undefined}
              className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${isEmailReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
              required={isNewRequest}
              readOnly={isEmailReadOnly}
            />
          </div>

          {isNewRequest && (
            <p
              id="user_email_note"
              className="rounded-lg bg-amber-100 p-2 text-xs md:col-span-2 md:self-end dark:bg-amber-950"
            >
              <span className="font-semibold">Please note:</span> We&apos;ll use
              this email to send you insurance information for the products in
              this request, and may share it with our insurance provider for
              that purpose. Use an address you&apos;ll keep if you leave the
              company.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffInformation;
