// Shared by app/api/admin/banners (list/create) and
// app/api/admin/banners/[id] (edit/delete) - the admin side of the
// system_banners table (db/migrations/2026-10-14_create_system_banners.sql).
// Users only ever read banners through the cached app/api/banners route, so
// every write here must revalidateTag(CACHE_TAGS.banners).
import { VALID_ROLES } from "@/utils/routes";
import {
  BANNER_MESSAGE_MAX_LENGTH,
  BANNER_PRIORITY_RANGE,
  BANNER_SEVERITY_OPTIONS,
} from "@/utils/Admin/adminConstants";
import {
  FORM_DATETIME,
  RouteError,
  readDateTime,
  toDbDateTime,
} from "@/lib/adminForm";

const SEVERITIES = BANNER_SEVERITY_OPTIONS.map((option) => option.value);

// starts_at/ends_at travel as form strings (lib/adminForm.js FORM_DATETIME).

// Status from is_active + the window, evaluated by the DB (same clock the
// public banner query uses). Also used as the list's status filter.
export const BANNER_STATUS_SQL = {
  inactive: `b.is_active = 0`,
  expired: `b.is_active = 1 AND b.ends_at IS NOT NULL AND b.ends_at <= NOW()`,
  scheduled: `b.is_active = 1 AND b.starts_at > NOW() AND (b.ends_at IS NULL OR b.ends_at > NOW())`,
  live: `b.is_active = 1 AND b.starts_at <= NOW() AND (b.ends_at IS NULL OR b.ends_at > NOW())`,
};

const STATUS_CASE = `CASE
    WHEN ${BANNER_STATUS_SQL.inactive} THEN 'inactive'
    WHEN ${BANNER_STATUS_SQL.expired} THEN 'expired'
    WHEN ${BANNER_STATUS_SQL.scheduled} THEN 'scheduled'
    ELSE 'live' END`;

// A banner can only be deleted before it starts (nobody can have seen it);
// after that it's deactivated instead, so its history stays.
export const BANNER_COLUMNS = `b.id, b.message, b.severity, b.target_roles, b.priority,
    b.is_active, b.created_at, b.updated_at,
    DATE_FORMAT(b.starts_at, '${FORM_DATETIME}') AS startsAt,
    DATE_FORMAT(b.ends_at, '${FORM_DATETIME}') AS endsAt,
    ${STATUS_CASE} AS status,
    b.starts_at > NOW() AS canDelete`;

// Live first, then upcoming, then the rest; highest priority first within.
export const BANNER_ORDER = `FIELD(${STATUS_CASE}, 'live', 'scheduled', 'expired', 'inactive'),
    b.priority DESC, b.starts_at DESC, b.id DESC`;

