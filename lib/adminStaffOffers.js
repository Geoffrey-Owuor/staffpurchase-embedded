// The admin side of Staff Offers: promos (staff_offer_promos) and their
// product rows (staff_offer_prices) - db/migrations/2026-10-20_staff_offer_promos.sql.
// Used by app/api/admin/staff-offers/**. Lookups (lib/staffOffers.js) are
// uncached, so nothing here needs revalidating.
//
// Rules:
// - The promo owns the window; each row's starts_at/ends_at/promo_name mirror
//   it (syncPromoRows) and are never read by the lookup.
// - A row's price never changes in place (purchase_products.staffOfferId
//   points at it): deactivate it and add the code again.
// - Window changes depend on where the promo is in time (its phase, which
//   ignores is_active): upcoming - anything; running - the start is fixed
//   (purchases may have used it) and the end can't go before now; over -
//   only extending, and only within PROMO_EXTEND_GRACE_DAYS of its end.
// - Turning offers on (reactivating, extending, adding, duplicating) that
//   would overlap another active promo's offer for the same code is refused
//   with 409 `overlap` until the admin confirms - overlaps resolve silently
//   to the newest row at lookup time.
import {
  OFFER_PRICE_MAX,
  OFFER_PRODUCT_CODE_MAX_LENGTH,
  PROMO_EXTEND_GRACE_DAYS,
  PROMO_NAME_MAX_LENGTH,
} from "@/utils/Admin/adminConstants";
import {
  FORM_DATETIME,
  RouteError,
  readDateTime,
  toDbDateTime,
} from "@/lib/adminForm";

// Status as the admin pages show it. The boundaries match the lookup's
// `NOW() BETWEEN starts_at AND ends_at`.
export const PROMO_STATUS_SQL = {
  inactive: `p.is_active = 0`,
  ended: `p.is_active = 1 AND p.ends_at < NOW()`,
  scheduled: `p.is_active = 1 AND p.starts_at > NOW()`,
  live: `p.is_active = 1 AND NOW() BETWEEN p.starts_at AND p.ends_at`,
};

const STATUS_CASE = `CASE
    WHEN ${PROMO_STATUS_SQL.inactive} THEN 'inactive'
    WHEN ${PROMO_STATUS_SQL.ended} THEN 'ended'
    WHEN ${PROMO_STATUS_SQL.scheduled} THEN 'scheduled'
    ELSE 'live' END`;

const PHASE_CASE = `CASE
    WHEN p.starts_at > NOW() THEN 'upcoming'
    WHEN p.ends_at < NOW() THEN 'over'
    ELSE 'running' END`;

// PROMO_EXTEND_GRACE_DAYS is a code constant, so inlining it is safe
export const PROMO_COLUMNS = `p.id, p.name, p.is_active, p.created_by_name,
    p.created_at, p.updated_at,
    DATE_FORMAT(p.starts_at, '${FORM_DATETIME}') AS startsAt,
    DATE_FORMAT(p.ends_at, '${FORM_DATETIME}') AS endsAt,
    ${STATUS_CASE} AS status,
    ${PHASE_CASE} AS phase,
    p.ends_at >= NOW() - INTERVAL ${PROMO_EXTEND_GRACE_DAYS} DAY AS withinGrace,
    (SELECT COUNT(*) FROM staff_offer_prices o WHERE o.promo_id = p.id) AS productCount,
    (SELECT COUNT(*) FROM staff_offer_prices o
      WHERE o.promo_id = p.id AND o.is_active = 1) AS activeProductCount,
    (SELECT COUNT(*) FROM purchase_products pp
      JOIN staff_offer_prices o ON o.id = pp.staffOfferId
      WHERE o.promo_id = p.id) AS usageCount`;

// Live first, then upcoming, then the rest; newest windows first within.
export const PROMO_ORDER = `FIELD(${STATUS_CASE}, 'live', 'scheduled', 'ended', 'inactive'),
    p.starts_at DESC, p.id DESC`;

