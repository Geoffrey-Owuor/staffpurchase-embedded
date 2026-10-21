# CLAUDE.md

Guidance for future Claude Code sessions working in this repo.

## Project

Staff Product Purchase Portal — an internal Next.js 15 (App Router) app for
digitizing a staff purchase-request approval workflow. Six roles: `staff`,
`payroll`, `hr`, `cc` (credit control), `bi` (billing/invoicing), and
`admin` (a requester like staff, plus the `/dashboard/admin` tools). Requests
flow through a fixed sequential approval chain: `payroll → hr → cc → bi`.

This app is **embedded** (iframed) behind an Nginx reverse proxy and also
reachable directly. It honors `NEXT_PUBLIC_BASE_PATH` (Next's `basePath`) and
has a signed-URL SSO entry point for the embedding host to hand off a
session. Don't assume the app is always served from `/`.

## Stack

Next.js 15 App Router, React 19, Tailwind CSS 4, `@tanstack/react-query` 5,
raw `mysql2/promise` (no ORM), JWT sessions via `jose`, zustand for small UI
state (sidebar, loading line). No TypeScript, no automated test suite —
`npm run lint` isn't configured (no eslint config exists; `next lint` will
prompt to set one up interactively) and `npm run build` is the primary
correctness check available.

## Auth & routing model

- Sessions are a `session_token` httpOnly JWT cookie (72h), created by
  `createSession()` in `app/lib/auth.js`, verified server-side with
  `getCurrentUser()` (same file) and at the edge in `middleware.js` (which
  has its own `verifyEdgeJWT` since edge middleware can't use the Node-only
  `bcryptjs`/`"use server"` module).
- Every role shares **one route tree**: `app/(dashboard)/dashboard/`.
  - `layout.js` — session-only gate (redirects to `/login` if invalid).
  - `page.jsx` — home: role-aware table (`StaffPurchasesTable` for staff,
    `ApproverPurchasesTable` otherwise) + `TermsConditions`. This table _is_
    the full purchase history (filterable, paginated) — there's no separate
    history route anymore; `/dashboard/history` used to be a dedicated
    full-page view of the identical table and was folded into home.
  - `[id]/page.jsx`, `[id]/edit/page.jsx` — view/edit a purchase
    (`GeneralViewPurchases`/`GeneralEditPurchases`, both already
    role-agnostic; they read `role` from `useUser()` internally). Static
    sibling routes (`new-purchase/`, `payment-tracking/`) always take
    precedence over this dynamic segment, so there's no collision.
  - `new-purchase/page.jsx` — `NewPurchase`, `approversPurchasing` derived
    from `role !== "staff"`.
  - `payment-tracking/` — **cc-only**, gated by its own nested `layout.js`
    (checks `user.role === "cc"`) since this feature doesn't apply to other
    roles at all.
- **Session revocation**: the JWT carries `sessionVersion`
  (`users.session_version`). `lib/sessionCheck.js` `isSessionCurrent(user)`
  re-checks the account (exists, `is_active`, same version) in
  `requireAuth`, the dashboard `layout.js` (redirects via
  `/api/session-ended`, which clears the cookie - a plain `/login` redirect
  would loop through middleware), `/api/check-session` (polled by
  `useAuthSync` on focus/every 5 min) and SSO session reuse. Bump
  `session_version` to end a user's sessions (deactivation, role change,
  password reset). `getCurrentUser()` alone is JWT-only.
- **Lockout vs deactivation**: a lockout is `password_attempts >=
  MAX_LOGIN_ATTEMPTS` (`lib/loginPolicy.js` `isLockedOut`); a password reset
  or admin unlock clears it. `is_active` is changed only by an admin - login
  no longer sets it on lockout.
