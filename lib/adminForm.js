// Small helpers shared by the admin routes that edit dated records
// (lib/adminBanners.js, lib/adminStaffOffers.js).
import { REASON_MAX_LENGTH } from "@/utils/Admin/adminConstants";

export class RouteError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// DB wall-clock DATETIMEs (compared against the DB's NOW()) travel as
// "YYYY-MM-DDTHH:mm" strings - what a datetime-local input uses - and never
// through JS Dates, so nothing converts timezones between the form and the
// column. The strings sort chronologically, so plain comparisons are safe.
export const FORM_DATETIME = "%Y-%m-%dT%H:%i";
const FORM_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export async function dbNow(connection) {
  const [[{ now }]] = await connection.query(
    `SELECT DATE_FORMAT(NOW(), '${FORM_DATETIME}') AS now`,
  );
  return now;
}

// A form value -> "YYYY-MM-DDTHH:mm", or null when empty
export const readDateTime = (value, label) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !FORM_DATETIME_PATTERN.test(value)) {
    throw new RouteError(400, `${label} isn't a valid date and time`);
  }
  return value;
};

// A form value -> DATETIME column value. `seconds` lets an inclusive end
// cover its whole last minute ("23:59" -> "23:59:59").
export const toDbDateTime = (value, seconds = "00") =>
  value ? `${value.replace("T", " ")}:${seconds}` : null;

// Optional unless `required`; always length-capped
export const readReason = (value, { required = false } = {}) => {
  const reason = typeof value === "string" ? value.trim() : "";
  if (required && !reason) throw new RouteError(400, "A reason is required");
  if (reason.length > REASON_MAX_LENGTH) {
    throw new RouteError(400, "Reason is too long");
  }
  return reason;
};

export const handleRouteError = (error, fallback) => {
  if (error instanceof RouteError) {
    return Response.json(
      { message: error.message, ...error.extra },
      { status: error.status },
    );
  }
  console.error(fallback, error);
  return Response.json({ message: fallback }, { status: 500 });
};
