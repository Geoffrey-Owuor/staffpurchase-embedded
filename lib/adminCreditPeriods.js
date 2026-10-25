// The admin side of credit periods and extended credit windows
// (db/migrations/2026-10-21_credit_periods.sql), used by
// app/api/admin/credit-periods. What requests may choose is decided in
// lib/creditPeriods.js; this file only keeps the data valid.
import {
  CREDIT_PERIOD_LABEL_MAX_LENGTH,
  CREDIT_PERIOD_MAX_MONTHS,
  CREDIT_WINDOW_NAME_MAX_LENGTH,
} from "@/utils/Admin/adminConstants";
import { formatCreditPeriod } from "@/utils/formatCreditPeriod";
import {
  FORM_DATETIME,
  RouteError,
  dbNow,
  readDateTime,
  toDbDateTime,
} from "@/lib/adminForm";

// Status from is_active + the window, evaluated by the DB (the same clock
// lib/creditPeriods.js uses). An end is inclusive (stored HH:mm:59).
export const WINDOW_STATUS_SQL = {
  inactive: `w.is_active = 0`,
  ended: `w.is_active = 1 AND w.ends_at < NOW()`,
  scheduled: `w.is_active = 1 AND w.starts_at > NOW()`,
  live: `w.is_active = 1 AND NOW() BETWEEN w.starts_at AND w.ends_at`,
};

const STATUS_CASE = `CASE
    WHEN ${WINDOW_STATUS_SQL.inactive} THEN 'inactive'
    WHEN ${WINDOW_STATUS_SQL.ended} THEN 'ended'
    WHEN ${WINDOW_STATUS_SQL.scheduled} THEN 'scheduled'
    ELSE 'live' END`;

const WINDOW_COLUMNS = `w.id, w.name, w.max_months AS maxMonths, w.is_active,
    DATE_FORMAT(w.starts_at, '${FORM_DATETIME}') AS startsAt,
    DATE_FORMAT(w.ends_at, '${FORM_DATETIME}') AS endsAt,
    w.promo_id AS promoId, sp.name AS promoName,
    w.created_by_name AS createdByName, w.created_at AS createdAt,
    ${STATUS_CASE} AS status`;

const toWindow = ({ is_active, requestCount, ...row }) => ({
  ...row,
  isActive: Boolean(is_active),
  requestCount: Number(requestCount ?? 0),
});

// What the audit log records for a window
export const windowSnapshot = (window) => ({
  name: window.name,
  maxMonths: window.maxMonths,
  startsAt: window.startsAt,
  endsAt: window.endsAt,
  isActive: window.isActive,
  promoId: window.promoId,
});

export const periodSnapshot = (row) => ({
  months: row.period_value,
  label: row.period_description,
  is_active: Boolean(row.is_active),
  requires_extension: Boolean(row.requires_extension),
});

// Everything the admin section shows: periods (with how many requests use
// each), windows (live first) and the promos a new window can copy dates
// from (active, not yet ended).
export async function loadCreditAdminData(connection) {
  const [[periods], [windows], [promos], now] = await Promise.all([
    connection.execute(
      `SELECT cp.period_value, cp.period_description, cp.is_active,
              cp.requires_extension, cp.updated_at,
              (SELECT COUNT(*) FROM purchasesinfo p
               WHERE p.user_credit_period = cp.period_value) AS requestCount
       FROM credit_periods cp ORDER BY cp.period_value ASC`,
    ),
    connection.execute(
      `SELECT ${WINDOW_COLUMNS},
              (SELECT COUNT(*) FROM purchasesinfo p
               WHERE p.credit_extension_id = w.id) AS requestCount
       FROM credit_extension_windows w
       LEFT JOIN staff_offer_promos sp ON sp.id = w.promo_id
       ORDER BY FIELD(${STATUS_CASE}, 'live', 'scheduled', 'ended', 'inactive'),
                w.starts_at DESC, w.id DESC`,
    ),
    connection.execute(
      `SELECT id, name,
              DATE_FORMAT(starts_at, '${FORM_DATETIME}') AS startsAt,
              DATE_FORMAT(ends_at, '${FORM_DATETIME}') AS endsAt
       FROM staff_offer_promos
       WHERE is_active = 1 AND ends_at >= NOW()
       ORDER BY starts_at ASC, id ASC`,
    ),
    dbNow(connection),
  ]);

  return {
    periods: periods.map((row) => ({
      ...row,
      is_active: Boolean(row.is_active),
      requires_extension: Boolean(row.requires_extension),
      requestCount: Number(row.requestCount),
    })),
    windows: windows.map(toWindow),
    promos,
    now,
  };
}

