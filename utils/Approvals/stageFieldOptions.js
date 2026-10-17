// Option lists for the approval stage fields, shared by the approver edit
// sections (components/FormEditComponents) and the admin request editor.
// Comment presets use the label text itself as the value, so the view page,
// PDF, export and emails display it as-is.

export const APPROVAL_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

export const ONE_THIRD_RULE_OPTIONS = [
  { value: "1/3 Rule Met", label: "1/3 Rule Met" },
  { value: "1/3 Rule Not Met", label: "1/3 Rule Not Met" },
];

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "contract", label: "Contract" },
  { value: "permanent", label: "Permanent" },
];

export const PROBATION_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const HR_COMMENT_OPTIONS = [
  { value: "Purchase Request Approved", label: "Purchase Request Approved" },
  { value: "Purchase Request Declined", label: "Purchase Request Declined" },
];

export const PURCHASE_HISTORY_COMMENT_OPTIONS = [
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
