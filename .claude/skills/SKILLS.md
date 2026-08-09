<!-- Claude Code instructions for the staffproduct purchase project -->

# SKILLS.md — Project Refactoring & Implementation Guide

## 1. Purpose

This document guides Claude Code through the requested refactoring of the **staffproduct purchase** project.

The goal is to simplify the project's routing and data-fetching architecture, centralize filtering and pagination, make count cards and tables use the same query state, remove obsolete functionality, clean up unused files, and document the resulting architecture.

**Important:** Do not begin making code changes immediately. First inspect the project and create a concrete implementation plan based on the actual codebase.

---

## 2. Required Workflow

Follow this workflow in order:

1. **Explore the project**
   - Inspect the project structure.
   - Identify the framework, routing mechanism, authentication/SSO flow, API structure, data-fetching approach, table implementations, role handling, and existing shared components/utilities.
   - Locate `middleware.js` and `/api/external/sso` or their current equivalents.
   - Locate all dashboard-specific routes such as `/payrolldashboard`, `/hrdashboard`, and similar routes.
   - Locate all purchase tables, payment tracking tables, count cards, search/filter controls, pagination implementations, and the Recent Purchases tab.
   - Identify all route mappers, object mappers, role-to-route functions, and duplicated routing logic.

2. **Create an implementation plan before editing**
   - Base the plan on the actual repository rather than assumptions.
   - Group changes into logical phases.
   - Include dependencies between changes.
   - Identify files that will be created, modified, moved, or potentially deleted.
   - Record bugs, inconsistencies, duplicated logic, and architectural problems discovered during exploration.
   - Include those bugs in the implementation plan instead of silently fixing unrelated issues.

3. **Ask follow-up questions when necessary**
   - If an important project-specific requirement cannot safely be inferred from the code, ask the user before implementing it.
   - Do not ask questions merely for information that can be established by inspecting the repository.
   - Do not block progress over minor details; use clearly documented assumptions where appropriate.

4. **Implement the plan incrementally**
   - Keep changes cohesive and reviewable.
   - Preserve existing behavior unless the requested refactoring intentionally changes it.
   - Avoid introducing duplicate abstractions while consolidating existing ones.
   - Reuse existing project conventions where they remain appropriate.

5. **Verify the implementation**
   - Run the project's available linting, type checking, tests, build, and relevant validation commands.
   - Verify routing, authentication/SSO, role gating, table data, filters, pagination, payment tracking, and count-card behavior.
   - Check that URL/query parameters remain consistent across the relevant UI and API layers.
   - Fix regressions discovered during verification.

6. **Clean up**
   - Remove files, components, utilities, route mappers, API handlers, and other code that is genuinely no longer referenced or required.
   - Do not delete a file merely because it appears unused from a single search; confirm its references and framework conventions first.
   - Re-run validation after deletion.

7. **Document the final architecture**
   - Create or initialize `CLAUDE.md` with project-specific instructions and architectural guidance for future Claude Code sessions.
   - Update `README.md` so it accurately describes the current project structure, routing, data-fetching approach, filtering, pagination, roles, setup, and relevant development commands.
   - Do not document functionality that does not exist.

8. **Provide a final change summary**
   - Summarize the implemented changes.
   - List important files/components changed.
   - List files deleted and why.
   - List bugs found and fixed.
   - List validation commands/results.
   - Clearly identify anything that could not be verified or any remaining concern.

---

## 3. Target Architecture

### 3.1 Single Dashboard Route

Replace unnecessary role-specific dashboard routes with a common authenticated route:

`/dashboard`

Examples of routes that should be investigated for removal include:

- `/payrolldashboard`
- `/hrdashboard`
- Other equivalent role-specific dashboard routes discovered during exploration.

The user's role should determine what the user is allowed to see and do **inside the shared dashboard**, rather than determining which dashboard URL the user must be sent to.

Role handling must remain secure. UI gating alone is not sufficient for authorization; server/API authorization must continue to enforce access where required.

### 3.2 Simplify SSO and Middleware Routing

Inspect the current `middleware.js` and `/api/external/sso` flow.

Remove unnecessary role-to-route object mappers and routing functions where they exist solely because the application has separate dashboard URLs.

The intended direction is:

- Authenticate the user.
- Resolve/validate the user's role.
- Route authenticated users to `/dashboard`.
- Let the dashboard and server-side authorization determine role-specific behavior.
- Preserve any genuinely necessary SSO/security logic.

Do not remove authorization checks merely to simplify routing.

---

## 4. Shared Table Architecture

Create or consolidate toward a **single reusable table architecture** capable of serving the relevant roles and datasets.

The table should receive the appropriate data based on role and query parameters rather than requiring separate duplicated table implementations for each role.

The architecture should support, as applicable:

- Purchase data.
- Payment tracking data.
- Role-specific columns or actions.
- Search.
- Filters.
- Server-side pagination.
- Loading states.
- Empty states.
- Error states.
- Consistent pagination controls.