- **Staff directory checks** (`db/migrations/2026-10-20_staff_verification.sql`):
  the Hotpoint Apps Hub (`requisitions_automation`, Postgres) owns the
  HR staff list (`company_staff_data`) and exposes it via its secret-gated
  `POST /api/staff/lookup`; `lib/staffDirectory.js` calls it
  (`STAFF_LOOKUP_API_URL` + `STAFF_LOOKUP_API_KEY`, 5s timeout).
  Registration fails **closed** on it, sign-in fails **open**:
  - A company email (`COMPANY_EMAIL_DOMAINS`, `hotpoint.co.ke`) registers
    once its code is verified, but its owner must find an active staff
    record by payroll number (`/api/register/staffdetails`, capped by
    `verification_codes.staff_lookups`). A personal email is only sent a
    code when it's the email of an active record; otherwise nothing is sent
    and the reply/next page look the same (no enumeration), so the
    verify-code page needs only the `verify_email` cookie, not a code row.
  - The `verify_email` cookie (`lib/verifyEmailCookie.js`, path
    `${basePath}/`) is required by the register pages *and* by
    `staffdetails`/`completeregistration`, which only act on the email it
    names - knowing a freshly verified email isn't enough to finish that
    registration from another browser.
  - `lib/registrationStaff.js` `resolveRegistrationStaff` is the one place
    that decides: name and payroll number always come from the record
    (never the client), the department too when it matches an active
    `departments` row (else the user picks), and a payroll number that
    already has an account is refused (`UPPER(TRIM(payrollNo))`, the same
    rule for admin profile edits). New accounts get `staff_verified_at`.
  - Login, SSO (both branches) and `/api/check-session` call
    `isStaffAllowed`: a payroll number HR deactivated is refused (so an
    open session ends on the next poll); no match or an unreachable Hub
    signs in as before (pre-existing accounts are grandfathered), and an
    active match sets `staff_verified_at`. It isn't in `isSessionCurrent`
    because that runs on every request. The admin Users page shows
    Verified/Unverified and Duplicate payroll pills (`staffCheck` filter);
    the migration has the review queries.
- **Roles**: `admin` is a *requester* role (`REQUESTER_ROLES`/
  `isRequesterRole` in `utils/routes.js`): it submits and sees its own
  requests exactly like `staff` and is never part of the approval chain. Use
  `isRequesterRole(role)` rather than `role === "staff"` for "acts like a
  requester" checks; reserve `role === "staff"` for things admin must not
  get (e.g. the own-requests-only rule in `generalviewpurchases`).
- **Admin tools** live under `/dashboard/admin/*` (gated by
  `admin/layout.js`) and `/api/admin/*` (`requireAuth(..., { roles:
  ["admin"] })`). Users page: `components/Admin/AdminUsersTable.jsx` +
  `ManageUserModal.jsx` -> `PATCH /api/admin/users/[id]` with an `action`
  (`update_profile`, `change_role`, `deactivate`, `reactivate`, `unlock`,
  `send_reset`). Guardrails are server-side: role change/deactivation can't
  target yourself (so the acting admin always remains), and role change/
  deactivate/reactivate need a reason. Removing the last active user of an
  approval role is allowed but returns a `warning`. Admins never see or set
  passwords - `send_reset` unlocks and emails a reset link
  (`lib/passwordReset.js`, shared with forgot-password).
- **Audit log**: every admin action writes `admin_audit_log`
  (`db/migrations/2026-10-17_admin_audit_log.sql`) via
  `lib/adminAudit.js` `writeAdminAudit(connection, ...)`, in the *same
  transaction* as the change. Snapshots never include password/token
  columns. Add any new action's label to `ADMIN_AUDIT_ACTIONS` in
  `utils/Admin/adminConstants.js`. Viewer: `/dashboard/admin/audit-log`.
- **Admin request editor**: `/dashboard/admin/requests` (all requests,
  `AdminRequestsTable`) and `/dashboard/admin/requests/[id]`
  (`AdminEditPurchase`) -> `GET/PUT/DELETE /api/admin/purchases/[id]`. It
  is deliberately separate from `generaleditpurchases` (the approval
  workflow): it can write any stage's data fields (`EDITABLE_FIELDS`) and
  products, but approval statuses only change via `reopenFromStage`, which
  resets that stage and every later one to pending, clears their sign-offs
  and reopens `request_closure` - it never marks a stage approved. Every save
  needs a reason, is audited (`purchase.edit`), sends no workflow emails
  (requester email only if "notify" is ticked, via `sendNotificationEmail`),
  and is refused with 409 if the request changed since it was opened
  (`version` = hash of the row + products, `lib/adminPurchases.js`).
  Unchanged product rows (matched by `purchase_products.id`) keep their
  stored values; changed rows are re-validated, `discountedValue` is
  recomputed server-side, and STAFFOFFER rows go through
  `verifyStaffOffers`. `ProductPricing`'s `adminEdit` prop mirrors this
  (no policy recalculation without a fresh fetch; manual price allowed).
  Delete is a hard delete with the full request + products kept in the
  audit entry's `before_data`. Stage definitions/option lists are shared
  via `utils/Approvals/` (`approvalStages.js`, `stageFieldOptions.js`).
