"use client";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import DataTable from "./DataTable";
import { useTableQuery } from "./useTableQuery";
import ApprovalCards from "../Reusables/ReusableApprovalCards/ApprovalCards";
import PurchasesHistoryHeading from "../Reusables/Headings/PurchasesHistoryHeading";
import { RecentActionButtons } from "../Reusables/ActionButtons/RecentActionButtons";
import { TableApprovalStatus } from "../Reusables/TableApprovalStatus";
import { useDashboardRoutes } from "@/utils/HandleActionClicks/useDashboardRoutes";
import { formatDateLong } from "@/public/assets";
import Alert from "../Alert";
import ImportExcelData from "../Reusables/Import/ImportExcelData";
import { useLoadingLineStore } from "@/store/useLoadingLineStore";
import { fetchApproverPurchases } from "@/utils/FetchPurchases/fetchApproverPurchases";

const APPROVAL_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "CREDIT", label: "Credit" },
  { value: "CASH AND CREDIT", label: "Cash & Credit" },
];

const FILTER_FIELDS = [
  { key: "search", type: "text", label: "Staff Name", placeholder: "Search staff..." },
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
    label: "Approval Status",
    placeholder: "Approval status",
    options: APPROVAL_STATUS_OPTIONS,
  },
  {
    key: "paymentTerms",
    type: "select",
    label: "Payment Terms",
    placeholder: "Payment terms",
    options: PAYMENT_TERMS_OPTIONS,
  },
];

const DEFAULT_VISIBLE_COLUMNS = {
  submissionDate: true,
  termsOfPayment: true,
  mpesaCode: true,
  creditPeriod: true,
  payrollApproval: true,
  hrApproval: true,
  creditApproval: true,
  invoicingApproval: true,
};

// Shared table for every approver role (hr, payroll, cc, bi) - used on both the
// dashboard home page and the dedicated history page (identical behavior since
// the old 12-day "recent" cap was removed).
export default function ApproverPurchasesTable() {
  const queryClient = useQueryClient();
  const [goingTo, setGoingTo] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [alertInfo, setAlertInfo] = useState({ show: false, type: "", message: "" });

  const startLoading = useLoadingLineStore((state) => state.startLoading);
  const { handleViewClick, handleEditClick, getViewPathName } =
    useDashboardRoutes();

  const table = useTableQuery({
    queryKeyPrefix: ["purchases"],
    fetchFn: fetchApproverPurchases,
  });

  const handleColumnToggle = (key) =>
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));

  const gotoPurchaseEdit = (id) => {
    setGoingTo(id);
    handleEditClick(id);
  };
  const gotoPurchaseView = (id) => {
    setGoingTo(id);
    handleViewClick(id);
  };
  const handleTableRowClick = (row) => {
    startLoading();
    handleViewClick(row.id);
  };

  const handleDeleteSuccess = useCallback(
    (deletedId, message) => {
      setAlertInfo({
        show: true,
        type: "success",
        message: message || "Purchase Request Successfully Deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["ApprovalCardCounts"] });
    },
    [queryClient],
  );

  const handleDeleteError = useCallback((message) => {
    setAlertInfo({
      show: true,
      type: "error",
      message: message || "Error Deleting Purchase Request",
    });
  }, []);

  const columns = [
    {
      key: "submissionDate",
      label: "Date Submitted",
      title: "Date Submitted",
      toggleable: true,
      render: (p) => formatDateLong(p.createdAt),
    },
    {
      key: "reference_number",
      label: "Reference Number",
      title: "Reference Number",
      render: (p) => (
        <Link
          href={getViewPathName(p.id)}
          className="hover:text-blue-400 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            startLoading();
          }}
        >
          {p.reference_number}
        </Link>
      ),
    },
    { key: "staffName", label: "Staff", render: (p) => p.staffName },
    { key: "payrollNo", label: "Payroll", render: (p) => p.payrollNo },
    {
      key: "termsOfPayment",
      label: "Payment Terms",
      title: "Payment Terms",
      toggleable: true,
      render: (p) => p.employee_payment_terms,
    },
    {
      key: "mpesaCode",
      label: "Mpesa Code",
      title: "Mpesa Code",
      toggleable: true,
      render: (p) => p.mpesa_code || "N/A",
    },
    {
      key: "creditPeriod",
      label: "Credit Period",
      title: "Credit Period",
      toggleable: true,
      render: (p) => p.user_credit_period || "N/A",
    },
    {
      key: "payrollApproval",
      label: "Payroll Approval",
      title: "Payroll Approval",
      toggleable: true,
      render: (p) => <TableApprovalStatus status={p.Payroll_Approval} />,
    },
    {
      key: "hrApproval",
      label: "HR Approval",
      title: "HR Approval",
      toggleable: true,
      render: (p) => <TableApprovalStatus status={p.HR_Approval} />,
    },
    {
      key: "creditApproval",
      label: "Credit Approval",
      title: "Credit Approval",
      toggleable: true,
      render: (p) => <TableApprovalStatus status={p.CC_Approval} />,
    },
    {
      key: "invoicingApproval",
      label: "Invoicing Approval",
      title: "Invoicing Approval",
      toggleable: true,
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
      <ApprovalCards filters={table.filters} />
      <DataTable
        heading={<PurchasesHistoryHeading />}
        toolbarExtra={
          <ImportExcelData
            exportAll={true}
            fromDate={table.filters.fromDate}
            toDate={table.filters.toDate}
          />
        }
        columns={columns}
        visibleColumns={visibleColumns}
        onColumnToggle={handleColumnToggle}
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
        onRowClick={handleTableRowClick}
        goingTo={goingTo}
        renderActions={(p) => (
          <RecentActionButtons
            id={p.id}
            gotoPurchaseEdit={gotoPurchaseEdit}
            gotoPurchaseView={gotoPurchaseView}
            hrApproval={p.HR_Approval}
            payrollApproval={p.Payroll_Approval}
            ccApproval={p.CC_Approval}
            biApproval={p.BI_Approval}
            goingTo={goingTo}
            onDeleteSuccess={handleDeleteSuccess}
            onDeleteError={handleDeleteError}
          />
        )}
      />
    </>
  );
}
