# Portal Shop Workspace Design

## Goal

Provide a small, permission-aware workspace for creating internal shops and controlling whether existing shops can receive new operational work.

## Route And Navigation

- Route: `/portal/shops`
- Sidebar label: Shops
- Visible when the authenticated account can read at least one shop through the backend-filtered shop list or has global `SHOPS:READ`.
- Create requires global `SHOPS:WRITE` because a new shop scope does not exist yet.
- Status changes require global or exact shop-scoped `SHOPS:WRITE`.

## Screen Layout

The page contains one compact toolbar and one DataTable. Do not add summary cards because the current API does not expose meaningful aggregates.

Toolbar controls:

- Debounced name search
- Status filter: all, active, inactive, suspended
- Create Shop action when globally authorized

Table columns:

- Shop name
- Currency
- Status
- Updated time
- Icon action for managing status

Clicking a row opens the same centered management modal as the action icon. Pagination is server-driven and URL-backed.

## Create Flow

The create modal contains:

- `name`: required
- `currency`: optional in the API and defaulted by the server to `USD`; the UI presents the existing supported currency selector

Creation always produces an `ACTIVE` shop. On success, close the modal, show a success toast, and refresh the list without refetching unrelated Portal queries.

## Manage Flow

The management modal shows name and currency as read-only identity fields and exposes only the status transition supported by the backend:

- `ACTIVE`
- `INACTIVE`
- `SUSPENDED`

Do not add hard delete. Existing downstream records and authorization history must remain intact. Do not add name or currency editing until the backend defines historical and financial semantics for those changes.

## API Contract

Use the existing endpoints:

- `GET /api/shops?search&status&page&limit`
- `POST /api/shops`
- `GET /api/shops/:shopId`
- `PATCH /api/shops/:shopId/status`

No backend endpoint is added for this workspace.

## States And Feedback

- Initial load: table skeleton.
- Empty search: explain which filters produced no results and offer Clear Filters.
- Empty authorized scope: explain that no shops are assigned; do not imply a server failure.
- List failure: persistent inline error with Retry.
- Mutation failure: product error toast with the backend message.
- Closing a changed status form: unsaved-change warning.

## Verification

- API tests cover query serialization and response mapping.
- Navigation tests cover global and scoped readers.
- Component tests cover search debounce, status filtering, create permission, row selection, status update, and error preservation.
- Verify that shop mutations invalidate only shop query keys.

## Out Of Scope

- Marketplace accounts, credentials, sync cursors, and webhooks
- Shop deletion
- Editing shop name or currency
- Shop analytics