- `/api/tablesdata/purchaseshistorydata` (every request) is approvers +
  admin only; for admin, `approvalStatus` means the overall outcome
  (declined anywhere / BI-approved / in progress). Staff use
  `/api/staffpurchaseshistory`.
- **Admin analytics**: `/dashboard/admin/analytics` (the `/dashboard/admin`
  landing page) <- `GET /api/admin/analytics?fromDate&toDate&status`. The
  count tiles and approval pipeline cover requests *submitted* in the range;
  the value tile, monthly charts, Volume & value and Products follow
  `status` (`approved` default / `inProgress` / `declined` / `all`,
  `STATUS_SCOPES` in the route) and range on the date each request reached
  that status (BI approval date / decline date / submission date) - so
  per-status figures don't sum to "all" for a period. User metrics are
  all-time; request value is the sum of its products' `discountedValue`;
  stage durations exclude cash auto-approvals. Charts are dependency-free single-series bar lists/
  columns in `components/Admin/Analytics/Charts.jsx` (one hue, values in
  text colours, tooltip + table view).
- Role-specific nav entries (cc's Fully Approved, admin's pages) come from
  `useDashboardRoutes().roleNavItems`; the sidebar, topbar and mobile
  drawer all render that list - add new role pages there, not per component.
  An entry with `children` is a group (admin's pages are one "Admin" group):
  a dropdown in the topbar, a collapsible section in the sidebar/drawer
  (open while one of its pages is current, `useNavGroupOpen`) and a portaled
  flyout in the collapsed sidebar. Use `flattenNavItems`/`navItemContains`
  (same file) for active-page checks. Menu keyboard handling is shared via
  `components/Reusables/ReuseSideBar/useNavMenu.js`. The sidebar and drawer
  nav lists are their only scrolling regions (header/footer pinned, edge
  fade from `hooks/useScrollFade.js`) and compact under the `short:`
  variant (viewport height ≤ 640px).
  In the desktop topbar (`TopSidebar.jsx`) labels never wrap: Home/New
  Purchase are pinned and role items that don't fit (measured against an
  invisible copy, re-fitted by a ResizeObserver) move into a "More" menu.
  The topbar container is capped at `max-w-7xl`, so this is about the
  number of role items, not just screen size.
- **Topbar/sidebar preference** is a plain `nav_layout` cookie
  (`utils/navLayout.js`), read by the dashboard `layout.js` and passed down
  via `InitialTopbarContext` so the server renders the right layout (no
  flash, no hydration mismatch). Read it with `useShowTopbar()` - never
  `useSidebarStore((s) => s.showTopbar)` directly (it's `null` until the
  user toggles in this tab). `setShowTopbar(boolean)` writes the cookie.
  Don't switch to zustand `persist` for this - it only knows the value
  after hydration.
- `middleware.js` only checks session presence for `/dashboard/:path*` (a
  single prefix now). Role-specific gating (e.g. payment-tracking) lives in
  the relevant `layout.js`, not middleware.
- `next.config.mjs` has a `redirects()` block mapping every old per-role URL
  (`/hrdashboard`, `/staffdashboard/purchase-history`, etc.) — plus the
  retired `/dashboard/history/:path*` subtree — to its `/dashboard/...`
  equivalent, `permanent: false`. If you find a bookmarked or hardcoded old
  URL somewhere, redirect it here rather than resurrecting the old route.
- Role→path logic lives in exactly two places: `utils/routes.js`
  (`VALID_ROLES`/`isValidRole` — is this a recognized role at all) and
  `utils/HandleActionClicks/useDashboardRoutes.js` (the one hook every
  component uses for `/dashboard/*` path building and `router.push`
  navigation). Don't reintroduce a role→path switch/map anywhere else.

## API auth conventions

- `lib/apiAuth.js` exports `requireAuth(handler, { roles })` — wrap every
  new API route with it. Omit `roles` to require any valid session; pass an
  array to restrict further. It injects `user` into the handler's context.