Do not force unrelated datasets into one component if doing so would make the component excessively complex. Prefer a shared table/data-grid foundation with configurable columns, filters, and data behavior where that is more appropriate.

---

## 5. Server-Side Pagination and Data Fetching

Move table pagination from client-side pagination to server-side pagination.

The server/API should receive the pagination state and return the appropriate page of data plus sufficient metadata to render pagination, such as:

- Current page.
- Page size.
- Total records or equivalent pagination metadata.
- Data for the requested page.

Inspect the existing API/query layer before implementing this so the new implementation follows the project's existing data-access conventions.

The client should not fetch the entire dataset merely to paginate it locally.

Ensure changing any of the following resets pagination appropriately when required:

- Search term.
- Filter.
- Role-dependent query state.
- Page size.
- Other query parameters that materially change the result set.

---

## 6. Centralized Query Parameters Builder

Create or consolidate a shared query-parameter builder.

The same canonical query state should drive:

- Table data requests.
- Payment tracking data requests.
- Count-card requests.
- Search.
- Filters.
- Pagination.
- Any other relevant server-side data requests.

Avoid separately reconstructing equivalent query parameters in different components.

The builder should:

- Have a clear input/output contract.
- Handle optional parameters consistently.
- Avoid sending unnecessary undefined/null parameters.
- Encode values safely.
- Produce consistent parameter names across consumers.
- Be easy to extend when a new filter is introduced.

---

## 7. Count Cards Must Share Table Filters

Currently, table query filters apply to tables but not to count cards.

Change this so count cards use the same query parameters/filter state as the relevant table.

For example:

`Filter state → shared params builder → table query + count-card query`

This must prevent situations where:

- The table shows filtered results while cards show unfiltered totals.
- Different components interpret the same filter differently.
- A filter is added to one request but forgotten in another.

Be precise about which count-card metrics should be filtered. Inspect the current API/business logic before changing semantics.

---

## 8. Centralized Search and Filter UI

Search/filter behavior is currently scattered across multiple tables.

Consolidate reusable logic for:

- Search input/state.
- Filter state.
- Filter buttons.
- Custom dropdowns.
- Pagination controls.
- Query-parameter synchronization.

The requested UI direction is to use **buttons and custom dropdowns instead of native `<select>` controls** where the project currently uses native selects for these filters.

Do not replace native selects blindly. Inspect accessibility and existing component-library conventions first. Any custom dropdown must retain appropriate keyboard/accessibility behavior.

The shared filtering architecture should make adding a new filter require minimal changes and avoid duplicating filtering logic across roles.

---

## 9. Payment Tracking

The shared table/data-fetching architecture must also support the payment tracking table.

Payment tracking data should be determined through the same parameter-building approach where the underlying API/data model permits it.

Inspect whether payment tracking currently has:

- A separate table.
- A separate API.
- Separate filtering logic.
- Separate pagination.
- Different query parameters.

Consolidate only where the semantics are genuinely compatible. Do not merge unrelated API contracts solely to achieve code reuse.

---

## 10. Remove Recent Purchases

The existing **Recent Purchases** tab returns only the last 12 days.

After server-side fetching, filtering, and pagination are implemented and verified, remove this obsolete tab if the new table provides equivalent or better access to purchase history.

Removal should include all genuinely obsolete:

- UI components.
- Tabs/navigation entries.
- API endpoints used exclusively by the tab.
- Query functions.
- Hooks.
- Types.
- Utilities.
- Tests.
- Imports.
- Styles/assets.

Confirm that no other feature depends on these files before deleting them.

---

## 11. Bug Discovery and Fixes

During exploration, actively look for bugs and inconsistencies related to the affected architecture.

Examples include:

- Incorrect role routing.
- Inconsistent role checks.
- SSO routing edge cases.
- Filters not being applied consistently.
- Count cards disagreeing with table filters.
- Pagination producing incorrect pages.
- Pagination not resetting after filter changes.
- Client-side fetching of unnecessarily large datasets.
- Duplicate API requests.
- Race conditions or stale query results.
- Incorrect query parameter names/defaults.
- Missing loading/error/empty states.
- Broken links after route consolidation.
- Components importing obsolete route names.
- Dead or unreachable code.
- API authorization gaps.
- Incorrect totals/count queries.
- Payment tracking inconsistencies.
- Recent Purchases dependencies that would be missed during deletion.

Do not invent bugs. Only report bugs supported by repository evidence or by reproducible behavior during validation.

---

## 12. File and Code Cleanup

After implementation:

1. Search for references to all removed routes.
2. Search for references to all removed components/utilities.
3. Search for obsolete query parameters and API endpoints.
4. Remove dead imports.
5. Remove unused files.
6. Remove obsolete route mappers/object mappers.
7. Remove duplicated filtering/pagination implementations where they have been replaced.
8. Run lint/type-check/build/tests again.

