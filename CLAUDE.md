# CLAUDE.md

Guidance for future Claude Code sessions working in this repo.

## Project

Staff Product Purchase Portal — an internal Next.js 15 (App Router) app for
digitizing a staff purchase-request approval workflow. Five roles: `staff`,
`payroll`, `hr`, `cc` (credit control), `bi` (billing/invoicing). Requests
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
  table.
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

## Database schema changes

There is no migration framework or runner in this repo. Schema changes are
applied by hand against MySQL. When a change needs one, write the SQL to
`db/migrations/<date>_<description>.sql` (documentation only — nothing runs
it automatically) and note in the PR/commit that it must be run manually
before the code that depends on it deploys.

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
  them in sync if the chain ever changes.
- `deletepurchases` is staff-only, and only for the requester's own,
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
