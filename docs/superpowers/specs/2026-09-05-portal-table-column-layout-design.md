# Portal Table Column Layout Design

## Goal

Make dense operational tables reserve compact space for short, predictable data so a meaningful text column receives the remaining width.

## Scope

Apply the rule to the 15 table instances identified during the portal audit:

- `ReportWorkspacePage` (4 tables)
- `CustomerWorkspacePage`
- `FinanceWorkspacePage` (2 tables)
- `ImportJobPanel` (2 tables)
- `IntegrationImportsWorkbench`
- `CustomizationReviewPage`
- `PsdFileWorkspacePage`
- `VendorSubmissionWorkbenchPage`
- `ShipmentWorkbenchPage`

## Design

`CoreDataTable` will expose Ant Design's native `tableLayout` prop without adding a new layout abstraction. Each audited caller opts in to `tableLayout="fixed"` and declares widths only for predictable columns.

- Status, quantity and compact actions: 88-120px.
- Date, code and short identifiers: 140-180px.
- A descriptive name, message, file or product column remains unbounded to absorb spare space.
- Tables whose declared widths exceed their container receive a numeric horizontal `scroll.x` value; tables that fit do not receive forced horizontal scrolling.

## Constraints

- No new dependencies or global `table-layout: fixed` rule.
- Preserve all current data, sorting, pagination, selection, rendering and responsive behavior.
- Do not change tables with existing dedicated layout rules unless they are in scope above.
- Keep the current Ant Design visual system and horizontal-scroll accessibility behavior.

## Verification

- Add a shared-component regression test proving `CoreDataTable` forwards `tableLayout="fixed"`.
- Run the shared UI test, then the targeted portal UI suites for touched pages and the production build.