Be especially careful with framework conventions where files may be discovered automatically even when there are no explicit imports.

---

## 13. CLAUDE.md Requirements

Create/update `CLAUDE.md` after the architecture changes are complete.

It should document the **actual resulting project**, including:

- Project purpose.
- Technology/framework.
- Important directories.
- Authentication and SSO flow.
- Role/authorization model.
- `/dashboard` routing model.
- Shared table architecture.
- Query-parameter builder.
- Server-side pagination.
- Centralized search/filter behavior.
- Count-card/query relationship.
- Payment tracking architecture.
- Important API/data-fetching conventions.
- Testing/lint/build commands.
- Important rules future Claude Code changes must follow.

Do not duplicate the entire `SKILLS.md`; `CLAUDE.md` should be concise, practical, and project-specific.

---

## 14. README.md Requirements

Update `README.md` after implementation so it reflects the current repository.

Where applicable, document:

- Project overview.
- Prerequisites.
- Installation.
- Environment configuration.
- Development commands.
- Build/deployment commands.
- Authentication/SSO overview.
- Role-based dashboard behavior.
- Shared table/filter/pagination architecture.
- Relevant API/data-fetching conventions.
- Testing and validation.
- Any important operational notes.

Remove documentation for routes or functionality that no longer exists.

Do not claim that a command, feature, environment variable, or deployment process exists unless it is confirmed from the repository.

---

## 15. Validation Checklist

Before considering the work complete, verify:

### Routing

- [ ] `/dashboard` works for authenticated users.
- [ ] Role-based access/gating still works.
- [ ] Unauthenticated users are handled correctly.
- [ ] SSO still works.
- [ ] Obsolete dashboard routes are removed or intentionally retained only when required.
- [ ] No stale links reference removed dashboard routes.

### Data

- [ ] Shared query-parameter builder is used consistently.
- [ ] Search is server-side where required.
- [ ] Filters are server-side where required.
- [ ] Pagination is server-side.
- [ ] Payment tracking uses the intended shared query architecture.
- [ ] Count cards use the relevant table filter state.
- [ ] Counts and table results remain semantically consistent.

### UI

- [ ] Shared table component works for all intended roles.
- [ ] Filter controls behave consistently.
- [ ] Custom dropdowns work correctly and remain accessible.
- [ ] Pagination controls are reusable and consistent.
- [ ] Loading, empty, and error states remain functional.
- [ ] Filter changes correctly update the table and cards.
- [ ] Pagination resets appropriately after relevant filter changes.

### Cleanup

- [ ] Recent Purchases is removed after its replacement is verified.
- [ ] Obsolete components are removed.
- [ ] Obsolete route mappers are removed.
- [ ] Obsolete API/query code is removed where safe.
- [ ] Unused imports/files are removed.
- [ ] No stale route/query references remain.

### Documentation

- [ ] `CLAUDE.md` exists and reflects the final architecture.
- [ ] `README.md` reflects the final project.
- [ ] Documentation does not describe removed functionality.

### Quality

- [ ] Lint passes or known pre-existing failures are documented.
- [ ] Type checking passes or known pre-existing failures are documented.
- [ ] Tests pass or known pre-existing failures are documented.
- [ ] Production build passes or known pre-existing failures are documented.
- [ ] Bugs discovered during exploration are documented with their resolution/status.

---

## 16. Final Reporting Format

At the end of the implementation, provide a concise report containing:

### Implemented

- Major architectural changes.
- Routing changes.
- Shared table/filter/pagination changes.
- Query-builder/count-card changes.
- Payment tracking changes.
- Recent Purchases removal.

### Bugs Found and Fixed

For each:

- What was wrong.
- Where it occurred.
- What was changed.
- How it was verified.

### Files Removed

List each removed file and why it became obsolete.

### Validation

List the commands run and their results.

### Remaining Issues

Clearly identify anything that could not be verified, any pre-existing failures, and any decisions that require user input.

---

## 17. Important Guardrails

- **Inspect first; edit second.**
- Do not assume the project structure from this document.
- Do not replace working architecture merely for stylistic reasons.
- Do not weaken authentication or authorization while simplifying routing.
- Do not expose data across roles because a shared component was introduced.
- Do not fetch an entire dataset on the client to simulate server-side pagination.
- Do not duplicate query/filter logic between count cards and tables.
- Do not delete files until their references and framework behavior have been checked.
- Do not remove Recent Purchases until the replacement server-side table behavior is working.
- Do not silently change business rules for counts, payments, roles, or filtering.
- Do not fix unrelated bugs unless they are necessary for the requested refactoring or create a clear security/correctness issue.
- Prefer small, composable shared utilities/components over one extremely large "do everything" component.
- Preserve accessibility when replacing native controls with custom UI.
- Verify every architectural change before moving to cleanup.

## 18. Final Note

- Anything that you would not be able to test or verify, notify me after completion and I'll perform the tests manually
