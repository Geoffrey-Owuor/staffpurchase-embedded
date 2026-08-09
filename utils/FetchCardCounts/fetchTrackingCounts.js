import { basePath } from "@/public/assets";
import { buildPurchaseQueryParams } from "@/utils/FetchPurchases/buildPurchaseQueryParams";

export const defaultClosureCounts = {
  open: 0,
  closed: 0,
  approved: 0,
};

// filters: the same non-pagination filters applied to Payment Tracking's table
// (search, referenceNumber, payrollNumber, fromDate/toDate, paymentTerms, monthPeriod).
// requestClosure is intentionally not sent - see closure-counts/route.js.
export async function fetchTrackingCounts(filters = {}) {
  try {
    const params = buildPurchaseQueryParams(filters);
    const response = await fetch(
      `${basePath}/api/closure-counts?${params.toString()}`,
    );
    if (!response.ok) throw new Error("Failed to fetch closure counts");

    const data = await response.json();

    return {
      open: data.open || 0,
      closed: data.closed || 0,
      approved: data.approved || 0,
    };
  } catch (error) {
    console.error("Error fetching approval counts:", error);
    return defaultClosureCounts;
  }
}
