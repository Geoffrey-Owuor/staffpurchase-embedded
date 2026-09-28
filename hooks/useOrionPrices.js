import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";
import { basePath } from "@/public/assets";

const MIN_CODE_LENGTH = 3;
const DEBOUNCE_MS = 600;

const EMPTY_PRICES = { TRADE: null, RTLRRP: null, ONLINE: null };

// Fetches TRADE/RTLRRP/ONLINE Orion prices for a product code, debounced.
// `enabled` gates the debounced auto-fetch only — pass false to hydrate a
// field (e.g. an edit page loading stored values) without triggering a
// fetch; `refetch()` always works regardless of `enabled`, for an explicit
// user-initiated retry.
export function useOrionPrices({ productCode, enabled }) {
  const [status, setStatus] = useState("idle"); // idle|loading|success|notfound|error
  const [prices, setPrices] = useState(EMPTY_PRICES);
  const [itemName, setItemName] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  const lastFetchedCodeRef = useRef(null);
  const abortControllerRef = useRef(null);

  const trimmedCode = productCode?.trim() ?? "";
  const debouncedCode = useDebouncedValue(trimmedCode, DEBOUNCE_MS);
  const isDebouncing =
    enabled &&
    trimmedCode.length >= MIN_CODE_LENGTH &&
    trimmedCode !== debouncedCode;

  const runFetch = useCallback(async (code) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch(`${basePath}/api/getpurchasedetails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode: code }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("notfound");
        setErrorMessage(data.message || "No product found for this code");
        setPrices(EMPTY_PRICES);
        setItemName(null);
        setWarnings([]);
        return;
      }

      setStatus("success");
      setPrices({ ...EMPTY_PRICES, ...data.prices });
      setItemName(data.itemName || null);
      setWarnings(data.warnings || []);
      lastFetchedCodeRef.current = code;
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Error fetching Orion prices", err);
      setStatus("error");
      setErrorMessage("Network or server error. Please try again.");
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    if (!debouncedCode || debouncedCode.length < MIN_CODE_LENGTH) {
      setStatus("idle");
      setPrices(EMPTY_PRICES);
      setItemName(null);
      setWarnings([]);
      lastFetchedCodeRef.current = null;
      return;
    }

    if (debouncedCode === lastFetchedCodeRef.current) return;

    runFetch(debouncedCode);
  }, [debouncedCode, enabled, runFetch]);

  // Abort any in-flight request on unmount.
  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const refetch = useCallback(() => {
    if (!trimmedCode) return;
    runFetch(trimmedCode);
  }, [trimmedCode, runFetch]);

  return {
    status: isDebouncing ? "debouncing" : status,
    prices,
    itemName,
    warnings,
    errorMessage,
    refetch,
  };
}
