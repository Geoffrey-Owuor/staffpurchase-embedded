// lib/registrationStaff.js
// Server-only: works out which staff record a registration is for, from the
// Hub staff directory (lib/staffDirectory.js). A personal email is matched
// by the email itself (only staff emails on file are sent a code at all); a
// company email by the payroll number its owner types. The account's name
// and payroll number always come from that record, never from the client,
// and so does its department when it matches an active one of ours.
import { CachedDepartments } from "@/utils/Cache/CachedConditions";
import { isCompanyEmail, lookupStaff, payrollKey } from "@/lib/staffDirectory";

const UNAVAILABLE = {
  status: 503,
  message:
    "We can't check staff records right now. Please try again in a few minutes.",
};

export const DUPLICATE_PAYROLL_MESSAGE =
  "An account already exists for this payroll number. Sign in with it, or contact the administrator.";

// The active department whose name matches the staff record's (ignoring
// case and spaces), or null when the user has to pick one
async function matchDepartment(staffDepartment) {
  const key = (staffDepartment || "").trim().toLowerCase();
  if (!key) return null;
  const departments = await CachedDepartments();
  const match = departments.find(
    (d) => d.is_active && d.name.trim().toLowerCase() === key,
  );
  return match ? match.name : null;
}

// Whether another account already uses this payroll number. Pass `lock`
// inside the registration transaction.
export async function payrollNoTaken(conn, payrollNo, { lock = false } = {}) {
  const [rows] = await conn.execute(
    `SELECT id FROM users WHERE UPPER(TRIM(payrollNo)) = ? LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [payrollKey(payrollNo)],
  );
  return rows.length > 0;
}

// Resolves to { staff: { staffNumber, name, department } } - department is
// our matching active department or null - or to { status, message } when
// this registration can't go ahead.
export async function resolveRegistrationStaff(conn, email, payrollNo) {
  const company = isCompanyEmail(email);
  if (company && !payrollKey(payrollNo)) {
    return { status: 400, message: "Enter your payroll number" };
  }

  const lookup = company
    ? await lookupStaff({ staffNumber: payrollNo.trim() })
    : await lookupStaff({ email });
  if (lookup.status === "unavailable") return UNAVAILABLE;
  if (lookup.status === "not_found" || !lookup.active) {
    return company
      ? {
          status: 404,
          message:
            "We couldn't find an active staff record with this payroll number. Check it, or contact HR.",
        }
      : {
          status: 403,
          message:
            "Your staff record can't be used to register. Please contact HR.",
        };
  }

  if (await payrollNoTaken(conn, lookup.staff.staffNumber)) {
    return { status: 409, message: DUPLICATE_PAYROLL_MESSAGE };
  }

  return {
    staff: {
      staffNumber: lookup.staff.staffNumber,
      name: lookup.staff.name,
      department: await matchDepartment(lookup.staff.department),
    },
  };
}
