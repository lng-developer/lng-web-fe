# Dual-core Sidebar Design

## Goal

Create one desktop navigation shell for the internal POD Portal and HR cores without mixing their page trees. Keep personal work immediately available while exposing management surfaces only through backend permissions and scopes.

## Navigation Model

The shell uses two persistent navigation levels:

1. A 68px icon rail for `Home`, `Portal`, `HR`, and `System`.
2. A 220px contextual sidebar whose contents belong only to the selected core.

The rail stays visible while navigating. The contextual sidebar may collapse independently. Switching core restores the last valid route visited in that core. If the remembered route is no longer permitted, navigation falls back to that core's first permitted route.

## Permission Rules

- Navigation visibility uses backend-provided permissions and scoped permissions, never role names.
- Staff see personal work and assigned operational work only.
- Managers retain personal pages and receive scoped team-management sections beneath them.
- HR operators receive company HR sections according to their permissions.
- Payroll and system administration remain independently permission-gated.
- Empty groups are omitted.

## Portal Information Architecture

### Personal

- Overview
- Assigned orders
- Assigned design work
- Assigned production work
- Items requiring action

### Operations

- Orders
- Design workbench
- Production
- Shipments
- Exception center

### Products and content

- Shops
- Catalog
- Customization
- Mapping
- Media

### Partners

- Vendors
- Vendor submissions
- Integrations

### Finance and insights

- Finance
- Reports

## HR Information Architecture

### Personal

- Overview
- Schedule
- Attendance
- Requests
- Payslips
- Profile

### Team management

- Team overview
- Team schedule
- Attendance
- Approvals
- Members

### HR operations

- Employees
- Organization
- Company schedule
- Attendance
- Leave and overtime
- Announcements

### Payroll operations

- Payroll periods
- Adjustments
- Results
- Payslip delivery and export

## System Core

`System` is visible only when at least one permitted system page exists:

- Accounts
- Access control
- Audit activity

`Foundation` is excluded from production navigation and remains available only for development and design review.

## Home

Home is a cross-core personal dashboard, not another module tree. It prioritizes:

- Work requiring the current user's action
- Today's HR state
- Portal exceptions relevant to the user
- Announcements and notifications

## Interaction Details

- Selected rail item uses the existing coral-red brand accent.
- Contextual groups are expanded by default when they contain the active route.
- Active route is derived from pathname, including nested routes.
- Rail and sidebar transitions use short CSS motion and respect reduced-motion preferences.
- Desktop is the only target for this phase.
- The shell keeps one global header; feature pages must not add another app-level header.

## Route Memory

Store the last visited pathname for `portal`, `hr`, and `system` in local storage. Update it only after a permitted route renders. Do not store query strings containing filters or identifiers. Restore the pathname on rail selection and validate it against the current permission-filtered navigation tree.

## Error and Empty Behavior

- No permitted routes in a core: hide that rail destination.
- Remembered route no longer permitted: navigate to the first permitted route.
- Unknown nested route: use the existing not-found/error behavior.
- Loading account permissions: keep the shell stable and show the existing content loading state.

## Verification

- Unit-test permission filtering for staff, scoped manager, HR operator, payroll operator, and system administrator.
- Unit-test route memory, permission revocation fallback, and nested-route active state.
- Component-test rail switching and conditional contextual groups without importing all business pages.
- Run lint, typecheck, and production build at the final checkpoint.

## Out of Scope

- Anonymous customer navigation
- Mobile navigation
- Rebuilding Portal feature pages
- Changing backend permission semantics
