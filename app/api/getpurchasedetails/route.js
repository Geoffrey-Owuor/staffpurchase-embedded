import { getAuthToken } from "@/utils/tokenManager";
import { requireAuth } from "@/lib/apiAuth";
import { unstable_cache } from "next/cache";
import { withConnection } from "@/lib/db";
import { getActiveStaffOffer } from "@/lib/staffOffers";
import { createLimiter } from "@/utils/createLimiter";
import {
  ORION_PRICE_CODES,
  PRICE_CODE_LABELS,
} from "@/utils/Pricing/priceCodes";

// Set a timeout constant for resilience (e.g., 15 seconds)
const API_TIMEOUT = 15000;

// Each lookup is 3 Orion calls; during peaks many users look up at once from
// every PM2 worker. Cap concurrent calls per worker so the ngrok-fronted ERP
// (and our uplink) isn't flooded - extra calls queue briefly instead.
const orionLimit = createLimiter(6);

// Thrown from inside the cached function for transient failures (timeout,
// network, non-2xx, no token) so unstable_cache does NOT store them - only
// real answers (a price, or "no such item") are cached. Otherwise a single
// timeout would be served back to everyone for the full revalidate window.
class TransientPriceError extends Error {
  constructor(message, { timedOut = false } = {}) {
    super(message);
    this.timedOut = timedOut;
  }
}

async function fetchOrionPrice(productCode, priceCode, formattedDate) {
  const token = await getAuthToken();
  if (!token) {
    // Auth endpoint is down (tokenManager logs it) - don't send 3 doomed
    // requests that would each wait out the full timeout.
    throw new TransientPriceError("Orion auth token unavailable");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const res = await fetch(
      "https://hotpointapi.ngrok.dev/oneerpreport/api/getapi",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          APICODE: "PRICEAPIHP",
          M_USER_ID: "SYSADMIN",
          M_LANG_CODE: "ENG",
          M_COMP_CODE: "001",
          filter: {
            P_DT: formattedDate,
            P_PL_CODE: `%${priceCode}%`, // Should be PL code
            P_INCLUSIVE: "I",
            P_ITEM_CODE: productCode,
            P_COMP_CODE: "HAL",
          },
        }),
        signal: controller.signal, // Attaches the timeout controller
      },
    );

    if (!res.ok) {
      throw new TransientPriceError(
        `External API returned status: ${res.status} for price code ${priceCode}`,
      );
    }

    const data = await res.json();

    if (Array.isArray(data) && data.length > 0 && data[0].PRICE) {
      return {
        ok: true,
        itemName: data[0].PRICE.ITM_NAME,
        price: data[0].PRICE.RATE,
      };
    }

    // A genuine "not on this price list" answer - safe to cache.
    return { ok: false };
  } catch (error) {
    if (error instanceof TransientPriceError) throw error;
    if (error.name === "AbortError") {
      throw new TransientPriceError(
        `Price API request for ${priceCode} timed out after ${API_TIMEOUT / 1000}s.`,
        { timedOut: true },
      );
    }
    const code = error.cause?.code ? ` (${error.cause.code})` : "";
    throw new TransientPriceError(
      `Price api error for ${priceCode}: ${error.message}${code}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fetches a single Orion price list code for a product code, cached per
// (productCode, priceCode, date) since Orion prices are date-scoped via
// P_DT. Caching matters here because the client now debounce-fetches as the
// user types, multiplying request volume against the ngrok-fronted ERP.
// The limiter wraps only the upstream call, so cache hits never queue.
const getCachedOrionPrice = unstable_cache(
  (productCode, priceCode, formattedDate) =>
    orionLimit(() => fetchOrionPrice(productCode, priceCode, formattedDate)),
  ["orion-price"],
  { revalidate: 300 },
);

// unstable_cache doesn't merge concurrent misses, so several users looking
// up the same (uncached) code at once would each hit Orion. Share one
// in-flight promise per key within this worker instead.
const inFlight = new Map();

function getOrionPrice(productCode, priceCode, formattedDate) {
  const key = `${productCode}|${priceCode}|${formattedDate}`;
  let promise = inFlight.get(key);
  if (!promise) {
    promise = getCachedOrionPrice(productCode, priceCode, formattedDate)
      .catch((error) => {
        if (!(error instanceof TransientPriceError)) {
          console.error(`Price api error for ${priceCode}:`, error);
          return { ok: false, transient: true, timedOut: false };
        }
        console.error(error.message);
        return { ok: false, transient: true, timedOut: error.timedOut };
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
  }
  return promise;
}

export const POST = requireAuth(async (request) => {
  // Getting the current date
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const formattedDate = `${day}-${month}-${year}`;

  // The client debounces + aborts in-flight fetches as the user types
  // (useOrionPrices.js), so an occasional request here corresponds to an
  // already-abandoned client request with an empty/truncated body -
  // request.json() throws SyntaxError on that rather than a real client
  // error, so it's handled separately from actual malformed input.
  let rawProductCode;
  try {
    ({ productCode: rawProductCode } = await request.json());
  } catch {
    return Response.json({ message: "Invalid request body" }, { status: 400 });
  }
  const productCode = rawProductCode?.trim();

  if (!productCode) {
    return Response.json(
      { message: "Product code is required" },
      { status: 400 },
    );
  }

  try {
    // Staff Offers are looked up alongside Orion (uncached, see
    // lib/staffOffers.js). A failed lookup only drops the offer from the
    // comparison - it never blocks the Orion prices.
    const staffOfferPromise = withConnection((connection) =>
      getActiveStaffOffer(connection, productCode),
    ).catch((error) => {
      console.error("Staff offer lookup error:", error);
      return null;
    });

    const [results, staffOffer] = await Promise.all([
      Promise.all(
        ORION_PRICE_CODES.map((priceCode) =>
          getOrionPrice(productCode, priceCode, formattedDate).then(
            (result) => ({ priceCode, ...result }),
          ),
        ),
      ),
      staffOfferPromise,
    ]);

    const prices = {};
    const warnings = [];
    let itemName = null;
    let timedOutCount = 0;
    let transientCount = 0;

    for (const result of results) {
      if (result.ok) {
        prices[result.priceCode] = result.price;
        if (!itemName && result.itemName) itemName = result.itemName;
      } else {
        prices[result.priceCode] = null;
        warnings.push(
          `${PRICE_CODE_LABELS[result.priceCode] || result.priceCode} unavailable`,
        );
        if (result.timedOut) timedOutCount += 1;
        if (result.transient) transientCount += 1;
      }
    }

    // Orion is still required (it supplies the item name the discount
    // policy depends on): a Staff Offer alone doesn't make a code priceable.
    const anySuccess = Object.values(prices).some((p) => p != null);

    if (!anySuccess) {
      if (timedOutCount === ORION_PRICE_CODES.length) {
        return Response.json(
          { message: "External API response timeout" },
          { status: 504 },
        );
      }
      // Every lookup failed for a transient reason (network, auth, 5xx) -
      // don't tell the user the product doesn't exist.
      if (transientCount === ORION_PRICE_CODES.length) {
        return Response.json(
          {
            message:
              "The pricing service is temporarily unavailable. Please try again shortly.",
          },
          { status: 503 },
        );
      }
      return Response.json(
        { message: `No product found for the code: ${productCode}` },
        { status: 404 },
      );
    }

    return Response.json({ itemName, prices, staffOffer, warnings });
  } catch (error) {
    console.error("Price api error:", error);
    return Response.json({ message: error.message }, { status: 500 });
  }
});
