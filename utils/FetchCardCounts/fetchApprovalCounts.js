import { basePath } from "@/public/assets";
import { buildPurchaseQueryParams } from "@/utils/FetchPurchases/buildPurchaseQueryParams";

export const defaultCounts = {
  pending: 0,
  declined: 0,
  approved: 0,
  total: 0,
  totalDeclined: 0,
  totalApproved: 0,
};

// filters: the same non-pagination filters applied to the sibling table
// (search, referenceNumber, payrollNumber, fromDate/toDate, paymentTerms).
// pending/declined/approved recompute against these; total/totalApproved/totalDeclined stay global.
export async function fetchApprovalCounts(filters = {}) {
  try {
    const params = buildPurchaseQueryParams(filters);
    const response = await fetch(
      `${basePath}/api/approval-counts?${params.toString()}`,
    );
    if (!response.ok) throw new Error("Failed to fetch approval counts");

    const data = await response.json();

    return {
      pending: data.pending || 0,
      declined: data.declined || 0,
      approved: data.approved || 0,
      total: data.total || 0,
      totalDeclined: data.totalDeclined || 0,
      totalApproved: data.totalApproved || 0,
    };
  } catch (error) {
    console.error("Error fetching approval counts:", error);
    return defaultCounts;
  }
}
