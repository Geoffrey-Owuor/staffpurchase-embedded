import { basePath } from "@/public/assets";
import { buildPurchaseQueryParams } from "./buildPurchaseQueryParams";

// filters: { page, pageSize, search, referenceNumber, payrollNumber, fromDate, toDate, approvalStatus, paymentTerms }
// Returns the server envelope: { data, page, pageSize, total, totalPages }
export async function fetchApproverPurchases(filters = {}) {
  const params = buildPurchaseQueryParams(filters);
  const url = `${basePath}/api/tablesdata/purchaseshistorydata?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch purchases");

  return response.json();
}
