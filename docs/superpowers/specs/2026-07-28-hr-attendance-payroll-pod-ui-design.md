# HR Attendance and Payroll POD UI Design

## Goal

Rebuild the Attendance and Payroll experience around the familiar workflows in
`lng-hr-fe`, while keeping the POD frontend's shell, MUI operations components,
`/api/hr/` contracts, and capability-based RBAC.

## Scope

### Attendance

- **Attendance Desk (admin):** period navigation, searchable/filterable staff
  overview, status/error summaries, monthly per-day matrix, and a detail drawer.
  Matrix cells remain the source for daily review; a compact overview makes
  payroll-impacting exceptions easier to find.
- **My Time (employee):** a monthly calendar with a visible legend and a day
  detail surface for attendance, leave, overtime, holiday, and late/early data.
- Existing edit and approval actions remain visible only when server-provided
  capabilities permit them.

### Payroll

- **Payroll Runs (admin):** period/status filters, summary cards, operational
  run table, review drawer, and explicit confirm dialogs for run, finalize, and
  email actions.
- **My Payslips (employee):** period list, payment status, readable breakdown,
  and print/download only when the current backend contract supports it.

## UI Crosswalk

| Old HR UI reference                                             | POD implementation                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Attendance header with month navigation and operational actions | `OperationsHeader` + `OperationsToolbar`, compact period control, capability-gated actions |
| Attendance overview table and error emphasis                    | summary cards plus a compact exception-oriented staff view beside the monthly matrix       |
| Timesheet calendar, legend, and day detail                      | `MyTimePage` calendar, status legend, and drawer/panel backed by HR read models            |
| Payroll overview filters, summary cards, and table              | `PayrollRunsPage` summary cards, URL filters, `OperationsTable`, and review drawer         |
| Payroll detail/action modals                                    | POD drawers and confirm dialogs; backend capabilities determine available actions          |

## Architecture and Data Flow

- Reuse the existing HR feature folders and operations primitives; do not copy
  old components, axios clients, routing, or auth checks.
- Keep URL filters as the page state and use the existing React Query hooks.
- Use backend DTO fields as displayed; missing data renders an explicit empty
  state rather than fabricated values.
- Use `row.capabilities` and current-user permissions only where the existing
  API contract requires global access; no role-name branching.

## Error and Loading States

- Keep page-level query errors in the operations shell.
- Keep action errors inside the relevant dialog or drawer.
- Preserve loading and empty states for every table/calendar surface.
- Actions that mutate attendance or payroll require a confirm dialog where the
  current workflow already does so.

## Verification

- Extend focused HR Time and Payroll tests for URL filters, capability gates,
  status mapping, and empty/error handling.
- Run the focused HR feature suite, lint changed files, and production build.
- Browser-check an authenticated admin view and an employee self-service view
  against live `/api/hr/` responses.

## Exclusions

- No legacy API routes, old authentication state, Socket.IO listener, SQL sync
  UI, or duplicated component library.
- No fake data or client-side permission inference.
