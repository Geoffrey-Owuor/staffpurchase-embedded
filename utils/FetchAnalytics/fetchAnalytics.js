import { basePath } from "@/utils/basePath";

// filters: { fromDate, toDate, status } - see api/analytics
export async function fetchAnalytics(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const response = await fetch(`${basePath}/api/analytics?${params}`);
  if (!response.ok) throw new Error("Failed to load analytics");
  return response.json();
}
