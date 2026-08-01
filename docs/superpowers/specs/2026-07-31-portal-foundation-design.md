# Portal Foundation Design

## Goal

Add the first internal Portal workspaces without mixing platform integration state, business shop ownership, or vendor reference data. This phase delivers navigation and shared behavior for Shops, Vendors, and External Order Imports only.

## Information Architecture

The existing desktop shell gains a permission-filtered `portal` core with two compact groups:

### Operations

- Integrations: `/portal/integrations`

### Configuration

- Shops: `/portal/shops`
- Vendors: `/portal/vendors`

Do not add a Portal overview until real cross-module read models exist. Hide empty groups and hide the Portal core when the account cannot read any Portal route.

## Module Boundaries

- Shop owns the internal business unit and stable `shopId` authorization boundary.
- Vendor owns global vendor master data, vendor products, cost centers, and provider credentials.
- Integration owns external source files, import jobs, raw records, issues, retries, and platform-specific parsing.
- Vendor Submission remains a separate fulfillment module and is excluded from this rollout.
- SQL Attendance remains an HR surface even though its adapter is implemented by Integration.

## Permission Model

Navigation and actions use backend-provided effective permissions, never role names.

| Workspace    | Read                                                                      | Write                                                                  |
| ------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Shops        | `SHOPS:READ` or an authorized readable shop scope returned by the backend | `SHOPS:WRITE` globally for create; exact shop scope for status changes |
| Vendors      | `VENDORS:READ`                                                            | `VENDORS:WRITE`                                                        |
| Integrations | `ORDERS:READ` or `ORDERS:WRITE`                                           | `ORDERS:WRITE`                                                         |

Read-only users can inspect data but cannot see mutation controls. Direct navigation to a forbidden route uses the existing permission guard.

## Shared Frontend Rules

- Route pages and heavy editors use dynamic imports; the shell and small shared primitives remain static imports.
- All API calls use the shared client and feature API modules.
- Each feature owns stable TanStack Query keys and invalidates only affected records or lists.
- Search uses the shared debounced `SearchInput` with a 200 ms delay.
- Filters, pagination, and selected entity identifiers are represented in the URL where they are safe to share.
- User-visible text is present in both Vietnamese and English resources.
- Use existing product toasts for mutation outcomes, inline error states for failed page data, field-level validation for form errors, and dirty-form warnings before destructive navigation.
- No API request may be triggered by render, uncontrolled scroll, or an unstable effect dependency.

## Shared Visual Rules

- Desktop-first operational density consistent with the existing Ant Design foundation.
- Use icon actions with accessible tooltips and labels instead of repeated text buttons in data rows.
- Use centered modals for create and edit forms.
- Keep list and management actions in the current workspace; do not introduce tab-heavy CRUD flows.
- Use semantic status colors, skeleton page/table/tree loading, action-local spinners, and explicit empty states.

## Delivery Order

1. Shops establishes Portal navigation, scoped visibility, and the simplest CRUD pattern.
2. Vendors adds the reusable lazy management tree and grouped editors.
3. Integrations adds the operational job and issue workbench after Shops can supply authorized `shopId` values.

Each module has its own spec, implementation plan, tests, and review checkpoint.

## Verification

- Unit-test Portal navigation filtering, active-route selection, and forbidden direct access.
- Component tests must import the target component, not the complete application router.
- Run focused feature tests during implementation.
- Run lint, typecheck, full tests, and production build only at module checkpoints and final handoff.

## Out of Scope

- Anonymous customer Portal
- Orders, Catalog, Mapping, Production, Shipment, Finance, or Reports UI
- Vendor Submission and vendor fulfillment queues
- SQL Attendance UI
- Mobile layouts
