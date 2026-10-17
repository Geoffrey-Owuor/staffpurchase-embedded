"use client";
import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, PencilLine, Trash2 } from "lucide-react";
import DataTable from "../DataTable/DataTable";
import { useTableQuery } from "../DataTable/useTableQuery";
import { TableApprovalStatus } from "../Reusables/TableApprovalStatus";
import Alert from "../Alert";
import AdminDeleteRequestDialog from "./AdminDeleteRequestDialog";
import { fetchApproverPurchases } from "@/utils/FetchPurchases/fetchApproverPurchases";
import { useDashboardRoutes } from "@/utils/HandleActionClicks/useDashboardRoutes";
import { formatDateLong } from "@/public/assets";

// approvalStatus means the overall outcome for admin (see
// api/tablesdata/purchaseshistorydata).
const OVERALL_STATUS_OPTIONS = [
  { value: "pending", label: "In progress" },
  { value: "approved", label: "Fully approved" },
  { value: "declined", label: "Declined" },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "CREDIT", label: "Credit" },
  { value: "CASH AND CREDIT", label: "Cash & Credit" },
];

const FILTER_FIELDS = [
  {
    key: "search",
    type: "text",
    label: "Staff Name",
    placeholder: "Search staff...",
  },
  {
    key: "referenceNumber",
    type: "text",
    label: "Reference Number",
    placeholder: "Reference number...",
  },
  {
    key: "payrollNumber",
    type: "text",
    label: "Payroll Number",
    placeholder: "Payroll number...",
  },
  { key: "date", type: "dateRange", label: "Date Range" },
  {
    key: "approvalStatus",
    type: "select",
    label: "Overall Status",
    placeholder: "Overall status",
    options: OVERALL_STATUS_OPTIONS,
  },
  {
    key: "paymentTerms",
    type: "select",
    label: "Payment Terms",
    placeholder: "Payment terms",
    options: PAYMENT_TERMS_OPTIONS,
  },
];

const actionButtonClass =
  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800";

function RequestsHeading() {
  return (
    <div className="mt-3 mb-2 px-1 pb-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        All requests
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Every purchase request, at any stage - edit or delete as admin
      </p>
    </div>
  );
}

export default function AdminRequestsTable() {
  const queryClient = useQueryClient();
  const { getViewPathName, getAdminEditPathName, navigate } =
    useDashboardRoutes();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState({
    show: false,
    type: "",
    message: "",
  });

  const table = useTableQuery({
    queryKeyPrefix: ["adminPurchases"],
    fetchFn: fetchApproverPurchases,
  });

  const handleDeleted = (message) => {
    setAlertInfo({ show: true, type: "success", message });
    // Every purchases table/count shares these prefixes
    for (const key of [
      "adminPurchases",
      "purchases",
      "staffPurchases",
      "ApprovalCardCounts",
      "adminAuditLog",
    ]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const columns = [
    {
      key: "submissionDate",
      label: "Date Submitted",
      render: (p) => formatDateLong(p.createdAt),
    },
    {
      key: "reference_number",
      label: "Reference",
      render: (p) => (
        <Link
          href={getViewPathName(p.id)}
          className="hover:text-blue-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {p.reference_number}
        </Link>
      ),
    },
    { key: "staffName", label: "Staff", render: (p) => p.staffName },
    { key: "payrollNo", label: "Payroll", render: (p) => p.payrollNo },
    {
      key: "terms",
      label: "Payment Terms",
      render: (p) => p.employee_payment_terms,
    },
    {
      key: "payroll",
      label: "Payroll",
      render: (p) => <TableApprovalStatus status={p.Payroll_Approval} />,
    },
    {
      key: "hr",
      label: "HR",
      render: (p) => <TableApprovalStatus status={p.HR_Approval} />,
    },
    {
      key: "cc",
      label: "Credit",
      render: (p) => <TableApprovalStatus status={p.CC_Approval} />,
    },
    {
      key: "bi",
      label: "Invoicing",
      render: (p) => <TableApprovalStatus status={p.BI_Approval} />,
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
        heading={<RequestsHeading />}
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
        onRowClick={(p) => navigate(getAdminEditPathName(p.id))}
        renderActions={(p) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="View"
              onClick={(e) => {
                e.stopPropagation();
                navigate(getViewPathName(p.id));
              }}
              className={`${actionButtonClass} text-gray-700 dark:text-gray-300`}
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(getAdminEditPathName(p.id));
              }}
              className={`${actionButtonClass} text-gray-700 dark:text-gray-300`}
            >
              <PencilLine className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(p);
                setDeleteOpen(true);
              }}
              className={`${actionButtonClass} text-red-600 dark:text-red-400`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      />
      <AdminDeleteRequestDialog
        open={deleteOpen}
        request={deleteTarget}
        onClose={() => setDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </>
  );
}
