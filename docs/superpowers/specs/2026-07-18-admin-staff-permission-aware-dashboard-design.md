# Admin And Staff Permission-Aware Dashboard Design

## Scope

Replace the generic Home summary with one authenticated operations dashboard. It is shared by admins and staff, but only displays queues and actions allowed by the effective permission set returned from `GET /api/auth/me`.

The dashboard is an entry point into existing workbenches. It does not create a second task system, duplicate order/production/design tables, or make role names the access-control source.

## Existing Flow To Reuse

1. Login restores the authenticated account through `useCurrentUserQuery` and stores its permissions and scopes.
2. `ProtectedRoute` protects page routes, and `filterNavigationByUser` removes sidebar entries the user cannot access.
3. Orders, Production/Scale, QC, Design, Vendor Submissions, and Shipping already own their list, summary, mutation, loading, and empty states.
4. `OperationsPageShell`, `OperationsHeader`, `OperationsTabs`, `OperationsTable`, `OperationsPagination`, and `StatusBadge` define the existing operational UI language.

## Persona Behavior

### Staff

- A staff user sees only queue rows whose required permission they hold.
- Each row shows queue name, current count, severity, concise operational meaning, and a single action that opens the existing workbench at the relevant filter.
- A user with more than one permission sees multiple relevant rows, ordered by blocking work before normal workload.
- An authenticated user with no supported queue permission sees a clear empty state and only the navigation they can access.

### Admin

- An admin with `MANAGE_SYSTEM` sees all supported operational queues because the existing permission helper already treats that code as a bypass.
- Admin sees a compact management section linking to existing Users & Roles, Shops, Mapping, Vendors, Audit Log, and Reports only when their corresponding permission is present.
- Admin receives the same queue rows as staff. There is no separate admin dashboard in this phase.

## Queue Data Contract

The dashboard must not call `GET /api/reports/operations/overview` for staff queues. That endpoint requires `REPORTS:READ` and is scoped as a reporting surface, so it is not a valid common staff entry point.

Use the existing module summary endpoints conditionally:

- `ORDERS:READ` or `ORDERS:WRITE`: `GET /api/orders/summary` for order and customer-exception counts.
- `PRODUCTION:READ`, `PRODUCTION:WRITE`, `DESIGN:WORK`, or `DESIGN:REVIEW`: `GET /api/production/tasks/summary` for Scale, QC, and production-blocker counts.
- `DESIGN:READ`, `DESIGN:WRITE`, `DESIGN:WORK`, or `DESIGN:REVIEW`: `GET /api/design/tasks/summary` for design work.
- `VENDOR_SUBMISSIONS:READ`: `GET /api/vendor-submissions/summary` for ready/failed submissions.
- `SHIPMENTS:READ`: `GET /api/shipments/summary` for tracking-pending shipments.

Phase 1 uses the client-side permission set to decide which queries are enabled. Each endpoint remains the backend authority and enforces its own permission and scope. Do not grant `REPORTS:READ` merely to render the dashboard, and do not create an aggregate backend endpoint unless the parallel requests are measured as a real issue.

## Dashboard Composition

- Keep `HomePage` as the only route at `/`.
- Use `OperationsPageShell` and `OperationsHeader` for spacing and page hierarchy.
- Render one small summary strip derived from visible queue totals; do not add a generic KPI-card framework.
- Render a primary `My work` queue using existing table/status primitives on desktop and a readable stacked row layout on narrow screens.
- Render a secondary `Needs attention` list for blockers, failed vendor submissions, and missing tracking, only when the user can access their target workspace.
- Render an admin-only `Management` link group from the existing route constants and permission checks; do not add new admin routes.
- Preserve skeleton, empty, permission-denied, retry, and partial-data states. A failed permitted query must not hide successful queues from other modules.

## Navigation And Filters

Dashboard actions must target existing routes:

- Orders: use the existing search-param conventions.
- Design: use the existing `status`, `priority`, and task-type search-param conventions.
- Scale, QC, Vendor Submissions, and Shipping: add only the minimum URL search-param parsing necessary for dashboard deep links. Keep their existing state shape, query builders, and default behavior unchanged when no search parameter is supplied.

The dashboard must not inspect or mutate workbench internals. It creates URLs; the target page owns filter parsing and API query construction.

## Permission Rules

- Use `hasAnyPermission` and `canBypassPermissions` from `features/auth/utils/authz.js` for dashboard visibility.
- Each queue configuration declares `requiredAnyPermissions`, route, query parameters, count selector, severity, and copy key.
- Do not use `APP_ROLES`, `allowedRoles`, local storage values, or role-name branching to decide dashboard access.
- Match route semantics: use any-permission checks where a target route permits alternatives, such as QC and Design.

## Boundaries

- No new dependency.
- No new backend endpoint in phase 1.
- No duplicated data tables or workflow mutations in Home.
- No change to backend authorization policy or scoped RBAC semantics.
- No notification center, assignment engine, SLA engine, or persistent dashboard preferences in this phase.

## Verification

- Unit-test queue visibility, count mapping, URL generation, permission bypass, and partial-query failure behavior.
- Extend target-page tests for each newly supported deep-link filter.
- Run focused Node tests, `npm run lint`, and `npm run build`.
- Manually verify one account for each of Orders, Design, QC, Fulfillment, and Admin, plus an account with no supported dashboard queue permission.
