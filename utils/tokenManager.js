import "server-only";
import { getErpConfig, MissingConfigError } from "@/lib/serverConfig";

let cachedToken = null;
let tokenExpiry = null;
let tokenRefreshPromise = null;
const API_TIMEOUT = 10000; // 10 seconds timeout for the auth API
// After a failed refresh, return null immediately for a short window rather
// than making every price lookup wait out another 10s timeout against an
// endpoint that's currently unreachable (piles up requests during peaks).
const FAILURE_COOLDOWN = 15000;
let failedUntil = 0;

export async function getAuthToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  if (Date.now() < failedUntil) {
    return null;
  }

  // If a refresh is already in progress, wait for it.
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  // Initiate a new refresh and store the promise (Concurrency Guard)
  tokenRefreshPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const { authUrl, apiKey, tenantType } = getErpConfig();
      const res = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-tenanttype": tenantType,
        },
        body: JSON.stringify({ apiKey }),
        signal: controller.signal, // Apply the timeout signal
      });

      // Clear timeout if the request finished successfully
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Failed to fetch auth token");

      const data = await res.json();

      // Cache new token
      cachedToken = data.token;
      tokenExpiry = Date.now() + 14 * 60 * 1000;

      return cachedToken;
    } catch (error) {
      // Clear timeout if an error occurred before completion
      clearTimeout(timeoutId);

      if (error instanceof MissingConfigError) {
        console.error(error.message);
      } else if (error.name === "AbortError") {
        console.error(
          `Auth token API request timed out after ${API_TIMEOUT / 1000}s.`,
        );
      } else {
        console.error("A network error occurred during token refresh:", error);
      }

      // On failure, ensure the cache is cleared and return null
      cachedToken = null;
      tokenExpiry = null;
      failedUntil = Date.now() + FAILURE_COOLDOWN;
      return null;
    } finally {
      // IMPORTANT: Clear the promise when done, allowing future attempts
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
}
