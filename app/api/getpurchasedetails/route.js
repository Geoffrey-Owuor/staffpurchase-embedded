import { getAuthToken } from "@/utils/tokenManager";
import { requireAuth } from "@/lib/apiAuth";
import { unstable_cache } from "next/cache";
import { PRICE_CODES, PRICE_CODE_LABELS } from "@/utils/Pricing/priceCodes";

// Set a timeout constant for resilience (e.g., 15 seconds)
const API_TIMEOUT = 15000;

// Fetches a single Orion price list code for a product code, cached per
// (productCode, priceCode, date) since Orion prices are date-scoped via
// P_DT. Caching matters here because the client now debounce-fetches as the
// user types, multiplying request volume against the ngrok-fronted ERP.
const getCachedOrionPrice = unstable_cache(
  async (productCode, priceCode, formattedDate) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const token = await getAuthToken();

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
        console.error(
          `External API returned status: ${res.status} for price code ${priceCode}`,
        );
        return { ok: false, timedOut: false };
      }

      const data = await res.json();

      if (Array.isArray(data) && data.length > 0 && data[0].PRICE) {
        return {
          ok: true,
          itemName: data[0].PRICE.ITM_NAME,
          price: data[0].PRICE.RATE,
        };
      }

      return { ok: false, timedOut: false };
    } catch (error) {
      if (error.name === "AbortError") {
        console.error(
          `Price API request for ${priceCode} timed out after 15s.`,
        );
        return { ok: false, timedOut: true };
      }
      console.error(`Price api error for ${priceCode}:`, error);
      return { ok: false, timedOut: false };
    } finally {
      clearTimeout(timeoutId);
    }
  },
  ["orion-price"],
  { revalidate: 300 },
);

export const POST = requireAuth(async (request) => {
  // Getting the current date
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const formattedDate = `${day}-${month}-${year}`;

  const { productCode: rawProductCode } = await request.json();
  const productCode = rawProductCode?.trim();

  if (!productCode) {
    return Response.json(
      { message: "Product code is required" },
      { status: 400 },
    );
  }

  try {
    const results = await Promise.all(
      PRICE_CODES.map((priceCode) =>
        getCachedOrionPrice(productCode, priceCode, formattedDate).then(
          (result) => ({ priceCode, ...result }),
        ),
      ),
    );

    const prices = {};
    const warnings = [];
    let itemName = null;
    let timedOutCount = 0;

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
      }
    }

    const anySuccess = Object.values(prices).some((p) => p != null);

    if (!anySuccess) {
      if (timedOutCount === PRICE_CODES.length) {
        return Response.json(
          { message: "External API response timeout" },
          { status: 504 },
        );
      }
      return Response.json(
        { message: `No product found for the code: ${productCode}` },
        { status: 404 },
      );
    }

    return Response.json({ itemName, prices, warnings });
  } catch (error) {
    console.error("Price api error:", error);
    return Response.json({ message: error.message }, { status: 500 });
  }
});
