# Company Department Workspaces Design

## Goal

Organize the internal company system around real department work instead of exposing every backend module or creating a separate frontend for every role title.

## Navigation Hierarchy

```text
Application core
  -> Department or domain workspace
    -> Access scope
      -> Operational page or queue
```

The persistent rail owns the application cores: Portal, HR, and System. The contextual sidebar shows only workspaces available to the authenticated employee.

## Workspace Principle

A department owns its business workflow and therefore has its own workspace. Position does not create a new workspace. Manager, leader, and staff use the same department workspace with different scope and capabilities.

Examples:

- Sales owns order intake, assignment, customer coordination, and sales exceptions.
- Design owns design queues, assets, reviews, and revisions.
- Production owns production queues, capacity, quality state, and production exceptions.
- Fulfillment owns shipment readiness, carrier handoff, tracking, and delivery exceptions.
- Vendor operations owns vendors, submissions, and vendor exceptions.
- Finance owns reconciliation, financial review, and reporting.
- HR owns employee records and company people operations.

## Access Modes

### Own

The employee sees only work explicitly assigned to their employee identity.

### Team

A team leader sees work owned by teams in their scoped access assignments. The leader may assign or transfer work only when the backend returns the corresponding capability.

### Department

A department manager sees all teams belonging to the assigned department and may manage department workload according to backend capabilities.

### Global

Reserved for company-wide functions such as HR operations, payroll operations, system administration, or explicitly granted cross-company oversight.

## Sales Example

### Seller

- Default page: My Sales Queue.
- Sees only orders whose current `assignedSellerId` resolves to the authenticated employee.
- Cannot request another seller's data by changing query parameters.
- Unassigned orders are invisible.
- When an order is reassigned, the previous seller loses access immediately; the audit trail remains available to authorized managers.

### Sales Team Leader

- Default page: Team Sales Board.
- Sees orders owned by assigned teams.
- May assign, transfer, prioritize, and resolve team exceptions when capabilities allow.
- Does not receive department-wide data unless separately assigned.

### Sales Manager

- Default page: Sales Operations.
- Sees all teams in the assigned department.
- Manages team capacity, unassigned orders, cross-team allocation, SLA risk, and department exceptions.

## HR Separation

HR is not a Sales-style workspace. It has four distinct contexts.

### My HR

Available to every employee:

- Personal overview
- Schedule
- Attendance
- Leave and overtime requests
- Payslips
- Personal profile

### Team People Management

Available to line managers and leaders for their assigned teams:

- Team members
- Team schedule
- Attendance exceptions
- Leave and overtime approvals
- Team people status

This context does not grant access to company-wide HR operations.

### HR Operations

Available only to HR staff with global HR permissions. HR staff manage employees across the entire company:

- Employee records
- Onboarding and offboarding
- Contracts and legal documents
- Company schedules and attendance operations
- Leave and overtime operations
- Organization structure
- HR announcements and workforce reporting

### Payroll Operations

Payroll remains an independently permissioned sensitive area:

- Payroll periods
- Adjustments
- Results
- Finalization and payment
- Payslip export and delivery

HR membership alone does not grant salary, bank-account, payroll-adjustment, finalize, or payment access.

## HR Sidebar Behavior

Use a single-open accordion inside the HR contextual sidebar:

```text
HR

▼ Team management
   Team overview
   Team schedule
   Attendance
   Approvals
   Members

▶ My HR
▶ HR operations
▶ Payroll
```

- Only one workspace group is expanded at a time.
- The active route's group is always expanded.
- The last valid group and route are remembered.
- Closed groups do not mount heavy content or start data queries.
- Labels are specific: `My day`, `Team overview`, and `HR operations`, never three identical `Overview` labels.
- Badges are limited to actionable counts such as pending approvals and attendance exceptions.

On the first HR visit without saved state, the default is selected by available capability: HR Operations for HR staff, Payroll for payroll-only operators, Team People Management for line managers, then My HR for ordinary employees. Saved valid state takes precedence afterward.

## Authorization Source

- Department and team membership come from Organization.
- Employee identity and job information come from HR.
- Roles, effective permissions, and scoped assignments come from Auth.
- Each business module enforces resource access using those resolved scopes.
- Frontend navigation consumes backend permissions and scopes; it never checks names such as `MANAGER_SELLER` or `HR_STAFF`.
- UI capabilities control visible actions, but backend services remain the security boundary.

## Backend Enforcement

List endpoints resolve scope from the authenticated account and do not trust client-provided employee, team, or department identifiers beyond the granted scope.

- Own mode forces the authenticated employee ID.
- Team mode intersects requested filters with assigned team IDs.
- Department mode intersects requested filters with teams belonging to assigned department IDs.
- Global mode requires an explicit global permission.
- Record mutations repeat the resource-level authorization check.

## Workspace Resolution

The frontend composes navigation from the current account's global permissions, scoped permissions, and organization context. If names or primary membership are missing from the current session contract, add one bounded `GET /api/workspace/me` aggregate returning workspace keys, scope references, display names, and capabilities. The backend response must not contain frontend paths; the frontend maps stable workspace keys to routes.

## Verification

- Seller cannot list or open another seller's assigned order.
- Reassignment removes old seller access immediately.
- Leader cannot escape assigned team scope.
- Manager cannot escape assigned department scope.
- Non-HR manager receives Team People Management but not HR Operations.
- HR staff receives company-wide non-payroll employee operations.
- Payroll data remains hidden without explicit payroll permissions.
- Sidebar renders only permitted accordion groups and restores only still-valid routes.

## Out of Scope

- Anonymous customer navigation
- Mobile navigation
- Creating Portal pages before their module implementation begins
- Hardcoded navigation based on role names
