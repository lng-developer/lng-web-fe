# HR Permission Workspaces Design

## Goal

Expose one HR entry point with three permission-driven workspaces: personal self-service, scoped team management, and organization-wide HR operations. Payroll remains a focused workspace for accounts with payroll permissions.

## Workspace rules

- `self`: visible for accounts with any self-service HR permission (`HR_ATTENDANCE:WRITE`, `HR_LEAVE:WRITE`, `HR_OVERTIME:WRITE`) and uses only `/me` data.
- `team`: visible for scoped schedule, attendance, leave, or overtime read/approve permissions. Backend scope filters remain the authority for which employees appear.
- `operations`: visible for organization HR permissions and contains people, schedule/calendar, attendance, requests, and overview sections.
- `payroll`: visible only for payroll read/write/finalize/pay permissions.

## UX

The personal workspace groups today, calendar/attendance, requests, payslips, and profile. The team workspace groups team health, schedule/attendance, approval queues, and members on one screen. The HR workspace preserves the existing operational tools under one nested section switcher. Sidebar visibility and default workspace are derived from backend permissions, never role names.

Workspace pages are dashboards, not CRUD containers. Their primary metrics and queues link to focused action routes:

- `/hr/me`: dashboard, with `/attendance`, `/schedule`, `/requests`, `/payroll`, and `/profile`.
- `/hr/team`: dashboard, with `/attendance`, `/schedule`, `/approvals`, and `/members`.
- `/hr/operations`: dashboard, with `/employees`, `/scheduling`, `/attendance`, `/requests`, and `/announcements`.
- `/hr/payroll`: payroll operations for authorized accounts.

The same page component may serve personal, scoped-team, or organization mode, but its queries and available mutations must be selected from backend permissions and scope. Dashboards expose direct action links; browser back/forward and copied URLs preserve the selected task.

## Data and safety

Self-service pages call only self endpoints. Manager lists rely on backend scope filtering and never filter a global response solely in the browser. Missing self schedule data is exposed through a small authenticated `/api/hr/schedule/me` endpoint using the existing schedule resolver. Existing toast, shared date/time/month controls, i18n, loading, and permission patterns remain mandatory.

## Verification

Pure workspace-selection tests, backend route/service tests for self schedule isolation, focused component/API tests, lint, typecheck, and production build.
