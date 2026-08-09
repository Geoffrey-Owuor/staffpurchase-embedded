"use client";
import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import DataTable from "./DataTable";
import { useTableQuery } from "./useTableQuery";
import TrackingApprovalCards from "../Reusables/ReusableApprovalCards/TrackingApprovalCards";
import { RecentActionButtons } from "../Reusables/ActionButtons/RecentActionButtons";
import { useDashboardRoutes } from "@/utils/HandleActionClicks/useDashboardRoutes";
import { formatDateLong } from "@/public/assets";
import {
  PaymentStatus,
  TableApprovalStatus,
} from "../Reusables/TableApprovalStatus";
import Alert from "../Alert";
import ImportExcelData from "../Reusables/Import/ImportExcelData";
import { FetchPeriodsPolicies } from "@/app/lib/FetchPeriodsPolicies";
import { useLoadingLineStore } from "@/store/useLoadingLineStore";
import { fetchPaymentTrackingPurchases } from "@/utils/FetchPurchases/fetchPaymentTrackingPurchases";

const PAYMENT_TERMS_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "CREDIT", label: "Credit" },
  { value: "CASH AND CREDIT", label: "Cash & Credit" },
];

const CLOSURE_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

const DEFAULT_VISIBLE_COLUMNS = {
  submissionDate: true,
  nameOfStaff: true,
  termsOfPayment: true,
  mpesaCode: true,
  creditPeriod: true,
  invoiceAmount: true,
};

// cc-only "Fully Approved Requests" view - purchases with BI_Approval already
// 'approved', with a Close action instead of Delete/Edit.
export default function PaymentTrackingTable() {
  const queryClient = useQueryClient();
  const [goingTo, setGoingTo] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [alertInfo, setAlertInfo] = useState({ show: false, type: "", message: "" });
  const [periods, setPeriods] = useState([]);

  const startLoading = useLoadingLineStore((state) => state.startLoading);
  const { handleViewClick, handleEditClick, getViewPathName } =
    useDashboardRoutes();

  useEffect(() => {
    FetchPeriodsPolicies().then(({ periods }) => setPeriods(periods));
  }, []);

  const periodOptions = periods.map((period) => ({
    value: period.period_value,
    label: period.period_description,
  }));

  const table = useTableQuery({
    queryKeyPrefix: ["paymentTracking"],
    fetchFn: fetchPaymentTrackingPurchases,
  });

  const FILTER_FIELDS = [
    { key: "search", type: "text", placeholder: "Search staff..." },
    { key: "referenceNumber", type: "text", placeholder: "Reference number..." },
    { key: "payrollNumber", type: "text", placeholder: "Payroll number..." },
    { key: "date", type: "dateRange" },
    {
      key: "paymentTerms",
      type: "select",
      placeholder: "Payment terms",
      options: PAYMENT_TERMS_OPTIONS,
    },
    {
      key: "monthPeriod",
      type: "select",
      placeholder: "Credit period",
      options: periodOptions,
    },
    {
      key: "requestClosure",
      type: "select",
      placeholder: "Request closure",
      options: CLOSURE_OPTIONS,
    },
  ];

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

  const handleCloseSuccess = useCallback(
    (message) => {
      setAlertInfo({
        show: true,
        type: "success",
        message: message || "Request successfully closed",
      });
      queryClient.invalidateQueries({ queryKey: ["paymentTracking"] });
      queryClient.invalidateQueries({ queryKey: ["TrackingApprovalCardCounts"] });
    },
    [queryClient],
  );

  const handleCloseError = useCallback((message) => {
    setAlertInfo({
      show: true,
      type: "error",
      message: message || "Error closing the request",
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
    {
      key: "nameOfStaff",
      label: "Staff",
      toggleable: true,
      render: (p) => p.staffName,
    },
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
      key: "invoiceAmount",
      label: "Invoice Amount",
      title: "Invoice Amount",
      toggleable: true,
      render: (p) => (
        <div className="mr-3 rounded-xl border border-gray-300 px-6 py-2 dark:border-gray-600">
          {p.invoice_amount || "N/A"}
        </div>
      ),
    },
    {
      key: "invoicingApproval",
      label: "Invoicing Approval",
      title: "Invoicing Approval",
      render: (p) => <TableApprovalStatus status={p.BI_Approval || "N/A"} />,
    },
    {
      key: "requestClosure",
      label: "Request Closure",
      title: "Request Closure",
      render: (p) => <PaymentStatus status={p.request_closure || "N/A"} />,
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
      <TrackingApprovalCards filters={table.filters} />
      <DataTable
        heading={
          <div className="mt-3 mb-2 px-1 pb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Fully Approved Requests
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Purchase requests approved by all approvers
            </p>
          </div>
        }
        toolbarExtra={
          <ImportExcelData
            fromDate={table.filters.fromDate}
            toDate={table.filters.toDate}
          />
        }
        columns={columns}
        visibleColumns={visibleColumns}
        onColumnToggle={handleColumnToggle}
        filterFields={FILTER_FIELDS}
        filters={table.filters}
        onFilterChange={table.setFilter}
        onClearFilters={table.clearAllFilters}
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
            ccApproval={p.CC_Approval}
            hrApproval={p.HR_Approval}
            payrollApproval={p.Payroll_Approval}
            biApproval={p.BI_Approval}
            goingTo={goingTo}
            closeButton={true}
            closureValue={p.request_closure}
            onCloseSuccess={handleCloseSuccess}
            onCloseError={handleCloseError}
            disableDelete={true}
          />
        )}
      />
    </>
  );
}
