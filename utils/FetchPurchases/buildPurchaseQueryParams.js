// Single source of truth for turning a filters object into a query string
// consumed by the purchases/staff-purchases/count-card API routes.
// Only defined, non-empty values are included - callers don't need to
// worry about sending stray `undefined`/`null`/"" params.
export function buildPurchaseQueryParams(filters = {}) {
  const params = new URLSearchParams();

  const entries = {
    page: filters.page,
    pageSize: filters.pageSize,
    search: filters.search,
    referenceNumber: filters.referenceNumber,
    payrollNumber: filters.payrollNumber,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    approvalStatus: filters.approvalStatus,
    paymentTerms: filters.paymentTerms,
    monthPeriod: filters.monthPeriod,
    requestClosure: filters.requestClosure,
    biApproval: filters.biApproval,
  };

  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }

  return params;
}
