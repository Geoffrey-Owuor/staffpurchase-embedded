"use server";

import { withConnection } from "@/lib/db";
import { getCurrentUser } from "@/app/lib/auth";
import { loadAvailableCreditPeriods } from "@/lib/creditPeriods";

// The credit periods a new request may choose right now, plus the live
// extended credit window (or null) - { periods, extension }. Uncached:
// windows are checked against the DB's NOW() (staffposts checks again).
export async function FetchAvailableCreditPeriods() {
  const user = await getCurrentUser();
  if (!user.valid) return { periods: [], extension: null };

  try {
    return await withConnection(loadAvailableCreditPeriods);
  } catch (error) {
    console.error("Error loading available credit periods:", error);
    return { periods: [], extension: null };
  }
}
