"use client";
import { useState } from "react";
import { UserCog } from "lucide-react";
import DataTable from "../DataTable/DataTable";
import { useTableQuery } from "../DataTable/useTableQuery";
import Alert from "../Alert";
import UserStatusBadge from "./UserStatusBadge";
import ManageUserModal from "./ManageUserModal";
import { fetchAdminUsers } from "@/utils/FetchAdmin/fetchAdmin";
import {
  ROLE_LABELS,
  ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
} from "@/utils/Admin/adminConstants";
import { formatDateLong } from "@/public/assets";

const FILTER_FIELDS = [
  {
    key: "search",
    type: "text",
    label: "Name / Email / Payroll",
    placeholder: "Search name, email or payroll no...",
  },
  {
    key: "role",
    type: "select",
    label: "Role",
    placeholder: "Role",
    options: ROLE_OPTIONS,
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    placeholder: "Status",
    options: USER_STATUS_OPTIONS,
  },
  {
    key: "department",
    type: "text",
    label: "Department",
    placeholder: "Department...",
  },
];

function UsersHeading() {
  return (
    <div className="mt-3 mb-2 px-1 pb-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Users
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Every registered account - select one to manage it
      </p>
    </div>
  );
}

// Admin user directory. Row click (or Manage) opens ManageUserModal, which
// runs every account action and keeps this table's query fresh.
export default function AdminUsersTable() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState({
    show: false,
    type: "",
    message: "",
  });

  const table = useTableQuery({
    queryKeyPrefix: ["adminUsers"],
    fetchFn: fetchAdminUsers,
  });

  const openUser = (user) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const columns = [
    { key: "name", label: "Name", render: (u) => u.name },
    { key: "email", label: "Email", render: (u) => u.email },
    {
      key: "payrollNo",
      label: "Payroll",
      render: (u) => u.payrollNo || "-",
    },
    {
      key: "department",
      label: "Department",
      render: (u) => u.department || "-",
    },
    {
      key: "role",
      label: "Role",
      render: (u) => ROLE_LABELS[u.role] ?? u.role,
    },
    {
      key: "status",
      label: "Status",
      render: (u) => <UserStatusBadge user={u} />,
    },
    {
      key: "requestCount",
      label: "Requests",
      render: (u) => u.requestCount,
    },
    {
      key: "createdAt",
      label: "Registered",
      render: (u) => formatDateLong(u.created_at),
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
        heading={<UsersHeading />}
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
        onRowClick={openUser}
        emptyMessage="No users found"
        filteredEmptyMessage="No users match the active filters."
        errorMessage="Failed to load users. Please try refreshing the page."
        renderActions={(u) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openUser(u);
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <UserCog className="h-4 w-4" />
            Manage
          </button>
        )}
      />
      <ManageUserModal
        open={modalOpen}
        user={selectedUser}
        onClose={() => setModalOpen(false)}
        onResult={(type, message) =>
          setAlertInfo({ show: true, type, message })
        }
      />
    </>
  );
}
