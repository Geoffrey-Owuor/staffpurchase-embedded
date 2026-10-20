// app/api/admin/staff-offers/[id]/route.js - one Staff Offer promo.
// GET returns it; PATCH runs one action:
//   { action: "rename", name }
//   { action: "update_window", startsAt, endsAt, reason, confirmOverlap? }
//   { action: "deactivate", reason }
//   { action: "reactivate", reason, confirmOverlap? }
// Rules: lib/adminStaffOffers.js. Every action is audited.
import { withConnection, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { writeAdminAudit } from "@/lib/adminAudit";
import {
  RouteError,
  dbNow,
  handleRouteError,
  readReason,
} from "@/lib/adminForm";
import {
  assertNoOverlap,
  checkWindowChange,
  findOverlaps,
  loadPromo,
  promoSnapshot,
  promoTarget,
  readPromoName,
  readWindow,
  syncPromoRows,
  windowColumns,
} from "@/lib/adminStaffOffers";

export const GET = requireAuth(
  async (_request, { params }) => {
    try {
      const { id } = await params;
      const promo = await withConnection((connection) =>
        loadPromo(connection, id),
      );
      return Response.json({ promo });
    } catch (error) {
      return handleRouteError(error, "Error loading the promo");
    }
  },
  { roles: ["admin"] },
);

const ACTIONS = {
  async rename(connection, promo, body) {
    const name = readPromoName(body.name);
    if (name === promo.name) throw new RouteError(400, "No changes to save");
    await connection.execute(
      `UPDATE staff_offer_promos SET name = ? WHERE id = ?`,
      [name, promo.id],
    );
    return { audit: "promo.update", message: "Promo renamed." };
  },

  async update_window(connection, promo, body) {
    const window = readWindow(body, await dbNow(connection));
    if (window.startsAt === promo.startsAt && window.endsAt === promo.endsAt) {
      throw new RouteError(400, "No changes to save");
    }
    checkWindowChange(promo, window);
    // Only an active promo turns offers on in the new window
    if (promo.isActive) {
      assertNoOverlap(
        await findOverlaps(connection, { promoId: promo.id, window }),
        body.confirmOverlap,
      );
    }
    const columns = windowColumns(window);
    await connection.execute(
      `UPDATE staff_offer_promos SET starts_at = ?, ends_at = ? WHERE id = ?`,
      [columns.starts_at, columns.ends_at, promo.id],
    );
    return {
      audit: "promo.update",
      message:
        promo.phase === "over" ? "Promo extended." : "Promo period updated.",
    };
  },

  async deactivate(connection, promo) {
    if (!promo.isActive) throw new RouteError(400, "It's already inactive");
    await connection.execute(
      `UPDATE staff_offer_promos SET is_active = 0 WHERE id = ?`,
      [promo.id],
    );
    return {
      audit: "promo.deactivate",
      message:
        "Promo deactivated - its offers no longer apply to new requests.",
    };
  },

  async reactivate(connection, promo, body) {
    if (promo.isActive) throw new RouteError(400, "It's already active");
    if (promo.phase === "over") {
      throw new RouteError(
        400,
        promo.withinGrace
          ? "This promo has ended - extend its period first, then reactivate it"
          : "This promo has ended - duplicate it into a new promo instead",
      );
    }
    assertNoOverlap(
      await findOverlaps(connection, {
        promoId: promo.id,
        window: { startsAt: promo.startsAt, endsAt: promo.endsAt },
      }),
      body.confirmOverlap,
    );
    await connection.execute(
      `UPDATE staff_offer_promos SET is_active = 1 WHERE id = ?`,
      [promo.id],
    );
    return { audit: "promo.reactivate", message: "Promo reactivated." };
  },
};

const REASON_REQUIRED = ["update_window", "deactivate", "reactivate"];

export const PATCH = requireAuth(
  async (request, { params, user: admin }) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const run = ACTIONS[body.action];
      if (!run) throw new RouteError(400, "Unknown action");
      const reason = readReason(body.reason, {
        required: REASON_REQUIRED.includes(body.action),
      });

      const { promo, message } = await withTransaction(async (connection) => {
        const current = await loadPromo(connection, id, { lock: true });
        const { audit, message } = await run(connection, current, body);
        await syncPromoRows(connection, current.id);
        const updated = await loadPromo(connection, current.id);

        await writeAdminAudit(connection, {
          admin,
          action: audit,
          ...promoTarget(updated),
          reason,
          before: promoSnapshot(current),
          after: promoSnapshot(updated),
        });
        return { promo: updated, message };
      });

      return Response.json({ message, promo });
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY") {
        return handleRouteError(
          new RouteError(409, "A promo with that name already exists"),
        );
      }
      return handleRouteError(error, "Error saving the promo");
    }
  },
  { roles: ["admin"] },
);
