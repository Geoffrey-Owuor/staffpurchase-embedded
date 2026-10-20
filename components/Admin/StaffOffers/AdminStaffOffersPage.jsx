"use client";
import { useState } from "react";
import { ChevronRight, Plus, Tags } from "lucide-react";
import DataTable from "../../DataTable/DataTable";
import { useTableQuery } from "../../DataTable/useTableQuery";
import PromoStatusBadge from "./PromoStatusBadge";
import PromoFormModal from "./PromoFormModal";
import {
  formatPromoDates,
  formatPromoWindow,
  primaryButton,
} from "./staffOfferUi";
import { fetchAdminPromos } from "@/utils/FetchAdmin/fetchAdmin";
import { PROMO_STATUS_OPTIONS } from "@/utils/Admin/adminConstants";
import { useDashboardRoutes } from "@/utils/HandleActionClicks/useDashboardRoutes";

const FILTER_FIELDS = [
  {
    key: "search",
    type: "text",
    label: "Promo name",
    placeholder: "Search promo names...",
  },
  {
    key: "productCode",
    type: "text",
    label: "Product code",
    placeholder: "Promos that include a code...",
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    placeholder: "Status",
    options: PROMO_STATUS_OPTIONS,
  },
];

function StaffOffersHeading() {
  return (
    <div className="mt-3 mb-2 px-1 pb-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <Tags className="h-5 w-5" />
        Staff Offers
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Promo prices staff pay, grouped by promo - select one to manage its
        period and products
      </p>
    </div>
  );
}

// Promo list (api/admin/staff-offers). A row opens the promo's own page.
export default function AdminStaffOffersPage() {
  const { navigate, getAdminPromoPath } = useDashboardRoutes();
  const [creating, setCreating] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const table = useTableQuery({
    queryKeyPrefix: ["adminPromos"],
    fetchFn: fetchAdminPromos,
  });

  const columns = [
    {
      key: "name",
      label: "Promo",
      render: (p) => (
        <span className="block max-w-[260px] truncate font-medium" title={p.name}>
          {p.name}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (p) => <PromoStatusBadge status={p.status} />,
    },
    {
      key: "window",
      label: "Period",
      render: (p) => (
        <span title={formatPromoWindow(p)}>{formatPromoDates(p)}</span>
      ),
    },
    {
      key: "products",
      label: "Products",
      title: "Active / all products",
      render: (p) =>
        p.activeProductCount === p.productCount
          ? p.productCount
          : `${p.activeProductCount} / ${p.productCount}`,
    },
    {
      key: "usage",
      label: "Used by",
      title: "Purchase lines that used one of its offers",
      render: (p) => p.usageCount,
    },
    {
      key: "createdBy",
      label: "Created by",
      render: (p) => p.createdByName || "Backfilled",
    },
  ];

  return (
    <>
      <DataTable
        heading={<StaffOffersHeading />}
        toolbarExtra={
          <button
            type="button"
            onClick={() => {
              setCreating({ source: null, key: Date.now() });
              setModalOpen(true);
            }}
            className={primaryButton}
          >
            <Plus className="h-4 w-4" />
            New promo
          </button>
        }
        columns={columns}
        visibleColumns={{}}
        filterFields={FILTER_FIELDS}
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
        onRowClick={(p) => navigate(getAdminPromoPath(p.id))}
        emptyMessage="No promos yet - create one to start offering staff prices"
        filteredEmptyMessage="No promos match the active filters."
        errorMessage="Failed to load promos. Please try refreshing the page."
        renderActions={() => (
          <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
        )}
      />
      <PromoFormModal
        open={modalOpen}
        editing={creating}
        onClose={() => setModalOpen(false)}
        onCreated={(promo) => {
          setModalOpen(false);
          navigate(getAdminPromoPath(promo.id));
        }}
      />
    </>
  );
}