export const toBanner = (row) => ({
  id: row.id,
  message: row.message,
  severity: row.severity,
  targetRoles: row.target_roles
    ? row.target_roles
        .split(",")
        .map((role) => role.trim().toLowerCase())
        .filter(Boolean)
    : [],
  priority: row.priority,
  isActive: Boolean(row.is_active),
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  status: row.status,
  canDelete: Boolean(row.canDelete),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function loadBanner(connection, id, { lock = false } = {}) {
  const [rows] = await connection.execute(
    `SELECT ${BANNER_COLUMNS} FROM system_banners b WHERE b.id = ?${
      lock ? " FOR UPDATE" : ""
    }`,
    [id],
  );
  if (rows.length === 0) throw new RouteError(404, "Banner not found");
  return toBanner(rows[0]);
}

// What the audit log records about a banner
export const bannerSnapshot = (banner) => ({
  message: banner.message,
  severity: banner.severity,
  target_roles: banner.targetRoles.length ? banner.targetRoles.join(",") : null,
  starts_at: banner.startsAt,
  ends_at: banner.endsAt,
  is_active: banner.isActive,
  priority: banner.priority,
});

export const bannerLabel = (banner) => {
  const text = banner.message.replace(/\s+/g, " ").trim();
  return `Banner #${banner.id}: ${text.length > 60 ? `${text.slice(0, 57)}...` : text}`;
};

// Validates a create/edit body against the current banner (null when
// creating) and returns the complete resulting banner fields. Only keys
// present in the body change. `now` is the DB's NOW() in the form format.
export function readBannerFields(body, current, now) {
  const next = current
    ? {
        message: current.message,
        severity: current.severity,
        targetRoles: current.targetRoles,
        startsAt: current.startsAt,
        endsAt: current.endsAt,
        priority: current.priority,
        isActive: current.isActive,
      }
    : {
        message: "",
        severity: "info",
        targetRoles: [],
        startsAt: null,
        endsAt: null,
        priority: 0,
        isActive: true,
      };

  if (body.message !== undefined) {
    // Line breaks are kept (banners render with whitespace-pre-line)
    next.message = typeof body.message === "string" ? body.message.trim() : "";
  }
  if (!next.message) throw new RouteError(400, "Message is required");
  if (next.message.length > BANNER_MESSAGE_MAX_LENGTH) {
    throw new RouteError(
      400,
      `Message must be ${BANNER_MESSAGE_MAX_LENGTH} characters or fewer`,
    );
  }

  if (body.severity !== undefined) {
    if (!SEVERITIES.includes(body.severity)) {
      throw new RouteError(400, "Unknown severity");
    }
    next.severity = body.severity;
  }

  if (body.targetRoles !== undefined) {
    if (!Array.isArray(body.targetRoles)) {
      throw new RouteError(400, "Target roles must be a list");
    }
    if (body.targetRoles.some((role) => !VALID_ROLES.includes(role))) {
      throw new RouteError(400, "Unknown role in target roles");
    }
    // Stored in VALID_ROLES order, no duplicates; empty = everyone
    next.targetRoles = VALID_ROLES.filter((role) =>
      body.targetRoles.includes(role),
    );
  }

  if (body.startsAt !== undefined) {
    next.startsAt = readDateTime(body.startsAt, "Start");
  }
  // A new banner with no start begins now
  if (!next.startsAt) next.startsAt = now;

  if (body.endsAt !== undefined) {
    next.endsAt = readDateTime(body.endsAt, "End");
  }

  if (body.priority !== undefined) {
    const priority = Number(body.priority);
    if (
      !Number.isInteger(priority) ||
      priority < BANNER_PRIORITY_RANGE.min ||
      priority > BANNER_PRIORITY_RANGE.max
    ) {
      throw new RouteError(
        400,
        `Priority must be a whole number from ${BANNER_PRIORITY_RANGE.min} to ${BANNER_PRIORITY_RANGE.max}`,
      );
    }
    next.priority = priority;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      throw new RouteError(400, "Active must be true or false");
    }
    next.isActive = body.isActive;
  }

  // The strings sort chronologically, so plain comparisons are safe
  if (next.endsAt && next.endsAt <= next.startsAt) {
    throw new RouteError(400, "The end must be after the start");
  }

  // Saving an active banner whose end has already passed would just make an
  // expired one - only refused when this save touches the end or activates
  // it, so an old expired banner can still be tidied up as it is.
  const touchesExpiry =
    !current ||
    (body.endsAt !== undefined && next.endsAt !== current.endsAt) ||
    (next.isActive && !current.isActive);
  if (next.isActive && next.endsAt && next.endsAt <= now && touchesExpiry) {
    throw new RouteError(
      400,
      "That end time has already passed - choose a later one",
    );
  }

  return next;
}

// Column values for an INSERT/UPDATE
export const toColumns = (fields) => ({
  message: fields.message,
  severity: fields.severity,
  target_roles: fields.targetRoles.length ? fields.targetRoles.join(",") : null,
  starts_at: toDbDateTime(fields.startsAt),
  ends_at: toDbDateTime(fields.endsAt),
  priority: fields.priority,
  is_active: fields.isActive ? 1 : 0,
});