- `lib/db.js` exports `withConnection(fn)` and `withTransaction(fn)` in
  addition to the raw `pool` — use these instead of hand-rolling
  `getConnection/execute/release` (or `beginTransaction/commit/rollback`).
  For expected business-rule rejections inside a transaction (not found,
  already approved, wrong owner), either return a `{status, message}` object
  from the callback (fine for read-only rejections) or throw a small
  `RouteError` subclass (see `app/api/generaleditpurchases/[id]/route.js`,
  `app/api/staffposts/route.js`) so `withTransaction` rolls back and the
  route can still return the right HTTP status.
- Role never comes from a client-supplied query param for authorization —
  it's always read from `requireAuth`'s injected `user` object (JWT-derived).

## Shared table architecture

One generic table foundation under `components/DataTable/`, replacing three
former ~700-800-line near-duplicate components:

- `useTableQuery.js` — owns page/pageSize and the `react-query` call, and
  creates one `createFilterStore.js` zustand store per table instance (not a
  shared/global store) to hold filter state. Only _committed_ filters ever
  reach the query key/fetch — staging a filter value never fetches. Every
  committed-filter change (apply, pill removal, reset) resets to page 1.
- `createFilterStore.js` — the zustand store factory: `committed` (what's
  actually sent to the server + shown to count cards), `staged`/`stagedKeys`
  (fields currently being edited, pre-Apply), and actions `stageField`/
  `unstageField`/`setStagedValue`/`applyFilters` (merges staged into
  committed, fetches once) /`removeCommittedFilter`/`resetAll` (both apply
  immediately, no second Apply needed).
- `DataTable.jsx` — presentational: takes a `columns` config
  (`{key,label,toggleable?,render(row)}`), an optional `filterFields` config
  (consumed by `FilterPanel.jsx`), and renders loading/error/empty states +
  `Pagination`.
- `FilterPanel.jsx` — the committed-filters UI: "+ Add filter" opens a
  dropdown of fields not yet staged/committed; picking one adds an inline
  value editor (`text`/`select`/`dateRange`) to the staging area; "Apply
  filters" commits every staged field at once (one fetch). Committed filters
  render as rounded pills below — a pill's `x` removes just that filter
  immediately, and "Reset" clears everything immediately. A `dateRange`
  field always reads/writes `fromDate`+`toDate` together as one unit (one
  staged editor, one pill, one removal). The whole panel is a sticky
  (`sticky top-0`) rounded card so it stays visible while scrolling the
  table; once stuck (`useStickyBleed`: a sentinel + IntersectionObserver,
  plus a ResizeObserver measurement) it flattens into a toolbar whose
  bottom border spans `<main>`'s inner edges (scrollbar excluded) at every
  width, with padding compensated so the controls don't shift. The shell's
  rounded corner "ears" (`.shell-ear`, z-30) sit above it.
- Three consumers compose this foundation: `ApproverPurchasesTable.jsx`
  (hr/payroll/cc/bi), `StaffPurchasesTable.jsx`, `PaymentTrackingTable.jsx`
  (cc-only, adds invoice/closure columns and a Close action instead of
  Delete). Each also renders its own count-card component up top
  (`ApprovalCards`/`TrackingApprovalCards`), passing `table.filters` down so
  the cards and the table always agree on what's currently filtered.
- `components/Reusables/Select.jsx` is the accessible custom dropdown
  (`role="listbox"`, arrow/Home/End/Enter/Escape keyboard support) used
  everywhere a native `<select>` used to be, including inside
  `Pagination.jsx`'s rows-per-page picker. Use it for any new dropdown
  instead of a native `<select>`.

## Overlays & navigation feedback

- **Loading line**: one global line, `components/Reusables/LoadingLine.jsx`
  (root layout) + `store/useLoadingLineStore.js`. It starts itself on
  internal link clicks and back/forward, and on
  `useDashboardRoutes().navigate(path)` (which `handleHomeRoute`/
  `handleViewClick`/etc. use); it only shows after 150ms and stops on a
  pathname change. Don't call `startLoading`/`stopLoading` from components
  and don't add full-screen spinners for route changes - navigate through
  `useDashboardRoutes` instead of a bare `router.push`.
- **Modals**: every modal/dialog uses `components/Reusables/Modal/Modal.jsx`
  (portal, z-100 layer, Escape/backdrop close, focus trap + restore, scroll
  lock, enter/exit animation, and stops portaled clicks reaching e.g. a
  table row). Keep it mounted and toggle `open` so the exit animation runs;
  put per-open state in a child component so it resets on reopen. Below
  `md` it's either `mobile="sheet"` (default; bottom sheet - short
  dialogs) or `mobile="fullscreen"` (content-heavy: Settings, Change Email,
  Price Comparison, Changelog). `className` must give the panel an `md:`
  width; don't set width/height/rounding without `md:`.
