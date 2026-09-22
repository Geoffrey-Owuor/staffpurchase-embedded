"use client";
import { useEffect, useRef, useState } from "react";
import FormAsterisk from "../Reusables/FormAsterisk/FormAsterisk";
import Select from "../Reusables/Select";
import SkeletonBox from "../skeletons/SkeletonBox";
import PriceComparisonPanel from "./PriceComparisonPanel";
import { RotateCcw } from "lucide-react";
import { useOrionPrices } from "@/hooks/useOrionPrices";
import { selectLowestPrice } from "@/utils/Pricing/selectLowestPrice";
import { resolveDiscountPolicy } from "@/utils/Pricing/resolveDiscountPolicy";

const ITEM_STATUS_OPTIONS = [
  { value: "New", label: "New" },
  { value: "RHD2", label: "RHD2" },
];

const STATUS_TEXT = {
  idle: "Prices load automatically as you type.",
  debouncing: "Prices load automatically as you type.",
  loading: "Checking Orion for Trade, Retail & Online prices…",
  success: "Prices fetched.",
  notfound: null, // errorMessage is shown instead
  error: null,
};

const ProductPricing = ({
  formData,
  handleChange,
  setFormData,
  discountPolicies,
  userRole,
  paymentTerms,
  productNumber,
  approversPurchasing,
  onFetchStatusChange,
}) => {
  const [hasUserEditedCode, setHasUserEditedCode] = useState(false);

  const canFetch =
    userRole === "staff" || userRole === "cc" || approversPurchasing;

  const orion = useOrionPrices({
    productCode: formData.productCode,
    enabled: canFetch && hasUserEditedCode,
  });

  // Bubble fetch-in-progress state up so the parent form can disable submit
  // while any product row is mid-fetch. `onFetchStatusChange` is an inline
  // arrow function from the parent (a fresh reference every render), so it's
  // read via a ref rather than the effect's dependency array — otherwise the
  // effect fires -> parent re-renders with a new callback identity -> effect
  // fires again, forever.
  const onFetchStatusChangeRef = useRef(onFetchStatusChange);
  useEffect(() => {
    onFetchStatusChangeRef.current = onFetchStatusChange;
  });

  useEffect(() => {
    const isFetching =
      orion.status === "loading" || orion.status === "debouncing";
    onFetchStatusChangeRef.current?.(isFetching);
    return () => onFetchStatusChangeRef.current?.(false);
  }, [orion.status]);

  const handleProductCodeChange = (e) => {
    setHasUserEditedCode(true);
    handleChange(e);
  };

  const handleRetry = () => {
    setHasUserEditedCode(true);
    orion.refetch();
  };

  // Auto-apply the fetched item name (replaces the old click-to-select popover).
  useEffect(() => {
    if (orion.status !== "success") return;
    if (!orion.itemName || orion.itemName === formData.itemName) return;
    setFormData((prev) => ({ ...prev, itemName: orion.itemName }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orion.status, orion.itemName]);

  // Policy resolution + lowest-price selection.
  useEffect(() => {
    if (!["staff", "cc"].includes(userRole) && !approversPurchasing) return;
    // A manually-entered price (CC override) sticks until a fresh fetch runs.
    if (formData.priceCode === "MANUAL") return;

    const { itemName, itemStatus } = formData;
    const policyResolution = resolveDiscountPolicy({
      itemName,
      itemStatus,
      paymentTerms,
      discountPolicies,
    });
    if (!policyResolution.resolved) return;

    const { policyRate, productPolicy } = policyResolution;

    if (orion.status === "success") {
      const { winner } = selectLowestPrice({
        prices: orion.prices,
        discountRate: policyRate,
      });

      if (winner) {
        setFormData((prev) => ({
          ...prev,
          productPolicy,
          priceCode: winner.priceCode,
          tdPrice: winner.basePrice,
          discountRate: winner.appliedDiscountRate,
          tradePrice: orion.prices.TRADE ?? 0,
          retailPrice: orion.prices.RTLRRP ?? 0,
          onlinePrice: orion.prices.ONLINE ?? 0,
        }));
        return;
      }

      // All three fetched prices unusable: keep the existing tdPrice (don't
      // blank a previously-good value), but still persist the raw fetch
      // results (0.00 fallback) for audit.
      setFormData((prev) => ({
        ...prev,
        productPolicy,
        discountRate: policyRate,
        tradePrice: orion.prices.TRADE ?? 0,
        retailPrice: orion.prices.RTLRRP ?? 0,
        onlinePrice: orion.prices.ONLINE ?? 0,
      }));
      return;
    }

    // No fresh fetch result yet (e.g. hydrated edit-page values) — only
    // keep the policy/discount rate current, same as the original behavior.
    setFormData((prev) => ({
      ...prev,
      productPolicy,
      discountRate: policyRate,
    }));
  }, [
    formData.itemName,
    formData.itemStatus,
    formData.priceCode,
    paymentTerms,
    discountPolicies,
    userRole,
    approversPurchasing,
    orion.status,
    orion.prices,
  ]);

  // Discounted value = tdPrice less discountRate. `0` is a legitimate
  // discount rate (every RTLRRP/ONLINE selection), so only "" / null /
  // undefined block the calculation.
  useEffect(() => {
    if (!["staff", "cc"].includes(userRole) && !approversPurchasing) return;

    const { tdPrice, discountRate } = formData;
    if (
      tdPrice === "" ||
      tdPrice == null ||
      discountRate === "" ||
      discountRate == null
    )
      return;

    const parsedPrice = parseFloat(tdPrice) || 0;
    const parsedRate = parseFloat(discountRate) || 0;
    const discountedValue = parsedPrice * (1 - parsedRate / 100);

    setFormData((prev) => ({
      ...prev,
      discountedValue: discountedValue.toFixed(2),
    }));
  }, [formData.tdPrice, formData.discountRate]);

  const handleTdPriceChange = (e) => {
    handleChange(e);
    setFormData((prev) => ({ ...prev, priceCode: "MANUAL" }));
  };

  const editableRoles = ["staff", "cc"];
  const staffReadOnly = userRole !== "staff" && !approversPurchasing;
  const ccReadOnly = userRole !== "cc";
  const isReadonlyGeneral =
    !editableRoles.includes(userRole) && !approversPurchasing;

  // What the comparison trigger/modal should show. Available as soon as a
  // fetch succeeds — even before Item Status/Payment Terms are chosen — so a
  // user can compare prices without filling in the rest of the form first.
  // Sourced from the live `orion.prices` while a fetch result is in hand
  // (so it's available the instant fetch succeeds, not a tick later once
  // the selection effect above has written formData), falling back to the
  // persisted formData values otherwise (hydrated edit-page rows, or after
  // a CC manual override).
  const isLiveFetch = orion.status === "success";
  const isManual = formData.priceCode === "MANUAL";

  let comparisonPrices;
  let comparisonDiscountRate;
  let pending = false;

  if (isLiveFetch && !isManual) {
    comparisonPrices = orion.prices;
    const policyResolution = resolveDiscountPolicy({
      itemName: formData.itemName,
      itemStatus: formData.itemStatus,
      paymentTerms,
      discountPolicies,
    });
    if (policyResolution.resolved) {
      comparisonDiscountRate = policyResolution.policyRate;
    } else {
      pending = true;
      comparisonDiscountRate = 0;
    }
  } else {
    comparisonPrices = {
      TRADE: formData.tradePrice || null,
      RTLRRP: formData.retailPrice || null,
      ONLINE: formData.onlinePrice || null,
    };
    comparisonDiscountRate = formData.discountRate;
  }

  const { candidates: comparisonCandidates, winner: comparisonWinner } =
    selectLowestPrice({
      prices: comparisonPrices,
      discountRate: comparisonDiscountRate,
    });

  const comparisonWinnerCode = isManual
    ? "MANUAL"
    : pending
      ? null
      : isLiveFetch
        ? (comparisonWinner?.priceCode ?? null)
        : formData.priceCode;

  const isBusy = orion.status === "loading" || orion.status === "debouncing";
  const isLoadingPrices = orion.status === "loading";
  const statusText = STATUS_TEXT[orion.status];

  return (
    <div className="relative rounded-xl">
      <div className="rounded-t-xl px-2 py-3 text-lg font-semibold text-gray-900 dark:text-white">
        Product {productNumber}
      </div>

      <div className="space-y-6 overflow-x-auto px-2 py-4">
        {/* Grouped Inputs - 2 columns on md+ */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Product Code */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400">
              Product Code (SKU) <FormAsterisk />
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                name="productCode"
                value={formData.productCode}
                onChange={handleProductCodeChange}
                className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${isReadonlyGeneral ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
                required
                readOnly={isReadonlyGeneral}
              />
              {canFetch && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isBusy}
                  title="Retry price fetch"
                  aria-label="Retry price fetch"
                  className="absolute right-3 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  <RotateCcw
                    className={`h-5 w-5 ${isBusy ? "animate-spin" : ""}`}
                  />
                </button>
              )}
            </div>
            {canFetch && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {statusText || orion.errorMessage || STATUS_TEXT.idle}
              </p>
            )}
            {canFetch && !isBusy && (
              <PriceComparisonPanel
                candidates={comparisonCandidates}
                winnerCode={comparisonWinnerCode}
                warnings={orion.warnings}
                pending={pending}
                title={`Product ${productNumber} - Price Comparison`}
              />
            )}
          </div>
          {/* Item Name*/}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400">
              Item Name <FormAsterisk />
            </label>
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${isReadonlyGeneral ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
              required
              readOnly={isReadonlyGeneral}
              title={formData.itemName}
            />
          </div>
          {/* Item Status */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400">
              Status (New / RHD2) <FormAsterisk />
            </label>
            <Select
              name="itemStatus"
              value={formData.itemStatus || ""}
              onChange={(value) =>
                handleChange({ target: { name: "itemStatus", value } })
              }
              options={ITEM_STATUS_OPTIONS}
              placeholder="Select"
              className="w-full"
              required
              disabled={staffReadOnly}
            />
          </div>

          {/* Product Policy Type */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400">
              Item Policy Type
            </label>
            <input
              type="text"
              value={formData.productPolicy}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              readOnly
              title={formData.productPolicy}
            />
          </div>

          {/* TD Price */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400">
              Initial Price <FormAsterisk />
            </label>
            {isLoadingPrices ? (
              <SkeletonBox className="h-11 w-full" />
            ) : (
              <input
                type="number"
                step="0.01"
                name="tdPrice"
                value={formData.tdPrice}
                onChange={handleTdPriceChange}
                className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${ccReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
                readOnly={ccReadOnly}
                required
              />
            )}
          </div>

          {/* Discount Rate */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400">
              Discount Rate <FormAsterisk />
            </label>
            {isLoadingPrices ? (
              <SkeletonBox className="h-11 w-full" />
            ) : (
              <input
                type="number"
                step="0.01"
                name="discountRate"
                value={formData.discountRate}
                onChange={handleChange}
                readOnly={ccReadOnly}
                required
                className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${ccReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
              />
            )}
          </div>

          {/* Discounted Value */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400">
              Discounted Value
            </label>
            {isLoadingPrices ? (
              <SkeletonBox className="h-11 w-full" />
            ) : (
              <input
                type="number"
                step="0.01"
                name="discountedValue"
                value={formData.discountedValue}
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPricing;
