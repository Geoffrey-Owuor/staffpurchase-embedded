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
import { isRequesterRole } from "@/utils/routes";
import {
  PRICE_CODE_LABELS,
  STAFF_OFFER_CODE,
} from "@/utils/Pricing/priceCodes";

const ITEM_STATUS_OPTIONS = [
  { value: "New", label: "New" },
  { value: "RHD2", label: "RHD2" },
];

const STATUS_TEXT = {
  idle: "Prices load automatically as you type.",
  debouncing: "Prices load automatically as you type.",
  loading: "Checking Trade, Retail, Online & Staff Offer prices…",
  success: "Prices fetched.",
  notfound: null, // errorMessage is shown instead
  error: null,
};

// Hydrated (DB) values arrive as DECIMAL strings - selectLowestPrice only
// accepts positive numbers, so normalize them first.
const toStoredPrice = (value) => {
  const parsed = parseFloat(value);
  return parsed > 0 ? parsed : null;
};

// The fetched Orion prices plus the Staff Offer, when there is one.
const withStaffOffer = (prices, staffOffer) => ({
  ...prices,
  [STAFF_OFFER_CODE]: staffOffer?.price ?? null,
});

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
  recordedProduct,
}) => {
  const [hasUserEditedCode, setHasUserEditedCode] = useState(false);

  // Prices are fetched only while a request is being created. On the edit
  // page (approversPurchasing is false) CC works from what was recorded at
  // submission - product code, fetched prices and discount policy are locked
  // (a re-fetch could replace a Staff Offer that has since ended). The one
  // price change CC can make there is a manual (MANUAL) price, e.g. one
  // approved by a product manager. Mirrored server-side in
  // api/generaleditpurchases.
  const isRequester = isRequesterRole(userRole);
  const canFetch = isRequester || approversPurchasing;
  const isCcEdit = userRole === "cc" && !approversPurchasing;
  // CC still sees the stored price comparison, just without a live fetch.
  const showComparison = canFetch || isCcEdit;

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

  // The `orion.prices` object last consumed by the policy/selection effect
  // below - lets it tell a genuinely new fetch result apart from the effect
  // simply re-running while `orion.status` still reflects an older fetch.
  const appliedFetchRef = useRef(null);

  // Auto-apply the fetched item name (replaces the old click-to-select popover).
  useEffect(() => {
    if (orion.status !== "success") return;
    if (!orion.itemName || orion.itemName === formData.itemName) return;
    setFormData((prev) => ({ ...prev, itemName: orion.itemName }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orion.status, orion.itemName]);

  // Policy resolution + lowest-price selection. Skipped on the CC edit page:
  // the policy and discount stay as recorded at submission.
  useEffect(() => {
    if (!isRequester && userRole !== "cc" && !approversPurchasing) return;
    if (isCcEdit) return;

    // A manually-entered price (CC override) sticks until a *fresh* fetch
    // completes - retyping the product code, or hitting Retry, always wins
    // over a prior MANUAL override. `isFreshFetch` distinguishes that from
    // this effect merely re-running for an unrelated reason (e.g. Item
    // Status changing) while `orion.status`/`orion.prices` still reflect an
    // earlier, already-applied fetch - `appliedFetchRef` remembers which
    // `orion.prices` object was last consumed, and useOrionPrices always
    // hands back a brand-new object on every completed fetch.
    const isFreshFetch =
      orion.status === "success" && orion.prices !== appliedFetchRef.current;
    if (formData.priceCode === "MANUAL" && !isFreshFetch) return;

    const { itemName, itemStatus, priceCode } = formData;
    const policyResolution = resolveDiscountPolicy({
      itemName,
      itemStatus,
      paymentTerms,
      discountPolicies,
    });
    if (!policyResolution.resolved) return;

    const { policyRate, productPolicy } = policyResolution;
    // STAFFOFFER/RTLRRP/ONLINE never carry a discount (only TRADE does) —
    // never let a resolved policy rate land on top of one of those bases.
    const isNonTradeFetchedBasis =
      priceCode === STAFF_OFFER_CODE ||
      priceCode === "RTLRRP" ||
      priceCode === "ONLINE";

    if (orion.status === "success") {
      // Mark this fetch result consumed regardless of outcome, so an
      // unrelated re-run of this effect (nothing newly fetched) doesn't
      // keep treating it as fresh.
      appliedFetchRef.current = orion.prices;

      // Recorded whenever an offer was live (even if another price wins),
      // for audit; the server re-checks it against the DB on submit.
      const { staffOffer } = orion;
      const staffOfferFields = {
        staffOfferPrice: staffOffer?.price ?? "",
        staffOfferId: staffOffer?.id ?? "",
      };

      const { winner } = selectLowestPrice({
        prices: withStaffOffer(orion.prices, staffOffer),
        discountRate: policyRate,
      });

      if (winner) {
        // A usable winner always wins, replacing any prior MANUAL override.
        setFormData((prev) => ({
          ...prev,
          productPolicy,
          priceCode: winner.priceCode,
          tdPrice: winner.basePrice,
          discountRate: winner.appliedDiscountRate,
          tradePrice: orion.prices.TRADE ?? 0,
          retailPrice: orion.prices.RTLRRP ?? 0,
          onlinePrice: orion.prices.ONLINE ?? 0,
          ...staffOfferFields,
        }));
        return;
      }

      // All fetched prices unusable: keep the existing tdPrice (don't
      // blank a previously-good value), but still persist the raw fetch
      // results (0.00 fallback) for audit. A prior MANUAL entry is left
      // fully intact here (price, basis and discount) rather than wiping it
      // out over a refetch that found nothing to replace it with.
      setFormData((prev) => ({
        ...prev,
        productPolicy,
        discountRate: priceCode === "MANUAL" ? prev.discountRate : policyRate,
        tradePrice: orion.prices.TRADE ?? 0,
        retailPrice: orion.prices.RTLRRP ?? 0,
        onlinePrice: orion.prices.ONLINE ?? 0,
        ...staffOfferFields,
      }));
      return;
    }

    // No fresh fetch result yet (e.g. hydrated edit-page values) — keep the
    // policy current, and the discount rate current *for a TRADE basis
    // only*. For a STAFFOFFER/RTLRRP/ONLINE basis this also self-heals a stale
    // nonzero discountRate that may have been saved before price-basis
    // gating existed.
    setFormData((prev) => ({
      ...prev,
      productPolicy,
      discountRate: isNonTradeFetchedBasis ? 0 : policyRate,
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
    orion.staffOffer,
  ]);

  // Discounted value = tdPrice less discountRate. `0` is a legitimate
  // discount rate (every STAFFOFFER/RTLRRP/ONLINE selection), so only "" / null /
  // undefined block the calculation.
  useEffect(() => {
    if (!isRequester && userRole !== "cc" && !approversPurchasing) return;

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

  const editableRoles = ["cc"];
  const staffReadOnly = !isRequester && !approversPurchasing;
  const ccReadOnly = userRole !== "cc";
  const isReadonlyGeneral =
    !isRequester && !editableRoles.includes(userRole) && !approversPurchasing;

  // Discount policies only apply to a TRADE basis; MANUAL is a full CC
  // hand-entry so a custom discount on top of it is still meaningful.
  // STAFFOFFER/RTLRRP/ONLINE never take a discount, so the field is locked
  // to 0 then. On the CC edit page a TRADE discount is locked to the one
  // recorded at submission too.
  const isDiscountableBasis =
    formData.priceCode === "MANUAL" ||
    (formData.priceCode === "TRADE" && !isCcEdit);
  const discountRateReadOnly = ccReadOnly || !isDiscountableBasis;
  // Product code + item name.
  const productIdentityReadOnly = isReadonlyGeneral || isCcEdit;

  // CC edit page: undo a mistyped manual price back to what was recorded at
  // submission (price basis, price and discount).
  const isPriceChanged =
    isCcEdit &&
    recordedProduct != null &&
    (formData.priceCode !== recordedProduct.priceCode ||
      parseFloat(formData.tdPrice) !== parseFloat(recordedProduct.tdPrice) ||
      parseFloat(formData.discountRate) !==
        parseFloat(recordedProduct.discountRate));

  const handleRestorePrice = () => {
    setFormData((prev) => ({
      ...prev,
      priceCode: recordedProduct.priceCode,
      tdPrice: recordedProduct.tdPrice,
      discountRate: recordedProduct.discountRate,
      discountedValue: recordedProduct.discountedValue,
    }));
  };

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
    comparisonPrices = withStaffOffer(orion.prices, orion.staffOffer);
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
      [STAFF_OFFER_CODE]: toStoredPrice(formData.staffOfferPrice),
      TRADE: toStoredPrice(formData.tradePrice),
      RTLRRP: toStoredPrice(formData.retailPrice),
      ONLINE: toStoredPrice(formData.onlinePrice),
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
    <div className="relative mx-2 rounded-xl border border-gray-200 p-2 dark:border-gray-900">
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
                className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${productIdentityReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
                required
                readOnly={productIdentityReadOnly}
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
            {isCcEdit && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Product and prices as recorded at submission. To use an
                approved manual price, edit the Initial Price.
              </p>
            )}
            {showComparison && !isBusy && (
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
              className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${productIdentityReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
              required
              readOnly={productIdentityReadOnly}
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
            {isPriceChanged && (
              <button
                type="button"
                onClick={handleRestorePrice}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-gray-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore recorded price
              </button>
            )}
          </div>

          {/* Price Basis - system-derived, never directly editable. Used to
          gate whether Discount Rate can carry a nonzero value (see
          isDiscountableBasis above). */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400">
              Price Basis
            </label>
            {isLoadingPrices ? (
              <SkeletonBox className="h-11 w-full" />
            ) : (
              <input
                type="text"
                value={
                  formData.priceCode
                    ? (PRICE_CODE_LABELS[formData.priceCode] ??
                      formData.priceCode)
                    : "--"
                }
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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
                readOnly={discountRateReadOnly}
                title={
                  !ccReadOnly && !isDiscountableBasis
                    ? isCcEdit
                      ? "The discount is locked as recorded at submission - edit the Initial Price to enter a manual price"
                      : "Only a Trade Price basis (or a manually entered price) can carry a discount"
                    : undefined
                }
                required
                className={`w-full rounded-xl border border-gray-200 px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white ${discountRateReadOnly ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-950"}`}
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