- **Confirming async actions**: `ConfirmationDialog`/`DeleteConfirmation`
  take `busy` (+ `busyLabel`). Keep the dialog open with `busy` while the
  request runs and close it in `finally` - don't close it first and mount
  a separate full-screen loader (that swap caused a visible backdrop flash).
- **Scroll locking**: overlays lock the page via `lockPageScroll()` from
  `utils/scrollLock.js` (a shared counter), never by writing
  `document.documentElement.style.overflow` directly.
- **Delete action** in `RecentActionButtons.jsx` is deliberately disabled
  (`TABLE_DELETE_ENABLED = false`); the comment there explains how to
  re-enable it to match the server rule.

## Database schema changes

There is no migration framework or runner in this repo. Schema changes are
applied by hand against MySQL. When a change needs one, write the SQL to
`db/migrations/<date>_<description>.sql` (documentation only — nothing runs
it automatically) and note in the PR/commit that it must be run manually
before the code that depends on it deploys.

## Cached reference data & banners

- DB-managed reference data (credit periods, discount policies, T&Cs,
  approver emails, changelogs, banners) is cached with `unstable_cache`, and
  every loader is tagged from `utils/Cache/cacheTags.js` (`CACHE_TAGS`). New
  cached loaders must add their tag there too.
- **Admin-managed reference data** (`db/migrations/2026-10-18_reference_data.sql`):
  `invoicing_locations` (code PK, stored on `purchasesinfo`; label
  editable), `departments` (name stored on `users`/`purchasesinfo`; a
  rename via the admin page also renames it on `users`) and `app_settings`
  (only keys whitelisted in `APP_SETTINGS`, `utils/Admin/adminConstants.js`
  - currently `mpesa_till_number`). Edited at `/dashboard/admin/reference-data`
  (`/api/admin/reference-data`, audited, revalidates the tag itself).
  Entries are deactivated, never deleted: inactive ones aren't offered but
  still label existing records. Client components read them through
  `hooks/useReferenceData.js` (`useInvoicingLocations`, `useDepartments`,
  `useAppSettings`; react-query keys under `"referenceData"`). Registration
  and the admin profile edit only accept an active department. New accounts
  are always `staff` - there's no email->role mapping any more.
- `POST /api/revalidate` (header `x-revalidate-secret: $REVALIDATE_SECRET`,
  body `{"tags": [...]}` or `{"tags": "all"}`) busts those tags on demand
  after hand-edits in MySQL. It's secret-protected, not session-protected,
  since there's no admin role. It refuses all requests if the env var is unset.
- Dashboard banners come from the `system_banners` table
  (`db/migrations/2026-10-14_create_system_banners.sql`), managed at
  `/dashboard/admin/banners` (`components/Admin/Banners/`,
  `/api/admin/banners[/id]`, rules in `lib/adminBanners.js`; audited,
  revalidates the `banners` tag). Start/end travel as DB wall-clock
  `YYYY-MM-DDTHH:mm` strings, never JS Dates. A banner can be deleted only
  before it starts; after that it's deactivated. `updated_at` (the dismissal
  key) only moves when the message/severity changes or "show again" is
  ticked - the PATCH sets `updated_at = updated_at` otherwise. `BannerCard`
  is shared by `SystemBanners` and the admin preview.
  `utils/Cache/CachedBanners.js` is intentionally not `"use server"`
  (it would leak role-targeted rows as a callable action); only
  `app/api/banners/route.js` reads it and filters by the JWT role.
  `components/Banners/SystemBanners.jsx` applies `starts_at`/`ends_at`
  client-side and handles dismissal (info/warning only; critical can't be
  dismissed).

## Pricing & Staff Offers

- `getpurchasedetails` fetches TRADE/RTLRRP/ONLINE from Orion
  (`ORION_PRICE_CODES`) plus the active Staff Offer for the product code
  (one per code, regardless of item status or payment terms) from the
  `staff_offer_prices` table
  (`db/migrations/2026-10-15_staff_offer_prices.sql`, via
  `lib/staffOffers.js`). `selectLowestPrice` compares all four
  (`PRICE_CODES`, which is also the tie-break order: STAFFOFFER first). Only
  TRADE takes a discount policy; STAFFOFFER is already discounted.
