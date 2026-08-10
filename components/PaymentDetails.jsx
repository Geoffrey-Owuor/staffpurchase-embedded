"use client";
import FormAsterisk from "./Reusables/FormAsterisk/FormAsterisk";
import Select from "./Reusables/Select";
import { formatDateLong } from "@/public/assets";

const LOCATION_OPTIONS = [
  { value: "SARIT", label: "Sarit" },
  { value: "RUIRU", label: "Ruiru" },
  { value: "GCS", label: "Garden City" },
  { value: "IMAARA", label: "Imaara" },
  { value: "KAREN", label: "Karen" },
  { value: "RIARA", label: "Riara" },
  { value: "KISUMU", label: "Kisumu" },
  { value: "ELDORET", label: "Eldoret" },
  { value: "NYALI", label: "Nyali" },
  { value: "LIKONI", label: "Likoni" },
  { value: "CBD", label: "CBD" },
  { value: "YAYA", label: "Yaya" },
  { value: "VILLAGE", label: "Village Market" },
  { value: "GALLERIA", label: "Galleria" },
  { value: "DIANI", label: "Diani" },
  { value: "OTHER", label: "Other(Specify in other details section)" },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: "CREDIT", label: "Credit" },
  { value: "CASH", label: "Cash" },
  { value: "CASH AND CREDIT", label: "Cash & Credit" },
];

const PaymentDetails = ({
  formData,
  handleChange,
  userRole,
  periods,
  approversPurchasing,
}) => {
  const editableRoles = ["bi", "staff"];
  const editCodeRoles = ["cc", "staff"];
  const staffReadonly = userRole !== "staff" && !approversPurchasing;
  const isReadOnly = !editableRoles.includes(userRole) && !approversPurchasing;
  const isCodeReadonly =
    !editCodeRoles.includes(userRole) && !approversPurchasing;
  return (
    <div className="relative rounded-xl">
      <div className="rounded-t-xl px-2 py-3 text-lg font-semibold text-gray-900 dark:text-white">
        Payment & Invoicing Details
      </div>
      <div className="space-y-6 px-2 py-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Invoicing Location */}
          <div>
            <label
              htmlFor="invoicing_location"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
            >
              Invoicing Location <FormAsterisk />
            </label>
            <Select
              id="invoicing_location"
              name="invoicing_location"
              value={formData.invoicing_location || ""}
              onChange={(value) =>
                handleChange({ target: { name: "invoicing_location", value } })
              }
              options={LOCATION_OPTIONS}
              placeholder="Select a location"
              className="w-full"
              required
              disabled={isReadOnly}
            />
          </div>

          {/* Payment Terms & Options */}
          <div>
            <label
              htmlFor="employee_payment_terms"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
            >
              Payment Terms/Options <FormAsterisk />
            </label>
            <Select
              id="employee_payment_terms"
              name="employee_payment_terms"
              value={formData.employee_payment_terms || ""}
              onChange={(value) =>
                handleChange({
                  target: { name: "employee_payment_terms", value },
                })
              }
              options={PAYMENT_TERMS_OPTIONS}
              placeholder="Select a payment option"
              className="w-full"
              required
              disabled={staffReadonly}
            />
          </div>

          {/* Conditional mpesa-reference code */}
          {(formData.employee_payment_terms === "CASH" ||
            formData.employee_payment_terms === "CASH AND CREDIT") && (
            <div>
              <label
                htmlFor="mpesa_code"
                className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
              >
                Mpesa code <FormAsterisk />
              </label>
              <input
                type="text"
                id="mpesa_code"
                name="mpesa_code"
                value={formData.mpesa_code}
                onChange={handleChange}
                readOnly={isCodeReadonly}
                maxLength={25}
                placeholder="Enter Mpesa reference code"
                required
                className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${isCodeReadonly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
              />
            </div>
          )}

          {/* Conditional Credit Period */}
          {(formData.employee_payment_terms === "CREDIT" ||
            formData.employee_payment_terms === "CASH AND CREDIT") && (
            <div>
              <label
                htmlFor="user_credit_period"
                className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
              >
                Credit Period <FormAsterisk />
              </label>
              <Select
                id="user_credit_period"
                name="user_credit_period"
                value={formData.user_credit_period || ""}
                onChange={(value) =>
                  handleChange({
                    target: { name: "user_credit_period", value },
                  })
                }
                options={periods.map((period) => ({
                  value: period.period_value,
                  label: period.period_description,
                }))}
                placeholder="Select period"
                className="w-full"
                required
                disabled={staffReadonly}
              />
            </div>
          )}

          {/* Date the purchase was submitted */}
          <div>
            <label
              htmlFor="createdAt"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
            >
              Date Submitted
            </label>
            <input
              type="text"
              id="createdAt"
              name="createdAt"
              value={formatDateLong(formData.createdAt)}
              onChange={handleChange}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 px-2 py-[11px] text-sm text-gray-500 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            />
          </div>
        </div>
        <div className="grid grid-cols-1">
          {/* Delivery Details */}
          <div>
            <label
              htmlFor="delivery_details"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
            >
              Other Details <FormAsterisk />
            </label>
            <textarea
              id="delivery_details"
              name="delivery_details"
              value={formData.delivery_details || ""}
              onChange={handleChange}
              rows="4" //Text Area Height
              className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${
                staffReadonly
                  ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                  : "bg-white dark:bg-gray-950"
              }`}
              required
              disabled={staffReadonly}
              placeholder="Enter other details applicable to this purchase request e.g., delivery/pickup details..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;