export async function loadPeriod(connection, months) {
  const [rows] = await connection.execute(
    `SELECT * FROM credit_periods WHERE period_value = ? FOR UPDATE`,
    [months],
  );
  if (rows.length === 0) throw new RouteError(404, "Credit period not found");
  return rows[0];
}

export async function loadWindow(connection, id, { lock = false } = {}) {
  const [rows] = await connection.execute(
    `SELECT ${WINDOW_COLUMNS} FROM credit_extension_windows w
     LEFT JOIN staff_offer_promos sp ON sp.id = w.promo_id
     WHERE w.id = ?${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  if (rows.length === 0) {
    throw new RouteError(404, "Extended credit window not found");
  }
  return toWindow(rows[0]);
}

export function readMonths(value) {
  const months = Number(value);
  if (
    !Number.isInteger(months) ||
    months < 1 ||
    months > CREDIT_PERIOD_MAX_MONTHS
  ) {
    throw new RouteError(
      400,
      `Months must be a whole number from 1 to ${CREDIT_PERIOD_MAX_MONTHS}`,
    );
  }
  return months;
}

// Empty -> the standard wording ("5 months")
export function readPeriodLabel(value, months) {
  const label = typeof value === "string" ? value.trim() : "";
  if (label.length > CREDIT_PERIOD_LABEL_MAX_LENGTH) {
    throw new RouteError(400, "Label is too long");
  }
  return label || formatCreditPeriod(months);
}

// Credit requests always need something to choose: at least one active,
// always-offered period must remain. Run after the change, in the same
// transaction.
export async function assertStandardPeriodRemains(connection) {
  const [[{ count }]] = await connection.execute(
    `SELECT COUNT(*) AS count FROM credit_periods
     WHERE is_active = 1 AND requires_extension = 0`,
  );
  if (Number(count) === 0) {
    throw new RouteError(
      400,
      "At least one active credit period must always be offered",
    );
  }
}

// A window's max months must be an active extension-only period - the
// window offers those up to it.
async function readMaxMonths(connection, value) {
  const months = readMonths(value);
  const [rows] = await connection.execute(
    `SELECT 1 FROM credit_periods
     WHERE period_value = ? AND is_active = 1 AND requires_extension = 1`,
    [months],
  );
  if (rows.length === 0) {
    throw new RouteError(
      400,
      "Max months must be an active extension-only credit period",
    );
  }
  return months;
}

async function readPromoId(connection, value) {
  if (value === null || value === undefined || value === "") return null;
  const id = Number(value);
  if (!Number.isInteger(id)) throw new RouteError(400, "Promo not found");
  const [rows] = await connection.execute(
    `SELECT 1 FROM staff_offer_promos WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) throw new RouteError(400, "Promo not found");
  return id;
}

function readWindowName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) throw new RouteError(400, "Name is required");
  if (name.length > CREDIT_WINDOW_NAME_MAX_LENGTH) {
    throw new RouteError(400, "Name is too long");
  }
  return name;
}

// Validates a new window or changes to `current`, returning the columns to
// write. Rules: end after start; a new or changed end can't be in the past
// (to stop a window now, deactivate it); once started, the start is fixed.
export async function readWindowChanges(connection, body, current = null) {
  const now = await dbNow(connection);
  const columns = {};
  const has = (key) => !current || body[key] !== undefined;

  if (has("name")) {
    const name = readWindowName(body.name);
    if (!current || name !== current.name) columns.name = name;
  }
  if (has("maxMonths")) {
    if (!current || Number(body.maxMonths) !== current.maxMonths) {
      columns.max_months = await readMaxMonths(connection, body.maxMonths);
    }
  }
  if (has("promoId")) {
    const promoId = await readPromoId(connection, body.promoId);
    if (!current || promoId !== current.promoId) columns.promo_id = promoId;
  }

  let startsAt = current?.startsAt ?? null;
  let endsAt = current?.endsAt ?? null;
  if (has("startsAt")) {
    const value = readDateTime(body.startsAt, "Start");
    if (!value) throw new RouteError(400, "Start is required");
    if (value !== startsAt) {
      if (current && current.startsAt <= now) {
        throw new RouteError(400, "A window that has started keeps its start");
      }
      startsAt = value;
      columns.starts_at = toDbDateTime(value);
    }
  }
  if (has("endsAt")) {
    const value = readDateTime(body.endsAt, "End");
    if (!value) throw new RouteError(400, "End is required");
    if (value !== endsAt) {
      if (value < now) {
        throw new RouteError(
          400,
          "The end can't be in the past - to stop a window now, deactivate it",
        );
      }
      endsAt = value;
      columns.ends_at = toDbDateTime(value, "59");
    }
  }
  if (endsAt < startsAt) {
    throw new RouteError(400, "The end must be after the start");
  }

  return columns;
}
