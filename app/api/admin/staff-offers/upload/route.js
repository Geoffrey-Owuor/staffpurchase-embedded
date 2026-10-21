// app/api/admin/staff-offers/upload/route.js - Staff Offer products from an
// Excel file (lib/staffOfferSheet.js), into an existing promo or a new one.
// multipart/form-data:
//   file             the .xlsx
//   mode             "preview" (default - checks only, saves nothing) or "commit"
//   promoId          add to this promo (must not have ended), or else:
//   name, startsAt, endsAt   create a new promo with these
//   confirmOverlap   "true" to accept overlaps with other active promos
//   reason           optional, for the audit log
// The file is parsed and checked again on commit (never trusted from the
// preview), and committed all-or-nothing: any row with an error refuses
// the whole file.
import { withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { writeAdminAudit } from "@/lib/adminAudit";
import {
  RouteError,
  dbNow,
  handleRouteError,
  readReason,
} from "@/lib/adminForm";
import {
  analyzeOfferUpload,
  insertOffers,
  loadPromo,
  promoSnapshot,
  promoTarget,
  readPromoName,
  readWindow,
  windowColumns,
} from "@/lib/adminStaffOffers";
import { readOfferUpload } from "@/lib/staffOfferSheet";

const text = (form, key) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

export const POST = requireAuth(
  async (request, { user: admin }) => {
    try {
      const form = await request.formData();
      const commit = text(form, "mode") === "commit";
      const promoId = parseInt(text(form, "promoId"), 10) || null;
      const reason = readReason(text(form, "reason"));
      const file = form.get("file");
      const rows = await readOfferUpload(file);

      const result = await withTransaction(async (connection) => {
        let promo = null;
        let newPromo = null;
        let window;

        if (promoId) {
          promo = await loadPromo(connection, promoId, { lock: commit });
          if (promo.phase === "over") {
            throw new RouteError(
              400,
              "This promo has ended - products can't be added to it",
            );
          }
          window = { startsAt: promo.startsAt, endsAt: promo.endsAt };
        } else {
          newPromo = { name: readPromoName(text(form, "name")) };
          window = readWindow(
            { startsAt: text(form, "startsAt"), endsAt: text(form, "endsAt") },
            await dbNow(connection),
          );
          const [taken] = await connection.execute(
            `SELECT id FROM staff_offer_promos WHERE name = ?`,
            [newPromo.name],
          );
          if (taken.length) {
            throw new RouteError(409, "A promo with that name already exists");
          }
        }

        const preview = await analyzeOfferUpload(connection, {
          promoId: promo?.id,
          window,
          rows,
        });
        if (!commit) return { preview };

        if (preview.summary.errors > 0) {
          throw new RouteError(
            400,
            `${preview.summary.errors} row${preview.summary.errors === 1 ? " has" : "s have"} errors - fix the file and upload it again. Nothing was saved.`,
            { preview },
          );
        }
        // Offers only turn on in an active promo (a new one always is)
        const turnsOn = !promo || promo.isActive;
        if (
          turnsOn &&
          preview.overlaps.count > 0 &&
          text(form, "confirmOverlap") !== "true"
        ) {
          throw new RouteError(
            409,
            `${preview.summary.overlaps} product${preview.summary.overlaps === 1 ? " is" : "s are"} also on offer in another active promo at the same time. The newest offer wins at checkout.`,
            { code: "overlap", overlaps: preview.overlaps, preview },
          );
        }

        if (newPromo) {
          const columns = windowColumns(window);
          const [inserted] = await connection.execute(
            `INSERT INTO staff_offer_promos
               (name, starts_at, ends_at, is_active, created_by, created_by_name)
             VALUES (?, ?, ?, 1, ?, ?)`,
            [
              newPromo.name,
              columns.starts_at,
              columns.ends_at,
              admin.id,
              admin.name ?? admin.email,
            ],
          );
          promo = await loadPromo(connection, inserted.insertId);
          await writeAdminAudit(connection, {
            admin,
            action: "promo.create",
            ...promoTarget(promo),
            reason,
            after: { ...promoSnapshot(promo), from_file: file.name },
          });
        }

        const offers = rows.map(({ productCode, offerPrice }) => ({
          productCode,
          offerPrice,
        }));
        await insertOffers(connection, promo.id, offers);
        const updated = await loadPromo(connection, promo.id);

        await writeAdminAudit(connection, {
          admin,
          action: "offer.upload",
          ...promoTarget(updated),
          reason,
          after: {
            file: file.name,
            products: offers.length,
            overlaps_confirmed: preview.overlaps.count > 0 && turnsOn,
            items: offers.map((o) => [o.productCode, o.offerPrice]),
          },
        });
        return { promo: updated, created: Boolean(newPromo), count: offers.length };
      });

      if (!commit) return Response.json(result);
      return Response.json(
        {
          message: `${result.count} product${result.count === 1 ? "" : "s"} ${
            result.created ? `uploaded into the new promo` : "added"
          }.`,
          promo: result.promo,
        },
        { status: 201 },
      );
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY") {
        return handleRouteError(
          new RouteError(409, "A promo with that name already exists"),
        );
      }
      return handleRouteError(error, "Error uploading the file");
    }
  },
  { roles: ["admin"] },
);