- Staff Offers are intentionally **not** cached (unlike other reference
  data): the date window is checked against the DB's `NOW()` on every
  lookup. Overlapping active offers resolve to the most recently created.
- **Promos** (`db/migrations/2026-10-20_staff_offer_promos.sql`): every
  offer row belongs to a `staff_offer_promos` promo (`promo_id`, NOT NULL)
  that owns the window and an active flag. An offer applies only when the
  row *and* its promo are active and `NOW()` is inside the *promo's*
  window; the row's `starts_at`/`ends_at`/`promo_name` just mirror the
  promo (`syncPromoRows`) for hand queries. Managed at
  `/dashboard/admin/staff-offers` (`components/Admin/StaffOffers/`,
  `/api/admin/staff-offers/**`, rules in `lib/adminStaffOffers.js`, all
  audited under target `staff_offer`):
  - A row's price never changes in place (`staffOfferId` points at it):
    deactivate the product and add it again. A promo can't hold two active
    rows for one code.
  - Period changes follow the promo's phase (ignores `is_active`):
    upcoming - anything; running - start fixed, end not before now; over -
    extend only, within `PROMO_EXTEND_GRACE_DAYS` (7) of its end, else
    duplicate it. An ended promo can't be reactivated or take new products.
  - Anything that turns offers on (add, reactivate, extend, duplicate) and
    would overlap another active promo's offer for the same code returns
    409 `{ code: "overlap", overlaps }` until resent with
    `confirmOverlap: true` (`usePromoSave` shows the confirmation).
  - Duplicate creates a new promo with new rows copied from the source's
    active ones; the source is untouched.
  - Wall-clock start/end strings, as for banners (`lib/adminForm.js`); an
    end is inclusive to the minute (stored `HH:mm:59`).
  - **Excel** (`lib/staffOfferSheet.js`, exceljs): `GET .../template`,
    `GET .../[id]/export` (template columns first, so an export re-uploads
    as-is) and `POST .../upload` (multipart; into `promoId`, or a new promo
    from name/startsAt/endsAt). `mode=preview` saves nothing and returns
    per-row errors/warnings (`analyzeOfferUpload`); `mode=commit`
    re-parses the file, refuses the whole file if any row has an error,
    needs `confirmOverlap` for overlaps, and inserts in batches in one
    transaction with one `offer.upload` audit entry listing every row.
    Limits: `OFFER_UPLOAD_MAX_ROWS` (5,000) and `OFFER_UPLOAD_MAX_BYTES`
    (5 MB) - the Nginx proxy needs `client_max_body_size` of at least that
    (its default is 1 MB). Upload rules shown to admins live in
    `OFFER_UPLOAD_RULES` (`utils/Admin/adminConstants.js`).
- `staffposts` re-checks STAFFOFFER rows against the DB with
  `verifyStaffOffers` and persists `staffOfferPrice`/`staffOfferId` from
  the DB, never the client.
- Prices are fetched only when a request is created (`NewPurchase`). On the
  edit page CC works from what was recorded at submission: no re-fetch, no
  discount-policy recalculation, product codes and item names locked, no
  adding/removing products (`isCcEdit` in `ProductPricing.jsx`). The one
  price change CC can make is a manual (`MANUAL`) price + discount, e.g.
  one approved by a product manager; "Restore recorded price" undoes it
  back to the submitted row (`recordedProduct`). `generaleditpurchases` enforces this
  (`buildCcProductRows`): it re-writes every locked field from the stored
  row, so a saved Staff Offer sticks after the promo ends. Other price
  corrections at that stage are made by hand in the DB. One-off data
  scripts like the Staff Offer backfill live in `db/queries/`.

## Email

- Every email goes through `sendEmail` in `lib/emailSender.js` (Microsoft
  Graph). Workflow notifications (`lib/Email/userEmailHandler.js`,
  `lib/Email/ApproversEmailHandler.js`) must use `sendNotificationEmail`
  instead, which honors `NOTIFICATION_EMAILS_ENABLED`: only the value
  `false` (case-insensitive) skips them, logging each skipped subject and
  recipient; unset or any other value sends normally. Server-only env var,
  read at runtime — a restart applies it, no rebuild needed.
- Auth emails (`lib/verificationEmail.js`, `lib/nodemailer.js` password
  reset) deliberately call `sendEmail` directly and are never skipped —
  registration, Change Email and password reset can't complete without them.
