"use client";
import { useState } from "react";
import { Megaphone, Pencil, Plus } from "lucide-react";
import DataTable from "../../DataTable/DataTable";
import { useTableQuery } from "../../DataTable/useTableQuery";
import Alert from "../../Alert";
import { severityStyles } from "../../Banners/BannerCard";
import BannerStatusBadge from "./BannerStatusBadge";
import BannerModal from "./BannerModal";
import { formatAudience, formatBannerWindow } from "./bannerFormat";
import { fetchAdminBanners } from "@/utils/FetchAdmin/fetchAdmin";
import {
  BANNER_SEVERITY_OPTIONS,
  BANNER_STATUS_OPTIONS,
} from "@/utils/Admin/adminConstants";
import { formatDateLong } from "@/public/assets";

const FILTER_FIELDS = [
  {
    key: "search",
    type: "text",
    label: "Message",
    placeholder: "Search banner text...",
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    placeholder: "Status",
    options: BANNER_STATUS_OPTIONS,
  },
  {
    key: "severity",
    type: "select",
    label: "Severity",
    placeholder: "Severity",
    options: BANNER_SEVERITY_OPTIONS,
  },
];

function BannersHeading() {
  return (
    <div className="mt-3 mb-2 px-1 pb-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <Megaphone className="h-5 w-5" />
        Banners
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Notices shown at the top of the dashboard - select one to edit it
      </p>
    </div>
  );
}

// Admin banner list. "New banner" and row clicks open BannerModal, which
// runs every change (api/admin/banners) and refreshes this table.
export default function AdminBannersPage() {
  // { mode: "create" | "edit", banner } - kept after closing so the exit
  // animation still has content
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState({
    show: false,
    type: "",
    message: "",
  });

  const table = useTableQuery({
    queryKeyPrefix: ["adminBanners"],
    fetchFn: fetchAdminBanners,
  });

  const open = (mode, banner = null) => {
    setEditing({ mode, banner, key: Date.now() });
    setModalOpen(true);
  };

  const columns = [
    {
      key: "message",
      label: "Message",
      render: (b) => {
        const { Icon } = severityStyles[b.severity] ?? severityStyles.info;
        return (
          <span className="flex items-center gap-2" title={b.message}>
            <Icon
              className={`h-4 w-4 shrink-0 ${
                b.severity === "critical"
                  ? "text-red-600 dark:text-red-400"
                  : b.severity === "warning"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-blue-600 dark:text-blue-400"
              }`}
              aria-label={b.severity}
            />
            <span className="max-w-[320px] truncate">{b.message}</span>
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (b) => <BannerStatusBadge status={b.status} />,
    },
    {
      key: "audience",
      label: "Shown to",
      render: (b) => formatAudience(b.targetRoles),
    },
    { key: "window", label: "Window", render: formatBannerWindow },
    { key: "priority", label: "Priority", render: (b) => b.priority },
    {
      key: "updatedAt",
      label: "Updated",
      render: (b) => formatDateLong(b.updatedAt),
    },
  ];

  return (
    <>
      {alertInfo.show && (
        <Alert
          message={alertInfo.message}
          type={alertInfo.type}
          onClose={() => setAlertInfo({ show: false, message: "", type: "" })}
        />
      )}
      <DataTable
        heading={<BannersHeading />}
        toolbarExtra={
          <button
            type="button"
            onClick={() => open("create")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            <Plus className="h-4 w-4" />
            New banner
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
        onRowClick={(b) => open("edit", b)}
        emptyMessage="No banners yet - create one to show a notice on the dashboard"
        filteredEmptyMessage="No banners match the active filters."
        errorMessage="Failed to load banners. Please try refreshing the page."
        renderActions={(b) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              open("edit", b);
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        )}
      />
      <BannerModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onDuplicate={(banner) => open("create", banner)}
        onResult={(type, message) =>
          setAlertInfo({ show: true, type, message })
        }
      />
    </>
  );
}
