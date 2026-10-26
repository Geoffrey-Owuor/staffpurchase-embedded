"use client";
import { useId, useState } from "react";
import { Eye, X } from "lucide-react";
import DataTable from "../DataTable/DataTable";
import { useTableQuery } from "../DataTable/useTableQuery";
import Modal from "../Reusables/Modal/Modal";
import { fetchAdminAuditLog } from "@/utils/FetchAdmin/fetchAdmin";
import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_ACTION_OPTIONS,
  ADMIN_AUDIT_TARGET_OPTIONS,
} from "@/utils/Admin/adminConstants";

const FILTER_FIELDS = [
  {
    key: "search",
    type: "text",
    label: "Target / By",
    placeholder: "User email, PRQ reference or who acted...",
  },
  {
    key: "action",
    type: "select",
    label: "Action",
    placeholder: "Action",
    options: ADMIN_AUDIT_ACTION_OPTIONS,
  },
  {
    key: "targetType",
    type: "select",
    label: "Target Type",
    placeholder: "Target type",
    options: ADMIN_AUDIT_TARGET_OPTIONS,
  },
  { key: "date", type: "dateRange", label: "Date Range" },
];

const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

// Fields whose value differs between the before/after snapshots. A record
// with only one side (e.g. a deleted purchase) lists that side in full.
function diffSnapshots(before, after) {
  const keys = [
    ...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ];
  if (!before || !after) {
    return keys.map((key) => ({
      key,
      before: before?.[key],
      after: after?.[key],
    }));
  }
  return keys
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({ key, before: before[key], after: after[key] }));
}

function AuditHeading() {
  return (
    <div className="mt-3 mb-2 px-1 pb-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Audit log
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Every admin action, plus Credit Control product removals, newest first
      </p>
    </div>
  );
}

export default function AdminAuditLogTable() {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const table = useTableQuery({
    queryKeyPrefix: ["adminAuditLog"],
    fetchFn: fetchAdminAuditLog,
  });

  const openEntry = (entry) => {
    setSelectedEntry(entry);
    setDetailsOpen(true);
  };

  const columns = [
    {
      key: "createdAt",
      label: "When",
      render: (e) => formatDateTime(e.created_at),
    },
    {
      key: "admin",
      label: "By",
      render: (e) => e.admin_name || e.admin_email,
    },
    {
      key: "action",
      label: "Action",
      render: (e) => ADMIN_AUDIT_ACTIONS[e.action] ?? e.action,
    },
    {
      key: "target",
      label: "Target",
      render: (e) => e.target_label || e.target_id,
    },
    { key: "reason", label: "Reason", render: (e) => e.reason || "—" },
  ];

  return (
    <>
      <DataTable
        heading={<AuditHeading />}
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
        onRowClick={openEntry}
        emptyMessage="No admin actions recorded yet"
        filteredEmptyMessage="No admin actions match the active filters."
        errorMessage="Failed to load the audit log. Please try refreshing the page."
        renderActions={(e) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openEntry(e);
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Eye className="h-4 w-4" />
            Details
          </button>
        )}
      />
      <AuditEntryModal
        open={detailsOpen}
        entry={selectedEntry}
        onClose={() => setDetailsOpen(false)}
      />
    </>
  );
}

function AuditEntryModal({ open, entry, onClose }) {
  const titleId = useId();
  const changes = entry
    ? diffSnapshots(entry.before_data, entry.after_data)
    : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      mobile="fullscreen"
      className="overflow-y-auto border-gray-200 bg-gray-50 p-6 shadow-2xl md:max-h-[90vh] md:max-w-xl md:border dark:border-gray-700 dark:bg-gray-950"
    >
      {entry && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3
                id={titleId}
                className="text-xl font-bold text-gray-900 dark:text-white"
              >
                {ADMIN_AUDIT_ACTIONS[entry.action] ?? entry.action}
              </h3>
              <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                {entry.target_label || entry.target_id}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="font-semibold text-gray-700 dark:text-gray-400">
              When
            </dt>
            <dd className="text-gray-900 dark:text-white">
              {formatDateTime(entry.created_at)}
            </dd>
            <dt className="font-semibold text-gray-700 dark:text-gray-400">
              By
            </dt>
            <dd className="break-all text-gray-900 dark:text-white">
              {entry.admin_name} ({entry.admin_email})
            </dd>
            <dt className="font-semibold text-gray-700 dark:text-gray-400">
              Reason
            </dt>
            <dd className="whitespace-pre-line text-gray-900 dark:text-white">
              {entry.reason || "—"}
            </dd>
          </dl>

          <h4 className="mt-5 mb-2 font-semibold text-gray-900 dark:text-white">
            Changes
          </h4>
          {changes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No field values changed (e.g. a reset link was sent).
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-800 text-left text-white">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Field</th>
                    <th className="px-3 py-2 font-semibold">Before</th>
                    <th className="px-3 py-2 font-semibold">After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {changes.map((change) => (
                    <tr key={change.key}>
                      <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">
                        {change.key}
                      </td>
                      <td className="px-3 py-2 break-all text-red-700 dark:text-red-400">
                        {formatValue(change.before)}
                      </td>
                      <td className="px-3 py-2 break-all text-green-700 dark:text-green-400">
                        {formatValue(change.after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
