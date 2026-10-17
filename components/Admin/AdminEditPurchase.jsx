"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ClipboardPen,
  HandCoins,
  History,
  Loader2,
  PackagePlus,
  PlusCircle,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import StaffInformation from "../StaffInformation";
import PaymentDetails from "../PaymentDetails";
import ProductPricing from "../ProductPricing/ProductPricing";
import Select from "../Reusables/Select";
import ConfirmationDialog from "../Reusables/ConfirmationDialog";
import EditFormSkeleton from "../skeletons/EditFormSkeleton";
import Alert from "../Alert";
import AdminStageFields from "./AdminStageFields";
import AdminDeleteRequestDialog from "./AdminDeleteRequestDialog";
import { FetchPeriodsPolicies } from "@/app/lib/FetchPeriodsPolicies";
import {
  fetchAdminAuditLog,
  fetchAdminPurchase,
  saveAdminPurchase,
} from "@/utils/FetchAdmin/fetchAdmin";
import { APPROVAL_STAGES, stagesFrom } from "@/utils/Approvals/approvalStages";
import { REASON_MAX_LENGTH } from "@/utils/Admin/adminConstants";
import { useDashboardRoutes } from "@/utils/HandleActionClicks/useDashboardRoutes";
import { useUser } from "@/context/UserContext";

const EMPTY_PRODUCT = {
  itemName: "",
  itemStatus: "",
  productPolicy: "",
  productCode: "",
  priceCode: "",
  tdPrice: "",
  discountRate: "",
  discountedValue: "",
  tradePrice: "",
  retailPrice: "",
  onlinePrice: "",
  staffOfferPrice: "",
  staffOfferId: "",
};

const STAGE_DATA_FIELDS = APPROVAL_STAGES.flatMap((stage) => stage.dataFields);

const toFormValue = (value) => (value == null ? "" : value);

// Stable React keys for product rows, so removing one doesn't hand its
// fetch state to the next row (the server ignores `_key`).
let nextRowKey = 0;
const newRowKey = () => `row-${++nextRowKey}`;

const invalidatePurchaseQueries = (queryClient) => {
  for (const key of [
    "adminPurchases",
    "adminPurchase",
    "purchases",
    "staffPurchases",
    "ApprovalCardCounts",
    "adminAuditLog",
    "purchaseDetails",
    "paymentTracking",
    "TrackingApprovalCardCounts",
  ]) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
};

// Admin override editor for one request (any stage). Saves through
// PUT /api/admin/purchases/[id] - audited, version-checked, never marks a
// stage approved (it can only reopen stages).
export default function AdminEditPurchase({ id }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["adminPurchase", id],
    queryFn: () => fetchAdminPurchase(id),
    staleTime: 0,
  });

  const [periods, setPeriods] = useState([]);
  const [discountPolicies, setDiscountPolicies] = useState([]);
  useEffect(() => {
    FetchPeriodsPolicies().then(({ periods, policies }) => {
      setPeriods(periods);
      setDiscountPolicies(policies);
    });
  }, []);

  if (isLoading) return <EditFormSkeleton />;
  if (isError || !data) {
    return (
      <div className="mx-auto p-6 text-center">
        <div className="mb-4 rounded-lg bg-yellow-100 p-4 text-yellow-700 dark:bg-yellow-900 dark:text-white">
          This request couldn&apos;t be loaded - it may have been deleted.
        </div>
        <Link
          href="/dashboard/admin/requests"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Back to all requests
        </Link>
      </div>
    );
  }

  // Keyed by version: a save or reload resets the form to the stored state.
  return (
    <EditForm
      key={data.version}
      id={id}
      data={data}
      periods={periods}
      discountPolicies={discountPolicies}
      onReload={refetch}
      reloading={isFetching}
    />
  );
}

