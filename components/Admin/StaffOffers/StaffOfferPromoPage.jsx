"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  TriangleAlert,
} from "lucide-react";
import DataTable from "../../DataTable/DataTable";
import { useTableQuery } from "../../DataTable/useTableQuery";
import Alert from "../../Alert";
import PromoStatusBadge from "./PromoStatusBadge";
import PromoActionModal from "./PromoActionModal";
import PromoFormModal from "./PromoFormModal";
import { usePromoSave } from "./usePromoSave";
import {
  formatPrice,
  formatPromoWindow,
  inputClass,
  neutralButton,
  plural,
  primaryButton,
} from "./staffOfferUi";
import {
  fetchAdminPromo,
  fetchAdminPromoProducts,
} from "@/utils/FetchAdmin/fetchAdmin";
import {
  OFFER_PRODUCT_CODE_MAX_LENGTH,
  OFFER_STATUS_OPTIONS,
  PROMO_EXTEND_GRACE_DAYS,
} from "@/utils/Admin/adminConstants";
import { formatDateLong } from "@/public/assets";
import { formatWallClock } from "@/utils/Admin/wallClock";
import { useDashboardRoutes } from "@/utils/HandleActionClicks/useDashboardRoutes";

const PRODUCT_FILTERS = [
  {
    key: "search",
    type: "text",
    label: "Product code",
    placeholder: "Search product codes...",
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    placeholder: "Status",
    options: OFFER_STATUS_OPTIONS,
  },
];

// One promo: its period/status actions and its products.
export default function StaffOfferPromoPage({ id }) {
  const { adminStaffOffersPath, navigate, getAdminPromoPath } =
    useDashboardRoutes();
  const [action, setAction] = useState(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState({
    show: false,
    type: "",
    message: "",
  });
  const notify = (type, message) => setAlertInfo({ show: true, type, message });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminPromo", id],
    queryFn: () => fetchAdminPromo(id),
  });
  const promo = data?.promo;

  const openAction = (name) => {
    setAction({ action: name, key: Date.now() });
    setActionOpen(true);
  };

  return (
    <>
      {alertInfo.show && (
        <Alert
          message={alertInfo.message}
          type={alertInfo.type}
          onClose={() => setAlertInfo({ show: false, message: "", type: "" })}
        />
      )}
      <div className="px-2 pt-3">
        <Link
          href={adminStaffOffersPath}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All promos
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : isError || !promo ? (
        <p className="py-10 text-center text-sm text-red-500">
          Failed to load this promo. It may not exist.
        </p>
      ) : (
        <>
          <PromoSummary
            promo={promo}
            onAction={openAction}
            onDuplicate={() => {
              setDuplicating({ source: promo, key: Date.now() });
              setDuplicateOpen(true);
            }}
          />
          <PromoProducts promo={promo} notify={notify} />
          <PromoActionModal
            open={actionOpen}
            editing={action}
            promo={promo}
            onClose={() => setActionOpen(false)}
            onDone={(message) => {
              setActionOpen(false);
              notify("success", message);
            }}
          />
          <PromoFormModal
            open={duplicateOpen}
            editing={duplicating}
            onClose={() => setDuplicateOpen(false)}
            onCreated={(created, message) => {
              setDuplicateOpen(false);
              notify("success", message);
              navigate(getAdminPromoPath(created.id));
            }}
          />
        </>
      )}
    </>
  );
}

