// The approval chain, in order (payroll -> hr -> cc -> bi), with each stage's
// purchasesinfo columns. Used by the admin request editor (client + API) for
// the stage data fields and "reopen from stage X". The per-role approval
// rules themselves still live in generaleditpurchases/purchaseshistorydata/
// approval-counts - see CLAUDE.md "Business rules".
export const APPROVAL_STAGES = [
  {
    key: "payroll",
    label: "Payroll",
    approvalField: "Payroll_Approval",
    prefix: "payroll",
    dataFields: ["one_third_rule"],
  },
  {
    key: "hr",
    label: "HR",
    approvalField: "HR_Approval",
    prefix: "hr",
    dataFields: ["is_employed", "on_probation", "hr_comments"],
  },
  {
    key: "cc",
    label: "Credit Control",
    approvalField: "CC_Approval",
    prefix: "cc",
    dataFields: [
      "credit_period",
      "purchase_history_comments",
      "pending_invoices",
    ],
  },
  {
    key: "bi",
    label: "Billing & Invoicing",
    approvalField: "BI_Approval",
    prefix: "bi",
    dataFields: [
      "invoice_date",
      "invoice_number",
      "invoice_amount",
      "payment_reference",
    ],
  },
];

// The approver columns a stage's sign-off writes (cleared when reopened).
export const approverColumns = (prefix) => [
  `${prefix}_approver_name`,
  `${prefix}_approver_email`,
  `${prefix}_approver_id`,
  `${prefix}_signature`,
  `${prefix}_approval_date`,
];

// Stages from `stageKey` to the end of the chain - what reopening resets.
export function stagesFrom(stageKey) {
  const index = APPROVAL_STAGES.findIndex((stage) => stage.key === stageKey);
  return index === -1 ? [] : APPROVAL_STAGES.slice(index);
}
