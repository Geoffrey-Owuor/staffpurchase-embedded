import { FORM_DATETIME } from "@/lib/adminForm";
import { parseCreditPeriod, usesCredit } from "@/utils/formatCreditPeriod";

// Credit periods (credit_periods) and extended credit windows
// (credit_extension_windows) - db/migrations/2026-10-21_credit_periods.sql.
// A period is always offered, or (requires_extension) only while an active
// window covers NOW() with max_months >= the period. Windows are
// deliberately uncached, like Staff Offers: the DB's NOW() decides on every
// lookup, so a window stops the minute it ends.

// A window as the forms and badges use it
const WINDOW_SELECT = `SELECT w.id, w.name, w.max_months AS maxMonths,
    DATE_FORMAT(w.ends_at, '${FORM_DATETIME}') AS endsAt
  FROM credit_extension_windows w`;

// The window that allows `months` at NOW() - or, with `purchaseId`, at that
// request's submission time (the admin editor). Latest-ending wins when
// several overlap. Returns null when none does.
export async function findCreditWindow(
  connection,
  months,
  { purchaseId } = {},
) {
  const at = purchaseId
    ? `(SELECT createdAt FROM purchasesinfo WHERE id = ?)`
    : `NOW()`;
  const [rows] = await connection.execute(
    `${WINDOW_SELECT}
     WHERE w.is_active = 1 AND ${at} BETWEEN w.starts_at AND w.ends_at
       AND w.max_months >= ?
     ORDER BY w.ends_at DESC, w.id DESC LIMIT 1`,
    purchaseId ? [purchaseId, months] : [months],
  );
  return rows[0] ?? null;
}

// What the New Purchase form may offer right now: active always-on periods,
// plus active extension-only ones up to the longest live window. `extension`
// is that window (for the "available until" hint), or null.
export async function loadAvailableCreditPeriods(connection) {
  const [[periods], [windows]] = await Promise.all([
    connection.execute(
      `SELECT period_value, period_description, requires_extension
       FROM credit_periods WHERE is_active = 1 ORDER BY period_value ASC`,
    ),
    connection.execute(
      `${WINDOW_SELECT}
       WHERE w.is_active = 1 AND NOW() BETWEEN w.starts_at AND w.ends_at
       ORDER BY w.max_months DESC, w.ends_at DESC, w.id DESC LIMIT 1`,
    ),
  ]);
  const extension = windows[0] ?? null;
  const maxMonths = extension?.maxMonths ?? 0;

  return {
    periods: periods
      .filter((p) => !p.requires_extension || p.period_value <= maxMonths)
      .map((p) => ({
        ...p,
        requires_extension: Boolean(p.requires_extension),
      })),
    extension,
  };
}

export class CreditPeriodError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Validates a new request's credit period against the DB (never trusting
// the form's list) and returns what to store: { months, extensionId }.
// Cash requests store no period.
export async function resolveRequestCreditPeriod(
  connection,
  paymentTerms,
  rawMonths,
) {
  if (!usesCredit(paymentTerms)) return { months: null, extensionId: null };

  const months = parseCreditPeriod(rawMonths);
  if (months === null) {
    throw new CreditPeriodError(400, "Choose a credit period");
  }

  const [rows] = await connection.execute(
    `SELECT is_active, requires_extension FROM credit_periods WHERE period_value = ?`,
    [months],
  );
  if (rows.length === 0 || !rows[0].is_active) {
    throw new CreditPeriodError(
      400,
      "That credit period isn't offered - choose another one",
    );
  }
  if (!rows[0].requires_extension) return { months, extensionId: null };

  const window = await findCreditWindow(connection, months);
  if (!window) {
    throw new CreditPeriodError(
      409,
      `A ${months}-month credit period isn't available right now (no extended credit window is open). Choose a shorter period.`,
    );
  }
  return { months, extensionId: window.id };
}

// The admin request editor's counterpart, for an override: any known
// period is accepted (even an inactive one), and an extension-only one is
// attributed to the window that covered the request's submission, if any.
// Returns the credit_extension_id to store.
export async function resolveAdminCreditExtension(
  connection,
  purchaseId,
  paymentTerms,
  months,
) {
  if (!usesCredit(paymentTerms) || months == null) return null;

  const [rows] = await connection.execute(
    `SELECT requires_extension FROM credit_periods WHERE period_value = ?`,
    [months],
  );
  if (rows.length === 0) {
    throw new CreditPeriodError(
      400,
      "Credit period isn't one of the credit periods in Reference data",
    );
  }
  if (!rows[0].requires_extension) return null;

  const window = await findCreditWindow(connection, months, { purchaseId });
  return window?.id ?? null;
}
