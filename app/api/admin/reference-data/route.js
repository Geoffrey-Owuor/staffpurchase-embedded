// app/api/admin/reference-data/route.js - DB-managed dropdown data and
// settings (db/migrations/2026-10-18_reference_data.sql), edited from
// /dashboard/admin/reference-data. Entries are deactivated, never deleted:
// the codes/names stay on existing requests and users.
import { revalidateTag } from "next/cache";
import { withConnection, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { writeAdminAudit } from "@/lib/adminAudit";
import { CACHE_TAGS } from "@/utils/Cache/cacheTags";
import {
  APP_SETTINGS,
  DEPARTMENT_NAME_MAX_LENGTH,
  LOCATION_CODE_PATTERN,
  LOCATION_LABEL_MAX_LENGTH,
} from "@/utils/Admin/adminConstants";

class RouteError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// The two list types, described once: table, key column, display column.
const LISTS = {
  location: {
    table: "invoicing_locations",
    key: "code",
    text: "label",
    textLabel: "Label",
    maxLength: LOCATION_LABEL_MAX_LENGTH,
    tag: CACHE_TAGS.invoicingLocations,
    noun: "Invoicing location",
  },
  department: {
    table: "departments",
    key: "id",
    text: "name",
    textLabel: "Department name",
    maxLength: DEPARTMENT_NAME_MAX_LENGTH,
    tag: CACHE_TAGS.departments,
    noun: "Department",
  },
};

const readText = (value, list) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new RouteError(400, `${list.textLabel} is required`);
  if (text.length > list.maxLength) {
    throw new RouteError(400, `${list.textLabel} is too long`);
  }
  return text;
};

async function loadAll(connection) {
  const [locations] = await connection.execute(
    `SELECT code, label, is_active, sort_order, updated_at
     FROM invoicing_locations ORDER BY sort_order ASC, label ASC`,
  );
  const [departments] = await connection.execute(
    `SELECT d.id, d.name, d.is_active, d.sort_order, d.updated_at,
            (SELECT COUNT(*) FROM users u WHERE u.department = d.name) AS userCount
     FROM departments d ORDER BY d.sort_order ASC, d.name ASC`,
  );
  const [settingRows] = await connection.query(
    `SELECT setting_key, setting_value, updated_at FROM app_settings WHERE setting_key IN (?)`,
    [Object.keys(APP_SETTINGS)],
  );
  const settings = Object.entries(APP_SETTINGS).map(([key, spec]) => {
    const row = settingRows.find((r) => r.setting_key === key);
    return {
      key,
      label: spec.label,
      description: spec.description,
      value: row?.setting_value ?? "",
      updated_at: row?.updated_at ?? null,
    };
  });
  const asBool = (row) => ({ ...row, is_active: Boolean(row.is_active) });
  return {
    locations: locations.map(asBool),
    departments: departments.map(asBool),
    settings,
  };
}

