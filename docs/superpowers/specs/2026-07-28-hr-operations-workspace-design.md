# HR Operations Workspace Design

## Goal

Replace the HR manager's inline operational pages with dense, scannable workspaces. Preserve the existing HR permission model and lifecycle rules; this is not a new payroll or attendance engine.

## Audience and information architecture

Primary audience: HR manager managing the company or an authorized team scope.

1. **Attendance** becomes the daily operations workbench.
2. **Schedule** has two intentional views: a staff-facing monthly calendar and an HR-facing monthly staff-by-day matrix.
3. **Payroll** becomes a company payroll register with export and a non-navigating detail drawer.

Staff-facing My Time and My Payslips remain personal views. HR manager pages do not expose data outside the backend-authorized scope.

## Attendance workbench

Page header: `Attendance` plus the selected month and a short scope description.

Top summary cards show only actionable counts: Missing check-in/out, attendance errors, approved leave, approved OT, and manually adjusted records. Selecting a card applies the corresponding server-side filter.

The main area is a month matrix:

- Rows: employee identity, department/team, assigned shift, month total, and exceptions total.
- Columns: days 1–31, grouped by week; weekend/holiday columns are visually quiet but distinct.
- Cell: one primary attendance state (`Present`, `Leave`, `OT`, `Missing`, `Error`, `Rest`) plus compact check-in/out or OT duration when available.
- Click: open the existing attendance-adjustment flow with the complete day context. No inline mutation from the matrix.

Toolbar: month navigator, department/team, shift, employee search, exception-only, and a server-side status filter. The matrix must not load an unbounded company dataset: paging or authorized-team selection remains explicit.

## Schedule

### Staff calendar

The personal page uses a true monthly calendar. A day cell displays leave, approved OT, check-in/out and its final attendance state. Clicking a day opens its read-only detail; staff use the existing request actions rather than editing schedule data.

### HR matrix

The manager page uses the same date/scope toolbar and row model as Attendance, but cells prioritize planned shift, calendar override, leave and approved OT. Actual check-in/out is shown as a secondary indicator, so HR can compare planned versus actual without switching pages.

Legend and status tokens are shared across both views. Calendar policy, shift assignment and rotation configuration stay in the existing controlled dialogs/tabs and retain their current permissions.

## Payroll register

The manager Payroll Runs page becomes a register for every payroll result in a selected period, not just an inline run list.

- Summary cards: draft/review, finalized, paid, and payroll totals.
- Toolbar: payroll month/year, status, employee/team search, and `Export CSV`.
- Table: employee, team, base salary, allowances, OT, deductions, gross, net, payment status, and actions.
- Export contains the current authorized and filtered result set only. It uses a client CSV export initially; a server export endpoint is only added if pagination/volume makes client export incomplete.
- Row detail opens a `PayrollReviewDrawer` showing salary components, approved attendance/leave/OT inputs, adjustments, calculation notes, and audit/lifecycle status.
- Adjustment is available only in an editable payroll state and only to `HR_PAYROLL:WRITE`. Finalize uses `HR_PAYROLL:FINALIZE`; mark paid uses `HR_PAYROLL:PAY`. Finalized/paid records are view-only unless the backend explicitly permits a reversal.

## Contracts and permissions

Existing contracts cover attendance, leave, overtime, calendar policies, payroll lists, payroll detail, finalization and payment. FE sends filters to these APIs and uses returned capabilities/permissions; it never infers access from role names.

The matrix requires a bounded monthly summary query. During implementation, inspect whether `GET /api/hr/attendance` already returns the required month/date range and employee/day data. If it does not, add one HR-owned read endpoint returning only authorized profiles and daily summaries; do not fan out per employee from the FE.

Similarly, inspect the payroll list payload. If it represents payroll runs rather than employee results, add a paginated HR-owned payroll-result register/export contract rather than reconstructing compensation in the browser.

## Visual system

Operational, not decorative: neutral page canvas, white work surfaces, restrained borders, 14px table metadata, 16px row labels, and status color only when action is required. The signature element is the date-cell language: one readable primary code and one secondary signal, consistent in calendar and matrix.

Accessibility: tooltips/aria labels for codes, keyboard-openable cells/drawers, text labels in addition to color, responsive fallback from matrix to per-day staff cards on narrow screens.

## Acceptance criteria

1. HR can scan a selected month by employee and identify exceptions without opening every row.
2. Staff can see Leave/OT/check-in/out on a monthly calendar without manager-only data.
3. HR can filter, inspect and export authorized payroll results; lifecycle actions remain permission and state controlled.
4. No page performs client-side cross-scope aggregation or bypasses current backend permissions.
5. Existing adjustment, leave, OT, finalize and mark-paid behaviors remain intact.