function PromoSummary({ promo, onAction, onDuplicate }) {
  const ended = promo.phase === "over";
  const canChangePeriod = !ended || promo.withinGrace;

  return (
    <section className="mx-2 mt-3 mb-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold break-words text-gray-900 dark:text-white">
            {promo.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <PromoStatusBadge status={promo.status} />
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-4 w-4" />
              {formatPromoWindow(promo)}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {plural(promo.activeProductCount, "active product")} of{" "}
            {promo.productCount} · used by{" "}
            {plural(promo.usageCount, "purchase line")} ·{" "}
            {promo.createdByName
              ? `created by ${promo.createdByName} on ${formatDateLong(promo.createdAt)}`
              : "backfilled from the original offers table"}
          </p>
          {ended && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {promo.withinGrace
                ? `Ended ${formatWallClock(promo.endsAt)} - it can still be extended for up to ${PROMO_EXTEND_GRACE_DAYS} days after it ended.`
                : `Ended more than ${PROMO_EXTEND_GRACE_DAYS} days ago - duplicate it to run it again.`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <button type="button" onClick={() => onAction("rename")} className={neutralButton}>
            <Pencil className="h-4 w-4" />
            Rename
          </button>
          {canChangePeriod && (
            <button
              type="button"
              onClick={() => onAction("update_window")}
              className={neutralButton}
            >
              <CalendarClock className="h-4 w-4" />
              {ended ? "Extend" : "Change period"}
            </button>
          )}
          {promo.isActive ? (
            <button
              type="button"
              onClick={() => onAction("deactivate")}
              className={neutralButton}
            >
              <EyeOff className="h-4 w-4" />
              Deactivate
            </button>
          ) : (
            !ended && (
              <button
                type="button"
                onClick={() => onAction("reactivate")}
                className={neutralButton}
              >
                <Eye className="h-4 w-4" />
                Reactivate
              </button>
            )
          )}
          <button type="button" onClick={onDuplicate} className={neutralButton}>
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
        </div>
      </div>
    </section>
  );
}

function PromoProducts({ promo, notify }) {
  const { save, busyKey, busy, error, setError, overlapDialog } =
    usePromoSave();
  const [code, setCode] = useState("");
  const [price, setPrice] = useState("");
  const ended = promo.phase === "over";

  const table = useTableQuery({
    queryKeyPrefix: ["adminPromoProducts", promo.id],
    fetchFn: (filters) => fetchAdminPromoProducts(promo.id, filters),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    save(
      "add",
      "POST",
      `/${promo.id}/products`,
      { productCode: code, offerPrice: price },
      (result) => {
        setCode("");
        setPrice("");
        notify("success", result.message);
      },
    );
  };

  const toggle = (offer) =>
    save(
      `offer:${offer.id}`,
      "PATCH",
      `/${promo.id}/products/${offer.id}`,
      { isActive: !offer.isActive },
      (result) => notify("success", result.message),
    );

  const columns = [
    {
      key: "productCode",
      label: "Product code",
      render: (o) => <span className="font-mono">{o.productCode}</span>,
    },
    {
      key: "offerPrice",
      label: "Offer price",
      render: (o) => formatPrice(o.offerPrice),
    },
    {
      key: "status",
      label: "Status",
      render: (o) => (
        <PromoStatusBadge status={o.isActive ? "active" : "inactive"} />
      ),
    },
    {
      key: "usage",
      label: "Used by",
      title: "Purchase lines that used this offer",
      render: (o) => o.usageCount,
    },
    {
      key: "overlap",
      label: "Overlap",
      render: (o) =>
        o.overlapPromo ? (
          <span
            className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"
            title={`Also on offer in ${o.overlapPromo} at the same time - the newest offer wins`}
          >
            <TriangleAlert className="h-4 w-4" />
            <span className="max-w-[160px] truncate">{o.overlapPromo}</span>
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "createdAt",
      label: "Added",
      render: (o) => formatDateLong(o.createdAt),
    },
  ];

  return (
    <>
      <div className="mx-2 mb-4">
        {ended ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This promo has ended, so products can&apos;t be added.
          </p>
        ) : (
          <form
            onSubmit={handleAdd}
            className="flex flex-col gap-2 md:flex-row md:items-start"
          >
            <input
              aria-label="Product code"
              placeholder="Product code"
              required
              maxLength={OFFER_PRODUCT_CODE_MAX_LENGTH}
              value={code}
              disabled={busy}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              className={`${inputClass} font-mono md:w-56`}
            />
            <input
              aria-label="Offer price (KES)"
              placeholder="Offer price (KES)"
              required
              inputMode="decimal"
              value={price}
              disabled={busy}
              onChange={(e) => {
                setPrice(e.target.value);
                setError("");
              }}
              className={`${inputClass} md:w-48`}
            />
            <button
              type="submit"
              disabled={busy}
              className={`${primaryButton} md:h-[46px]`}
            >
              {busyKey === "add" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add product
            </button>
          </form>
        )}
        {error && (
          <p
            role="alert"
            className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          The offer price is the final price staff pay - no discount is applied
          on top. Prices can&apos;t be edited: deactivate a product and add it
          again at the new price.
        </p>
      </div>

      <DataTable
        heading={
          <h3 className="mt-1 px-1 font-semibold text-gray-900 dark:text-white">
            Products
          </h3>
        }
        columns={columns}
        visibleColumns={{}}
        filterFields={PRODUCT_FILTERS}
        filters={table.filters}
        staged={table.staged}
        stagedKeys={table.stagedKeys}
        selectedField={table.selectedField}
        onSelectField={table.setSelectedField}
        onStagedValueChange={table.setStagedValue}
        onClearStaged={table.clearStagedKeys}
        onApplyFilters={table.applyFilters}
        onRemoveCommittedFilter={table.removeCommittedFilter}
        onResetAll={table.resetAll}
        rows={table.rows}
        total={table.total}
        totalPages={table.totalPages}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        isLoading={table.isLoading}
        isError={table.isError}
        onRefetch={table.refetch}
        emptyMessage="No products in this promo yet"
        filteredEmptyMessage="No products match the active filters."
        errorMessage="Failed to load products. Please try refreshing the page."
        renderActions={(o) =>
          o.isActive || !ended ? (
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                toggle(o);
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {busyKey === `offer:${o.id}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : o.isActive ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {o.isActive ? "Deactivate" : "Reactivate"}
            </button>
          ) : null
        }
      />
      {overlapDialog}
    </>
  );
}
