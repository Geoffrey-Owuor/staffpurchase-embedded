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
import { useLoadingLineStore } from "@/store/useLoadingLineStore";
import { fetchStaffPurchases } from "@/utils/FetchPurchases/fetchStaffPurchases";

const APPROVAL_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "CREDIT", label: "Credit" },
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

// Staff's own purchase history/home view. Staff only ever see their own
// requests (session-scoped server-side), so staffName search isn't offered here.
export default function StaffPurchasesTable() {
  const queryClient = useQueryClient();
  const { handleViewClick, getViewPathName } = useDashboardRoutes();
  const [goingTo, setGoingTo] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [alertInfo, setAlertInfo] = useState({
    show: false,
    type: "",
    message: "",
  });

  const startLoading = useLoadingLineStore((state) => state.startLoading);

  const table = useTableQuery({
    queryKeyPrefix: ["staffPurchases"],
    fetchFn: fetchStaffPurchases,
  });

  const handleColumnToggle = (key) =>
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));

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
      queryClient.invalidateQueries({ queryKey: ["staffPurchases"] });
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
            gotoPurchaseEdit={() => {}}
            gotoPurchaseView={gotoPurchaseView}
            hrApproval={p.HR_Approval}
            payrollApproval={p.Payroll_Approval}
            ccApproval={p.CC_Approval}
            biApproval={p.BI_Approval}
            goingTo={goingTo}
            disableEdit={true}
            onDeleteSuccess={handleDeleteSuccess}
            onDeleteError={handleDeleteError}
          />
        )}
      />
    </>
  );
}
