// app/api/admin/credit-periods/route.js - credit periods and extended
// credit windows (db/migrations/2026-10-21_credit_periods.sql), edited from
// the Reference Data page. Rules in lib/adminCreditPeriods.js. Periods are
// deactivated, never deleted (requests keep their label); windows too.
import { revalidateTag } from "next/cache";
import { withConnection, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { writeAdminAudit } from "@/lib/adminAudit";
import { RouteError, handleRouteError } from "@/lib/adminForm";
import {
  assertStandardPeriodRemains,
  loadCreditAdminData,
  loadPeriod,
  loadWindow,
  periodSnapshot,
  readMonths,
  readPeriodLabel,
  readWindowChanges,
  windowSnapshot,
} from "@/lib/adminCreditPeriods";
import { CACHE_TAGS } from "@/utils/Cache/cacheTags";

const handleError = (error, fallback) => {
  if (error?.code === "ER_DUP_ENTRY") {
    return Response.json(
      { message: "That entry already exists" },
      { status: 409 },
    );
  }
  return handleRouteError(error, fallback);
};

// Every write answers with the fresh data, like /api/admin/reference-data
const respond = async (message, status = 200) =>
  Response.json(
    { message, ...(await withConnection(loadCreditAdminData)) },
    { status },
  );

export const GET = requireAuth(
  async () => {
    try {
      return Response.json(await withConnection(loadCreditAdminData));
    } catch (error) {
      return handleError(error, "Error loading credit periods");
    }
  },
  { roles: ["admin"] },
);

// { type: "period", months, label?, requiresExtension } or
// { type: "window", name, maxMonths, startsAt, endsAt, promoId? }
export const POST = requireAuth(
  async (request, { user: admin }) => {
    try {
      const body = await request.json();

      if (body.type === "period") {
        const months = readMonths(body.months);
        const label = readPeriodLabel(body.label, months);
        const requiresExtension = Boolean(body.requiresExtension);

        await withTransaction(async (connection) => {
          await connection.execute(
            `INSERT INTO credit_periods (period_value, period_description, is_active, requires_extension)
             VALUES (?, ?, 1, ?)`,
            [months, label, requiresExtension ? 1 : 0],
          );
          await writeAdminAudit(connection, {
            admin,
            action: "reference.create",
            targetType: "reference",
            targetId: `credit_period:${months}`,
            targetLabel: `Credit period: ${label}`,
            after: periodSnapshot(await loadPeriod(connection, months)),
          });
        });

        revalidateTag(CACHE_TAGS.creditPeriods);
        return respond("Credit period added.", 201);
      }

      if (body.type === "window") {
        await withTransaction(async (connection) => {
          const columns = await readWindowChanges(connection, body);
          const [result] = await connection.execute(
            `INSERT INTO credit_extension_windows
               (name, max_months, starts_at, ends_at, promo_id, is_active, created_by, created_by_name)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              columns.name,
              columns.max_months,
              columns.starts_at,
              columns.ends_at,
              columns.promo_id,
              admin.id,
              admin.name,
            ],
          );
          const window = await loadWindow(connection, result.insertId);
          await writeAdminAudit(connection, {
            admin,
            action: "credit_window.create",
            targetType: "reference",
            targetId: `credit_window:${window.id}`,
            targetLabel: `Extended credit window: ${window.name}`,
            after: windowSnapshot(window),
          });
        });

        return respond("Extended credit window created.", 201);
      }

      throw new RouteError(400, "Unknown type");
    } catch (error) {
      return handleError(error, "Error adding the entry");
    }
  },
  { roles: ["admin"] },
);

// { type: "period", key: months, label?, is_active?, requires_extension? }
// or { type: "window", key: id, name?, maxMonths?, startsAt?, endsAt?,
// promoId?, is_active? }
export const PATCH = requireAuth(
  async (request, { user: admin }) => {
    try {
      const body = await request.json();

      if (body.type === "period") {
        await withTransaction(async (connection) => {
          const current = await loadPeriod(connection, body.key);
          const setClauses = [];
          const params = [];

          if (body.label !== undefined) {
            const label = readPeriodLabel(body.label, current.period_value);
            if (label !== current.period_description) {
              setClauses.push(`period_description = ?`);
              params.push(label);
            }
          }
          for (const field of ["is_active", "requires_extension"]) {
            if (
              typeof body[field] === "boolean" &&
              body[field] !== Boolean(current[field])
            ) {
              setClauses.push(`${field} = ?`);
              params.push(body[field] ? 1 : 0);
            }
          }
          if (setClauses.length === 0) {
            throw new RouteError(400, "No changes to save");
          }

          await connection.execute(
            `UPDATE credit_periods SET ${setClauses.join(", ")} WHERE period_value = ?`,
            [...params, current.period_value],
          );
          await assertStandardPeriodRemains(connection);
          const after = await loadPeriod(connection, current.period_value);

          await writeAdminAudit(connection, {
            admin,
            action: "reference.update",
            targetType: "reference",
            targetId: `credit_period:${current.period_value}`,
            targetLabel: `Credit period: ${current.period_description}`,
            before: periodSnapshot(current),
            after: periodSnapshot(after),
          });
        });

        revalidateTag(CACHE_TAGS.creditPeriods);
        return respond("Credit period updated.");
      }

      if (body.type === "window") {
        await withTransaction(async (connection) => {
          const current = await loadWindow(connection, body.key, {
            lock: true,
          });
          const columns = await readWindowChanges(connection, body, current);
          if (
            typeof body.is_active === "boolean" &&
            body.is_active !== current.isActive
          ) {
            columns.is_active = body.is_active ? 1 : 0;
          }
          const keys = Object.keys(columns);
          if (keys.length === 0)
            throw new RouteError(400, "No changes to save");

          await connection.execute(
            `UPDATE credit_extension_windows
             SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE id = ?`,
            [...keys.map((key) => columns[key]), current.id],
          );
          const after = await loadWindow(connection, current.id);

          await writeAdminAudit(connection, {
            admin,
            action: "credit_window.update",
            targetType: "reference",
            targetId: `credit_window:${current.id}`,
            targetLabel: `Extended credit window: ${current.name}`,
            before: windowSnapshot(current),
            after: windowSnapshot(after),
          });
        });

        return respond("Extended credit window updated.");
      }

      throw new RouteError(400, "Unknown type");
    } catch (error) {
      return handleError(error, "Error saving the change");
    }
  },
  { roles: ["admin"] },
);
