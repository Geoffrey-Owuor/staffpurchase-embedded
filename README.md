# 🛒 Staff Product Purchase Portal

### Internal Workflow Automation & Request Management System

The **Staff Product Purchase Portal** is a specialized web application designed to digitize and automate the internal purchasing process for employees. By moving away from manual paperwork/emails to a centralized digital workflow, this system increases transparency, reduces processing time, and ensures accurate record-keeping for staff transactions.

## 🎯 Project Overview

This application serves as a self-service bridge between staff members and the HR/finance departments. It is built to handle the specific lifecycle of a staff product purchase:

- **Request Initiation:** Staff members can browse approved items and initiate purchase requests.
- **Workflow Automation:** Requests are automatically routed through a fixed sequential approval chain (Payroll → HR → Credit Control → Billing/Invoicing).
- **Status Tracking:** Real-time visibility into the status of a purchase (Pending, Approved, Declined, Closed).
- **Historical Auditing:** A permanent, filterable, paginated record of all past transactions for both the user and administration, exportable to Excel.

## 🚀 Key Features

### ⚡ Workflow & Automation

- **Self-Service Dashboard:** One shared `/dashboard` route tree for every role (Staff, Payroll, HR, Credit Control, Billing/Invoicing) — the UI adapts to the signed-in user's role rather than routing them to a separate dashboard URL per role.
- **Server-Side Filtering & Pagination:** Purchase history, staff history, and payment tracking tables query the server directly (combined, AND'd filters — search, reference number, payroll number, date range, approval status, payment terms, credit period, closure status), rather than fetching everything and filtering in the browser.
- **Filter-Aware Count Cards:** The Pending/Declined/Approved (and Open/Closed) summary cards recompute against the same active filters as the table beside them, so the numbers and the rows always agree. Reference totals (e.g. "Total requests") stay as fixed, unfiltered figures.
- **Digital History:** Automated logging (MySQL) of all requests creates a seamless audit trail, replacing manual spreadsheets.
- **Real-time Feedback:** Automated email notifications on request state changes (Pending, Approved, Declined) to reduce user uncertainty.
- **Embeddable / SSO:** The app can run standalone or embedded (iframed) behind a reverse proxy, honoring `NEXT_PUBLIC_BASE_PATH`, with a signed-URL SSO endpoint (`/api/external/sso`) for handoff from an external host.

### 🎨 User Experience

- **Modern Interface:** A clean, responsive UI built for efficiency, with an accessible custom dropdown component (keyboard-navigable listbox) replacing native `<select>` elements throughout the filter/table UI.
- **Theme Support:** Fully accessible Dark and Light modes to suit user preference.
- **Optimized Performance:** Fast page loads and transitions using the Next.js App Router.

## 🛠️ Technology Stack

- **Core Framework:** [Next.js 15+](https://nextjs.org/) (App Router)
- **UI Library:** React 19
- **Data Fetching/Cache:** TanStack React Query 5
- **Database Access:** raw `mysql2/promise` (no ORM)
- **Auth:** JWT sessions (`jose`) in an httpOnly cookie
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React
- **Typography:** Geist Font Family

---

## Roles & Routing

Five roles share one route tree under `/dashboard`:

| Route | Description |
|---|---|
| `/dashboard` | Home — count cards + purchase table (role-aware: staff see their own requests, others see the approval queue) |
| `/dashboard/history` | The same table, dedicated full-page view |
| `/dashboard/history/[id]` | View a single purchase request |
| `/dashboard/history/[id]/edit` | Edit/approve a purchase request (approver roles only, gated per-field by role) |
| `/dashboard/new-purchase` | Submit a new purchase request |
| `/dashboard/payment-tracking` | Fully-approved requests awaiting payment/closure — **Credit Control role only** |

Old per-role URLs (`/hrdashboard`, `/staffdashboard/purchase-history`, etc.) redirect to their `/dashboard` equivalents (see `next.config.mjs`).

## Setup

### Prerequisites

- Node.js (compatible with Next.js 15)
- A MySQL-compatible database
- SMTP credentials (Gmail) and/or Microsoft Entra ID app registration for outbound email

### Installation

```bash
npm install
```

### Environment Configuration

Configure a `.env` file with (non-exhaustive — check `lib/db.js`, `app/lib/auth.js`, `middleware.js`, `app/api/external/sso/route.js`, and `lib/emailSender.js` for the authoritative list):

- `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` — MySQL connection
- `JWT_SECRET` — session token signing secret
- `SSO_SHARED_SECRET` — HMAC secret shared with the embedding host for `/api/external/sso`
- `NEXT_PUBLIC_BASE_PATH` — set when served under a sub-path (embedded deployments)
- `NEXT_PUBLIC_BASE_URL` — absolute base URL used in outbound email links
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_SENDER`, and/or `AUTH_MICROSOFT_ENTRA_ID_ID` / `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` / `AUTH_MICROSOFT_ENTRA_ID_SECRET` — outbound email
- `ORION_API_KEY` — external ERP price-lookup integration (`app/api/getpurchasedetails`)

### Development

```bash
npm run dev     # starts on port 1557 (Turbopack)
```

### Build & Deploy

```bash
npm run build
npm run start
```

`ecosystem.config.js` is included for PM2-based process management in production.

## Authentication & SSO

- Standard email/password login (`/login`) sets an httpOnly JWT `session_token` cookie (72h expiry), with account lockout after 3 failed attempts.
- `/api/external/sso` accepts a signed (`email`, `timestamp`, `signature`) query string from a trusted embedding host, verifies the HMAC + a 2-minute replay window, and establishes a session for the corresponding user — then redirects to `/dashboard`.
- Registration is a 3-step flow (email verification code → complete registration) under `/register`.

## Data Fetching & API Conventions

- API routes are wrapped with `requireAuth()` (`lib/apiAuth.js`) for session/role checks, and use `withConnection()`/`withTransaction()` (`lib/db.js`) for database access instead of hand-rolled connection management.
- Purchase list endpoints (`/api/tablesdata/purchaseshistorydata`, `/api/staffpurchaseshistory`) return `{ data, page, pageSize, total, totalPages }` and support `page`, `pageSize`, and combinable filters (`search`, `referenceNumber`, `payrollNumber`, `fromDate`/`toDate`, `approvalStatus`, `paymentTerms`, and more depending on the route).
- Client-side, `utils/FetchPurchases/buildPurchaseQueryParams.js` is the single place query strings are built from a filters object — every fetch helper uses it.

## Testing & Validation

There is currently no automated test suite (`npm run lint` also isn't configured — no ESLint config exists in the repo). Validate changes with:

```bash
npm run build
```

...and manual verification of the affected role(s)/route(s) in a browser.

---

### Basic Folder Structure

- `/app`: App Router pages, layouts, and API routes. `app/(dashboard)/dashboard` is the shared route tree for all roles; `app/api` holds the backend.
- `/components`: Reusable UI components. `components/DataTable` is the shared table/filter/pagination foundation.
- `/lib`: Server-only infrastructure — database pool/helpers (`lib/db.js`), API auth wrapper (`lib/apiAuth.js`), email sending.
- `/utils`: Client/shared helper functions — query-param building, role/route helpers, purchase/count-card fetch functions.
- `/public`: Static assets.

See `CLAUDE.md` for a more detailed architectural guide aimed at future development sessions.
