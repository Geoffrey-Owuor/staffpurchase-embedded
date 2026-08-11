import { basePath } from "@/public/assets";
import { buildPurchaseQueryParams } from "./buildPurchaseQueryParams";

// filters: { page, pageSize, search, referenceNumber, payrollNumber, paymentTerms, monthPeriod, requestClosure }
// Returns only fully-approved purchases (the Payment Tracking / Invoicing view).
// biApproval is always forced true - Payment Tracking always operates on the fully-approved set.
export async function fetchPaymentTrackingPurchases(filters = {}) {
  const params = buildPurchaseQueryParams({ ...filters, biApproval: true });
  const url = `${basePath}/api/tablesdata/purchaseshistorydata?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok)
    throw new Error("Failed to fetch payment tracking purchases");

  return response.json();
}