function EditForm({
  id,
  data,
  periods,
  discountPolicies,
  onReload,
  reloading,
}) {
  const user = useUser();
  const queryClient = useQueryClient();
  const { getViewPathName, adminRequestsPath, navigate } = useDashboardRoutes();
  const { purchase } = data;

  const [staffInfo, setStaffInfo] = useState(() => ({
    staffName: toFormValue(purchase.staffName),
    payrollNo: toFormValue(purchase.payrollNo),
    department: toFormValue(purchase.department),
  }));
  const [paymentInfo, setPaymentInfo] = useState(() => ({
    employee_payment_terms: toFormValue(purchase.employee_payment_terms),
    invoicing_location: toFormValue(purchase.invoicing_location),
    delivery_details: toFormValue(purchase.delivery_details),
    mpesa_code: toFormValue(purchase.mpesa_code),
    user_credit_period: toFormValue(purchase.user_credit_period),
    createdAt: purchase.createdAt,
  }));
  const [stageData, setStageData] = useState(() =>
    Object.fromEntries(
      STAGE_DATA_FIELDS.map((key) => [key, toFormValue(purchase[key])]),
    ),
  );
  const [products, setProducts] = useState(() =>
    data.products.map((product) => ({
      ...EMPTY_PRODUCT,
      ...Object.fromEntries(
        Object.entries(product).map(([k, v]) => [k, toFormValue(v)]),
      ),
      id: product.id,
      _key: newRowKey(),
    })),
  );
  // Stored rows by id, for "Restore recorded price" and the unchanged check
  const recordedById = useMemo(
    () => new Map(data.products.map((p) => [p.id, p])),
    [data.products],
  );

  const [reopenFromStage, setReopenFromStage] = useState("");
  const [reason, setReason] = useState("");
  const [notifyRequester, setNotifyRequester] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState({
    show: false,
    type: "",
    message: "",
  });

  const [fetchingIndices, setFetchingIndices] = useState(() => new Set());
  const handleFetchStatusChange = (index, isFetching) =>
    setFetchingIndices((prev) => {
      const next = new Set(prev);
      if (isFetching) next.add(index);
      else next.delete(index);
      return next;
    });

  const purchaseTotal = products.reduce(
    (total, p) => total + (parseFloat(p.discountedValue) || 0),
    0,
  );

  const isInvoiced = purchase.BI_Approval === "approved";
  const reopenStages = reopenFromStage ? stagesFrom(reopenFromStage) : [];
  const reopenOptions = [
    { value: "", label: "Keep current approvals" },
    ...APPROVAL_STAGES.map((stage) => ({
      value: stage.key,
      label: `Reopen from ${stage.label}`,
    })),
  ];

  const handleStaffChange = (e) =>
    setStaffInfo((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handlePaymentChange = (e) =>
    setPaymentInfo((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleProductChange = (index, e) =>
    setProducts((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, [e.target.name]: e.target.value } : p,
      ),
    );
  const setProductData = (index, updater) =>
    setProducts((prev) =>
      prev.map((p, i) =>
        i === index
          ? typeof updater === "function"
            ? updater(p)
            : { ...p, ...updater }
          : p,
      ),
    );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setShowConfirm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { createdAt, ...paymentFields } = paymentInfo;
      const result = await saveAdminPurchase(id, {
        version: data.version,
        reason: reason.trim(),
        notifyRequester,
        reopenFromStage: reopenFromStage || null,
        purchase: { ...staffInfo, ...paymentFields, ...stageData },
        products,
      });
      setAlertInfo({ show: true, type: "success", message: result.message });
      // The fresh copy re-keys this form (new version)
      queryClient.setQueryData(["adminPurchase", id], {
        purchase: result.purchase,
        products: result.products,
        version: result.version,
      });
      invalidatePurchaseQueries(queryClient);
    } catch (err) {
      setError({ message: err.message, conflict: err.status === 409 });
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  const confirmMessage = [
    `Save your changes to ${purchase.reference_number}?`,
    reopenStages.length > 0
      ? `${reopenStages.map((s) => s.label).join(", ")} will go back to pending and their sign-offs will be cleared.`
      : "",
    notifyRequester ? "The requester will be emailed." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {alertInfo.show && (
        <Alert
          message={alertInfo.message}
          type={alertInfo.type}
          onClose={() => setAlertInfo({ show: false, message: "", type: "" })}
        />
      )}

      <div className="mx-auto leading-relaxed dark:text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-2 pb-4">
          <div className="flex items-center gap-2 text-gray-900 dark:text-gray-200">
            <ClipboardPen className="h-6 w-6" />
            <h1 className="text-xl font-semibold">
              Admin Edit - {purchase.reference_number}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={getViewPathName(id)}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              View request
            </Link>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        <p className="mx-2 mb-4 rounded-lg bg-blue-50 p-2 text-xs text-blue-900 dark:bg-blue-950 dark:text-blue-200">
          Admin override: changes skip the approval workflow and its emails, and
          are recorded in the audit log with your reason. Approval stages can
          only be reopened here, never approved.
        </p>
        {isInvoiced && (
          <p className="mx-2 mb-4 flex items-start gap-2 rounded-lg bg-amber-100 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            This request is already invoiced. Changing products or amounts
            won&apos;t change the invoice - update the invoice details below
            too, or reopen Billing & Invoicing.
          </p>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <StaffInformation
            formData={staffInfo}
            handleChange={handleStaffChange}
            userRole={user.role}
            approversPurchasing={true}
          />
          <PaymentDetails
            formData={paymentInfo}
            handleChange={handlePaymentChange}
            userRole={user.role}
            periods={periods}
            approversPurchasing={true}
          />

          <div className="mt-8 mb-4 flex items-center gap-2 px-2 text-gray-900 dark:text-white">
            <PackagePlus className="h-6 w-6" />
            <span className="text-xl font-semibold">
              Product & Pricing Details
            </span>
          </div>
          {products.map((product, index) => (
            <div key={product._key} className="relative mb-4 space-y-4">
              <ProductPricing
                formData={product}
                handleChange={(e) => handleProductChange(index, e)}
                setFormData={(update) => setProductData(index, update)}
                discountPolicies={discountPolicies}
                productNumber={index + 1}
                userRole={user.role}
                approversPurchasing={true}
                paymentTerms={paymentInfo.employee_payment_terms}
                onFetchStatusChange={(isFetching) =>
                  handleFetchStatusChange(index, isFetching)
                }
                recordedProduct={recordedById.get(product.id)}
                adminEdit
              />
              {products.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setProducts((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="absolute top-4 right-6 rounded-full p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-[#4c2e2f]"
                  title="Remove Product"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
          <div className="my-4 flex flex-col items-center space-y-3 px-2 md:flex-row md:justify-between md:space-y-0">
            <span className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2.5 text-sm dark:bg-slate-900">
              <HandCoins className="h-4.5 w-4.5" />
              Total Purchase Value:{" "}
              <span className="font-bold">{`Ksh ${purchaseTotal.toFixed(2)}`}</span>
            </span>
            <button
              type="button"
              onClick={() =>
                setProducts((prev) => [
                  ...prev,
                  { ...EMPTY_PRODUCT, _key: newRowKey() },
                ])
              }
              className="flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              <PlusCircle className="h-5 w-5" />
              Add Product
            </button>
          </div>

          <h2 className="mt-8 mb-4 px-2 text-xl font-semibold text-gray-900 dark:text-white">
            Approval Stage Details
          </h2>
          <AdminStageFields
            purchase={purchase}
            values={stageData}
            onChange={(name, value) =>
              setStageData((prev) => ({ ...prev, [name]: value }))
            }
          />

          <section className="mx-2 mt-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
              Approvals
            </h3>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Reopening sends the request back through the chain from that
              stage: it and every later stage return to pending with their
              sign-offs cleared, and Payment Tracking closure reopens.
            </p>
            <Select
              id="admin-reopen"
              className="md:w-80"
              value={reopenFromStage}
              onChange={setReopenFromStage}
              options={reopenOptions}
              placeholder="Keep current approvals"
            />
            {reopenStages.length > 0 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Will reset: {reopenStages.map((s) => s.label).join(" → ")}.
                {reopenFromStage === "payroll" &&
                  purchase.employee_payment_terms === "CASH" &&
                  " Cash requests are normally auto-approved at Payroll - a payroll approver will now need to approve it."}
              </p>
            )}
          </section>

          <section className="mx-2 mt-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <label
              htmlFor="admin-edit-reason"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400"
            >
              Reason for this change{" "}
              <span className="font-normal text-gray-500">
                (required, recorded in the audit log)
              </span>
            </label>
            <textarea
              id="admin-edit-reason"
              rows={2}
              required
              maxLength={REASON_MAX_LENGTH}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Product manager approved an offer price; wrong product code entered..."
              className="w-full rounded-xl border border-gray-200 bg-white px-2 py-[11px] text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={notifyRequester}
                onChange={(e) => setNotifyRequester(e.target.checked)}
              />
              Email the requester a summary of this change
            </label>
          </section>

          {error && (
            <div
              role="alert"
              className="mx-2 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              <span>{error.message}</span>
              {error.conflict && (
                <button
                  type="button"
                  onClick={onReload}
                  disabled={reloading}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900"
                >
                  <RotateCcw
                    className={`h-3.5 w-3.5 ${reloading ? "animate-spin" : ""}`}
                  />
                  Load latest (discards your edits)
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || fetchingIndices.size > 0 || !reason.trim()}
            className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Save changes
          </button>
          {!reason.trim() && (
            <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
              Add a reason to save.
            </p>
          )}
        </form>

        <AdminRequestHistory id={id} />
      </div>

      <ConfirmationDialog
        title="Save admin changes"
        message={confirmMessage}
        showDialog={showConfirm}
        onConfirm={handleSave}
        onCancel={() => setShowConfirm(false)}
        busy={saving}
        busyLabel="Saving..."
      />
      <AdminDeleteRequestDialog
        open={deleteOpen}
        request={purchase}
        onClose={() => setDeleteOpen(false)}
        onDeleted={(message) => {
          invalidatePurchaseQueries(queryClient);
          setAlertInfo({ show: true, type: "success", message });
          setTimeout(() => navigate(adminRequestsPath), 700);
        }}
      />
    </>
  );
}

// This request's admin audit entries (newest first).
function AdminRequestHistory({ id }) {
  const { data, isLoading } = useQuery({
    queryKey: ["adminAuditLog", { targetType: "purchase", targetId: id }],
    queryFn: () =>
      fetchAdminAuditLog({
        targetType: "purchase",
        targetId: id,
        pageSize: 20,
      }),
  });
  const entries = data?.data ?? [];

  return (
    <section className="mx-2 mt-10 mb-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
        <History className="h-4 w-4" />
        Admin history
      </h3>
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No admin changes to this request yet.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {entries.map((entry) => (
            <li key={entry.id} className="text-gray-700 dark:text-gray-300">
              <span className="font-semibold">
                {new Date(entry.created_at).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>{" "}
              · {entry.admin_name || entry.admin_email} ·{" "}
              <span className="whitespace-pre-line">{entry.reason || "—"}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Field-level changes are in the{" "}
        <Link
          href="/dashboard/admin/audit-log"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          audit log
        </Link>
        .
      </p>
    </section>
  );
}