export const toPromo = (row) => ({
  id: row.id,
  name: row.name,
  isActive: Boolean(row.is_active),
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  status: row.status,
  phase: row.phase,
  withinGrace: Boolean(row.withinGrace),
  productCount: Number(row.productCount),
  activeProductCount: Number(row.activeProductCount),
  usageCount: Number(row.usageCount),
  createdByName: row.created_by_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function loadPromo(connection, id, { lock = false } = {}) {
  if (lock) {
    // Lock the promo row on its own - FOR UPDATE can't sit on the
    // aggregate-heavy select below
    const [locked] = await connection.execute(
      `SELECT id FROM staff_offer_promos WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (locked.length === 0) throw new RouteError(404, "Promo not found");
  }
  const [rows] = await connection.execute(
    `SELECT ${PROMO_COLUMNS} FROM staff_offer_promos p WHERE p.id = ?`,
    [id],
  );
  if (rows.length === 0) throw new RouteError(404, "Promo not found");
  return toPromo(rows[0]);
}

// What the audit log records about a promo
export const promoSnapshot = (promo) => ({
  name: promo.name,
  starts_at: promo.startsAt,
  ends_at: promo.endsAt,
  is_active: promo.isActive,
  products: promo.productCount,
  active_products: promo.activeProductCount,
});

export const promoTarget = (promo) => ({
  targetType: "staff_offer",
  targetId: `promo:${promo.id}`,
  targetLabel: `Promo: ${promo.name}`,
});

export const readPromoName = (value) => {
  const name = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!name) throw new RouteError(400, "Promo name is required");
  if (name.length > PROMO_NAME_MAX_LENGTH) {
    throw new RouteError(
      400,
      `Promo name must be ${PROMO_NAME_MAX_LENGTH} characters or fewer`,
    );
  }
  return name;
};

export const readProductCode = (value) => {
  const code = typeof value === "string" ? value.trim() : "";
  if (!code) throw new RouteError(400, "Product code is required");
  if (code.length > OFFER_PRODUCT_CODE_MAX_LENGTH || /\s/.test(code)) {
    throw new RouteError(
      400,
      `"${code}" isn't a valid product code (no spaces, up to ${OFFER_PRODUCT_CODE_MAX_LENGTH} characters)`,
    );
  }
  return code;
};

// Offer prices are final prices: positive, at most 2 decimals
export const readOfferPrice = (value) => {
  const text = String(value ?? "").replace(/,/g, "").trim();
  const price = Number(text);
  if (
    !text ||
    !/^\d+(\.\d{1,2})?$/.test(text) ||
    !(price > 0) ||
    price > OFFER_PRICE_MAX
  ) {
    throw new RouteError(400, "Offer price must be a positive amount");
  }
  return price;
};

// A new window ({ startsAt, endsAt } form strings, both required)
export function readWindow(body, now) {
  const startsAt = readDateTime(body.startsAt, "Start");
  const endsAt = readDateTime(body.endsAt, "End");
  if (!startsAt || !endsAt) {
    throw new RouteError(400, "Start and end are both required");
  }
  if (endsAt <= startsAt) {
    throw new RouteError(400, "The end must be after the start");
  }
  if (endsAt <= now) {
    throw new RouteError(400, "The end must be in the future");
  }
  return { startsAt, endsAt };
}

// Whether `promo`'s window may change to `next` - see the rules at the top
export function checkWindowChange(promo, next) {
  if (promo.phase === "running" && next.startsAt !== promo.startsAt) {
    throw new RouteError(
      400,
      "This promo has started, so its start can't change - purchases may already have used it",
    );
  }
  if (promo.phase === "over") {
    if (next.startsAt !== promo.startsAt) {
      throw new RouteError(400, "An ended promo's start can't change");
    }
    if (!promo.withinGrace) {
      throw new RouteError(
        400,
        `This promo ended more than ${PROMO_EXTEND_GRACE_DAYS} days ago - duplicate it into a new promo instead`,
      );
    }
    if (next.endsAt <= promo.endsAt) {
      throw new RouteError(400, "An ended promo can only be extended");
    }
  }
}

// DATETIME values for a promo window. The end is inclusive, so it covers
// its whole last minute.
export const windowColumns = ({ startsAt, endsAt }) => ({
  starts_at: toDbDateTime(startsAt),
  ends_at: toDbDateTime(endsAt, "59"),
});

// Keeps the rows' mirror columns equal to their promo
export async function syncPromoRows(connection, promoId) {
  await connection.execute(
    `UPDATE staff_offer_prices o
     JOIN staff_offer_promos p ON p.id = o.promo_id
     SET o.starts_at = p.starts_at, o.ends_at = p.ends_at,
         o.promo_name = LEFT(p.name, 100)
     WHERE o.promo_id = ?`,
    [promoId],
  );
}

const OVERLAP_SAMPLE = 20;

// Active offers in OTHER active, not-yet-ended promos whose window overlaps
// `window`, for the given codes - or, when `codes` is omitted, for every
// active row of `promoId`. Returns { count, sample: [{ productCode, promoName }] }.
export async function findOverlaps(connection, { promoId, window, codes }) {
  const { starts_at, ends_at } = windowColumns(window);
  const params = [promoId, ends_at, starts_at];
  let codeFilter;
  if (codes) {
    if (codes.length === 0) return { count: 0, sample: [] };
    codeFilter = `o2.product_code IN (${codes.map(() => "?").join(", ")})`;
    params.push(...codes);
  } else {
    codeFilter = `o2.product_code IN (SELECT o.product_code FROM staff_offer_prices o
                    WHERE o.promo_id = ? AND o.is_active = 1)`;
    params.push(promoId);
  }

  const [rows] = await connection.execute(
    `SELECT o2.product_code AS productCode, p2.name AS promoName
     FROM staff_offer_prices o2
     JOIN staff_offer_promos p2 ON p2.id = o2.promo_id
     WHERE o2.promo_id <> ?
       AND o2.is_active = 1 AND p2.is_active = 1
       AND p2.ends_at >= NOW()
       AND p2.starts_at <= ? AND p2.ends_at >= ?
       AND ${codeFilter}
     ORDER BY o2.product_code`,
    params,
  );
  return { count: rows.length, sample: rows.slice(0, OVERLAP_SAMPLE) };
}

// Refuses with 409 `overlap` unless the admin has confirmed
export function assertNoOverlap(overlaps, confirmed) {
  if (overlaps.count === 0 || confirmed === true) return;
  throw new RouteError(
    409,
    `${overlaps.count} product${overlaps.count === 1 ? " is" : "s are"} also on offer in another active promo at the same time. The newest offer wins at checkout.`,
    { code: "overlap", overlaps },
  );
}

// One product row as the admin pages show it
export const OFFER_COLUMNS = `o.id, o.product_code, o.offer_price, o.is_active, o.created_at,
    (SELECT COUNT(*) FROM purchase_products pp WHERE pp.staffOfferId = o.id) AS usageCount`;

export const toOffer = (row) => ({
  id: row.id,
  productCode: row.product_code,
  offerPrice: parseFloat(row.offer_price),
  isActive: Boolean(row.is_active),
  usageCount: Number(row.usageCount),
  createdAt: row.created_at,
});

export async function loadOffer(connection, promoId, offerId) {
  const [rows] = await connection.execute(
    `SELECT ${OFFER_COLUMNS} FROM staff_offer_prices o
     WHERE o.id = ? AND o.promo_id = ? FOR UPDATE`,
    [offerId, promoId],
  );
  if (rows.length === 0) throw new RouteError(404, "Product not found in this promo");
  return toOffer(rows[0]);
}

// Whether the promo already has an active row for this code
export async function hasActiveCode(connection, promoId, code, exceptId = 0) {
  const [rows] = await connection.execute(
    `SELECT id FROM staff_offer_prices
     WHERE promo_id = ? AND product_code = ? AND is_active = 1 AND id <> ?
     LIMIT 1`,
    [promoId, code, exceptId],
  );
  return rows.length > 0;
}

// Inserts product rows into a promo, mirroring its window and name
export async function insertOffers(connection, promoId, offers) {
  for (const offer of offers) {
    await connection.execute(
      `INSERT INTO staff_offer_prices
         (promo_id, product_code, offer_price, starts_at, ends_at, promo_name, is_active)
       SELECT p.id, ?, ?, p.starts_at, p.ends_at, LEFT(p.name, 100), 1
       FROM staff_offer_promos p WHERE p.id = ?`,
      [offer.productCode, offer.offerPrice, promoId],
    );
  }
}