async function loadEntry(connection, list, key) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${list.table} WHERE ${list.key} = ? FOR UPDATE`,
    [key],
  );
  if (rows.length === 0) throw new RouteError(404, `${list.noun} not found`);
  return rows[0];
}

const snapshotEntry = (list, row) => ({
  [list.key]: row[list.key],
  [list.text]: row[list.text],
  is_active: Boolean(row.is_active),
  sort_order: row.sort_order,
});

// Moves one entry up/down. Renumbers the list 10, 20, 30... in its current
// order first, so entries that share a sort_order still move.
async function moveEntry(connection, list, key, direction) {
  const [rows] = await connection.execute(
    `SELECT ${list.key} AS entryKey FROM ${list.table}
     ORDER BY sort_order ASC, ${list.text} ASC FOR UPDATE`,
  );
  const keys = rows.map((r) => r.entryKey);
  const index = keys.findIndex((k) => String(k) === String(key));
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1) throw new RouteError(404, `${list.noun} not found`);
  if (target < 0 || target >= keys.length) return false;

  [keys[index], keys[target]] = [keys[target], keys[index]];
  for (const [i, k] of keys.entries()) {
    await connection.execute(
      `UPDATE ${list.table} SET sort_order = ? WHERE ${list.key} = ?`,
      [(i + 1) * 10, k],
    );
  }
  return true;
}

const handleError = (error, fallback) => {
  if (error instanceof RouteError) {
    return Response.json({ message: error.message }, { status: error.status });
  }
  if (error?.code === "ER_DUP_ENTRY") {
    return Response.json(
      { message: "That entry already exists" },
      { status: 409 },
    );
  }
  console.error(fallback, error);
  return Response.json({ message: fallback }, { status: 500 });
};

export const GET = requireAuth(
  async () => {
    try {
      return Response.json(await withConnection(loadAll));
    } catch (error) {
      return handleError(error, "Error loading reference data");
    }
  },
  { roles: ["admin"] },
);

// Add a location ({ type: "location", code, label }) or a department
// ({ type: "department", name }). New entries go to the end, active.
export const POST = requireAuth(
  async (request, { user: admin }) => {
    try {
      const body = await request.json();
      const list = LISTS[body.type];
      if (!list) throw new RouteError(400, "Unknown type");

      const text = readText(body[list.text], list);
      const code =
        body.type === "location"
          ? String(body.code ?? "")
              .trim()
              .toUpperCase()
          : null;
      if (code !== null && !LOCATION_CODE_PATTERN.test(code)) {
        throw new RouteError(
          400,
          "Code must be 2-32 capital letters, digits or underscores",
        );
      }

      await withTransaction(async (connection) => {
        const [[{ nextOrder }]] = await connection.execute(
          `SELECT COALESCE(MAX(sort_order), 0) + 10 AS nextOrder FROM ${list.table}`,
        );
        let key = code;
        if (body.type === "location") {
          await connection.execute(
            `INSERT INTO invoicing_locations (code, label, is_active, sort_order) VALUES (?, ?, 1, ?)`,
            [code, text, nextOrder],
          );
        } else {
          const [result] = await connection.execute(
            `INSERT INTO departments (name, is_active, sort_order) VALUES (?, 1, ?)`,
            [text, nextOrder],
          );
          key = result.insertId;
        }

        await writeAdminAudit(connection, {
          admin,
          action: "reference.create",
          targetType: "reference",
          targetId: `${body.type}:${key}`,
          targetLabel: `${list.noun}: ${text}`,
          after: { [list.key]: key, [list.text]: text, is_active: true },
        });
      });

      revalidateTag(list.tag);
      return Response.json(
        { message: `${list.noun} added.`, ...(await withConnection(loadAll)) },
        { status: 201 },
      );
    } catch (error) {
      return handleError(error, "Error adding the entry");
    }
  },
  { roles: ["admin"] },
);

// Change one entry: { type, key, label|name?, is_active?, move? } for the
// lists, or { type: "setting", key, value } for a setting.
export const PATCH = requireAuth(
  async (request, { user: admin }) => {
    try {
      const body = await request.json();

      if (body.type === "setting") {
        const spec = APP_SETTINGS[body.key];
        if (!spec) throw new RouteError(400, "Unknown setting");
        const value = String(body.value ?? "").trim();
        if (!spec.pattern.test(value)) {
          throw new RouteError(400, `${spec.label}: ${spec.patternMessage}`);
        }

        await withTransaction(async (connection) => {
          const [rows] = await connection.execute(
            `SELECT setting_value FROM app_settings WHERE setting_key = ? FOR UPDATE`,
            [body.key],
          );
          const before = rows[0]?.setting_value ?? null;
          if (before === value) throw new RouteError(400, "No changes to save");
          await connection.execute(
            `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [body.key, value],
          );
          await writeAdminAudit(connection, {
            admin,
            action: "setting.update",
            targetType: "reference",
            targetId: `setting:${body.key}`,
            targetLabel: spec.label,
            before: { value: before },
            after: { value },
          });
        });

        revalidateTag(CACHE_TAGS.appSettings);
        return Response.json({
          message: `${spec.label} updated.`,
          ...(await withConnection(loadAll)),
        });
      }

      const list = LISTS[body.type];
      if (!list) throw new RouteError(400, "Unknown type");

      const message = await withTransaction(async (connection) => {
        const current = await loadEntry(connection, list, body.key);
        const before = snapshotEntry(list, current);
        const label = `${list.noun}: ${current[list.text]}`;

        if (body.move === "up" || body.move === "down") {
          const moved = await moveEntry(connection, list, body.key, body.move);
          if (!moved) throw new RouteError(400, "It's already at the end");
          return "Order updated.";
        }

        const setClauses = [];
        const params = [];
        let extra = "";

        if (body[list.text] !== undefined) {
          const text = readText(body[list.text], list);
          if (text !== current[list.text]) {
            setClauses.push(`${list.text} = ?`);
            params.push(text);
            // Users store the department name itself, so a rename carries
            // over to them (purchase requests keep their submitted snapshot)
            if (body.type === "department") {
              const [result] = await connection.execute(
                `UPDATE users SET department = ? WHERE department = ?`,
                [text, current.name],
              );
              extra = ` ${result.affectedRows} user${
                result.affectedRows === 1 ? "" : "s"
              } moved to the new name.`;
            }
          }
        }

        if (typeof body.is_active === "boolean") {
          if (body.is_active !== Boolean(current.is_active)) {
            setClauses.push(`is_active = ?`);
            params.push(body.is_active ? 1 : 0);
          }
        }

        if (setClauses.length === 0) {
          throw new RouteError(400, "No changes to save");
        }

        await connection.execute(
          `UPDATE ${list.table} SET ${setClauses.join(", ")} WHERE ${list.key} = ?`,
          [...params, body.key],
        );
        const after = snapshotEntry(
          list,
          await loadEntry(connection, list, body.key),
        );

        await writeAdminAudit(connection, {
          admin,
          action: "reference.update",
          targetType: "reference",
          targetId: `${body.type}:${body.key}`,
          targetLabel: label,
          before,
          after,
        });

        return `${list.noun} updated.${extra}`;
      });

      revalidateTag(list.tag);
      return Response.json({ message, ...(await withConnection(loadAll)) });
    } catch (error) {
      return handleError(error, "Error saving the change");
    }
  },
  { roles: ["admin"] },
);
