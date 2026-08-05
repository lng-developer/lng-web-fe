# Finance Workspace Design

## Goal

Provide one scoped Finance workspace where administrators, managers, leaders, and sellers can inspect operational profitability. Every user may see revenue, fees, refunds, base cost, total cost, gross profit, margin, and cost lines, but only for records authorized by the backend.

Finance is an operational reconciliation workspace. Long-term trends and executive analytics remain owned by Report.

## Access model

Access is permission-and-scope based, never role-name based.

- Global `FINANCE:READ`: all snapshots.
- Department-scoped `FINANCE:READ`: snapshots whose `departmentId` is assigned.
- Team-scoped `FINANCE:READ`: snapshots whose `teamId` is assigned.
- Own-scoped `FINANCE:READ`: snapshots whose `sellerAccountId` is the authenticated account.
- Shop-scoped `FINANCE:READ`: snapshots whose `shopId` is assigned.
- Multiple assignments are combined as an allowed union; an explicit user filter must remain inside that union.
- `FINANCE:WRITE` permits recalculation inside the same scope.
- Finance imports require global `FINANCE:WRITE` because one file can affect multiple teams and sellers.

The backend is authoritative. The frontend must not fetch global data and filter locally.

## Workspace

Route: `/portal/finance`.

The page uses three internal tabs without adding sidebar entries per tab.

### Overview

- A visible scope label such as `All company`, `Sales department`, `Team Sale 1`, or `My finance`.
- Currency-separated metrics: customer paid, total cost, gross profit, gross margin, and missing-cost count.
- A compact `Needs attention` table prioritizing missing cost and stale estimates.
- Scope-aware filters: date, shop, channel, department, team, and seller. Options outside the effective scope are not returned.

### Order profitability

- Search by business Order ID or SKU.
- Columns: Order/SKU, Shop/Channel, Seller/Team, Customer paid, Fees, Refund, Base cost, Total cost, Profit, Margin, Status, Calculated at.
- Statuses use clear colors for `ESTIMATED` and `MISSING_COST`.
- Clicking a row opens a centered modal with revenue, deductions, fulfillment cost lines, profit, and all item snapshots for the order.
- ObjectIDs are never rendered.
- Scoped `FINANCE:WRITE` users see `Recalculate`; read-only users do not.

### Imports and reconciliation

- Visible only to global Finance readers; mutation actions require global `FINANCE:WRITE`.
- Import Transactions, Settlements, or Ads through a centered upload modal.
- Default `dryRun=true`; the user reviews validation totals before a real import.
- Batch history shows source, shop/channel, status, processed/valid/skipped/unlinked rows, imported by, and time.
- Failed or partial batches expose row diagnostics and a safe reprocess action.

## Backend changes

Introduce a small Finance scope resolver used by snapshot reads and recalculation. It converts effective global, department, team, own, and shop assignments into repository filters. Snapshot list and summary endpoints return a safe scope descriptor for the page header plus currency-separated totals.

Imports keep their current Shop-based storage and audit trail, but access is restricted to global Finance permission. Existing snapshot/import routes remain compatible.

## States and feedback

- Skeletons for metric and table loading.
- Inline error for page-level load failures.
- Product success/error toast for recalculation, import, and reprocess actions.
- Validation remains beside fields.
- Empty states distinguish no finance data, no scoped access, and no filter matches.

## Non-goals

- General ledger, invoices, accounts payable/receivable, tax filing, payout approval, payroll, forecasting, and executive report charts.
- Manual editing of calculated money fields.
- Hardcoded role checks.
- Rendering raw import rows, source storage paths, or MongoDB IDs in the main UI.

## Verification

- BE scope tests for global, department, team, own, shop, mixed assignments, explicit out-of-scope filters, and global-only imports.
- FE API contract and permission tests.
- FE page tests for scoped controls, read-only actions, modal detail, loading/error/empty states, and absence of ObjectIDs.
- Typecheck, lint, build, focused BE tests, and architecture contracts.