- `sendEmail` retries 429 (honouring `Retry-After`), 5xx, network failures and
  MSAL token failures - up to 4 attempts with backoff, 30s per attempt - and
  sends at most 2 at a time per PM2 worker (Exchange caps ~4 concurrent
  requests per mailbox). Other 4xx fail immediately. A timed-out attempt may
  still have been delivered, so a retry can rarely duplicate an email.
- Orion price lookups (`getpurchasedetails`) cache only real answers (a price
  or "not on this list"); timeouts/network/5xx/no-token are thrown inside
  `unstable_cache` so they aren't cached. Concurrent identical lookups share
  one in-flight call, Orion calls are capped at 6 per worker
  (`utils/createLimiter.js`), and `utils/tokenManager.js` fails fast for 15s
  after a failed Orion login.
- `sendEmail` wraps every email (notifications and auth) with
  `withNoReplyNotice` (`utils/EmailTemplates/noReplyNotice.js`): a slim
  "automated, don't reply" line at the top (after a hidden subject preheader
  so inbox previews stay useful) and an "unmonitored mailbox - open Staff
  Purchase Portal" footer linking `NEXT_PUBLIC_BASE_URL`. Templates must not
  add their own do-not-reply text.
- Email links (workflow templates, the password-reset link, that footer)
  use `NEXT_PUBLIC_BASE_URL` as-is, so it must be the full public URL
  *including* the base path (e.g. `https://host/staffproductpurchase`).
  Nothing derives it from `NEXT_PUBLIC_BASE_PATH` - keep the two in sync per
  environment.

## Query params & pagination

- `utils/FetchPurchases/buildPurchaseQueryParams.js` is the single place
  that turns a filters object into a `URLSearchParams` — every fetch
  function in `utils/FetchPurchases/` and `utils/FetchCardCounts/` uses it.
  Extend it (not ad hoc string concatenation) when adding a new filter.
- `app/api/tablesdata/purchaseshistorydata/route.js` and
  `app/api/staffpurchaseshistory/route.js` do real server-side pagination
  (`LIMIT`/`OFFSET` + a companion `COUNT(*)` query) and additive
  (AND-combined) filtering — every populated filter param contributes its
  own `WHERE` clause. Response shape is always
  `{data, page, pageSize, total, totalPages}`, never a bare array.
  `pageSize`/`offset` are inlined as literals rather than bound as `?`
  placeholders — mysql2's `execute()` (server-side prepared statements) can
  throw `ER_WRONG_ARGUMENTS: Incorrect arguments to mysqld_stmt_execute`
  when LIMIT/OFFSET are passed as placeholders. They're safe to inline
  because they're computed via `Math.min`/`Math.max`/`parseInt` right above,
  never raw query-string text — keep it that way if you touch this code.
- `app/api/approval-counts/route.js` and `app/api/closure-counts/route.js`
  accept the same non-pagination filter params. **Grand/reference totals
  stay unfiltered on purpose** (`total`, `totalApproved`, `totalDeclined` in
  approval-counts) while the status-paired counts (`pending`/`declined`/
  `approved` in approval-counts; `open`/`closed`/`approved` in
  closure-counts) recompute against the active filters. If you add a new
  count metric, decide explicitly which bucket it belongs in — don't assume.

## Business rules that must not change silently

- Approval chain is sequential: `payroll → hr → cc → bi`. An approver only
  sees/can act on a request once every prior stage has approved it. This
  logic is intentionally duplicated in three places (client `useTableQuery`
  usage doesn't encode it — it's server-side only now, in
  `purchaseshistorydata/route.js` and `approval-counts/route.js`) — keep
  them in sync if the chain ever changes, along with
  `utils/Approvals/approvalStages.js` (the admin editor's stage order).
- `deletepurchases` is requester-only (staff/admin), and only for the requester's own,
  not-yet-BI-approved request (enforced server-side by
  `app/api/deletepurchases/[id]/route.js`, mirrored client-side in
  `RecentActionButtons.jsx`'s disabled-state logic).
- `closepurchase`/Payment Tracking is cc/bi-only.
- `generaleditpurchases/[id]/route.js` whitelists exactly which columns each
  role may write (`allowedFields`) — don't loosen this without checking the
  approval-chain implications.

## Verification

No test suite. After any change: `npm run build` (catches route-tree/import
errors; there's no real type-checking since this is plain JS).
