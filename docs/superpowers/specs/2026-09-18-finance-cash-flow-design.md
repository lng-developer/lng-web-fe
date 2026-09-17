# Finance cash-flow workspace design

## Goal

Give Finance a traceable answer to three questions for a selected shop, marketplace, currency, and date range:

1. What cash movements were imported?
2. Which movements make up a settlement payout and an order-item P&L?
3. Which movements cannot yet be reconciled, and why?

The workspace is a reconciliation view. It does not replace P&L, Settlement detail, Transaction import detail, or Ads reports.

## Scope and boundaries

The new route is `/portal/finance/cash-flow` and is guarded by `FINANCE:READ` or `FINANCE:WRITE`.

`Integration` remains import-only. It owns file/batch status and links into Finance. It does not become a ledger or reconciliation console.

Existing views remain their specialized drill-down destinations:

- Transaction ledger: raw normalized transaction and associated fee rows.
- Settlement workspace: settlement header, payout, and settlement activity.
- Finance workspace: order-item P&L and its source evidence.
- Reports Ads: aggregate advertising reporting; it is not marketplace payout reconciliation.

## Data relationship model

```text
Transaction import ──> Marketplace settlement ledger line ─┐
Fee lines ─────────────────────────────────────────────────┤
Settlement import ──> Marketplace settlement header ───────┼─> Cash-flow read model
                                                            │        │
Order / Order item <── safe reconciliation link ────────────┘        ├─> settlement payout drill-down
                                                                     ├─> transaction / fee drill-down
                                                                     └─> order-item P&L drill-down
Ads import ──> Ads reports (parallel spend context only)
```

An identity link is valid only when the existing reconciliation rule can prove it from order/item/SKU identity. A row with only an unsafe or missing identity remains unlinked; the UI must never allocate it to an order item merely to make totals look complete.

## User experience

### Scope bar

The page starts with date range, shop, sales channel, marketplace, and currency. All cards and the movement list use exactly the same server-side scope.

### Cash-flow summary

Four cards use amounts in a single selected currency and link to their corresponding filtered list:

- Transaction net: imported transaction movement total and linked/unlinked count.
- Fees: fee movement total, separate from transaction net so values are never deducted twice in the display.
- Settlement payout: sum of settlement payout values and cash variance count.
- Needs review: unlinked ledger lines, imports with errors, and non-zero payout variances.

Cards show no cross-currency total. When more than one currency is selected, the workspace groups the cards by currency.

### Movement timeline

The primary table is chronological and paginated server-side. Each row represents a money movement and has:

- occurred/posted date;
- source kind (`TRANSACTION`, `FEE`, `SETTLEMENT_ACTIVITY`, `PAYOUT_VARIANCE`);
- amount and currency;
- reconciliation status (`Linked`, `Unlinked`, `Needs review`);
- order, order item, and settlement identity when present;
- a direct drill-down action.

Selecting a row opens a compact relationship panel rather than copying data into a new detail model. A linked Order Payment shows its fee lines, settlement, and order-item P&L links. A settlement activity shows the settlement payout and associated linked order/item. An unlinked row shows the missing identity and links to the existing reconciliation workflow.

### Exception queue

The queue is a saved filter over the same read model, not a second source of truth. It has these initial categories:

- `UNLINKED_LEDGER_LINE`;
- `UNSAFE_ORDER_ONLY_LINK` (linked at Order level only, never allocated to item);
- `PAYOUT_VARIANCE`;
- `IMPORT_ERROR`.

Each queue item exposes the import batch/source reference, reason, affected amount, and its safe next action. No automatic reassignment is offered from this screen.

## Backend read contract

Add a Finance-owned, scoped endpoint:

`GET /api/finance/cash-flow?dateFrom&dateTo&shopId&salesChannelCode&marketplaceCode&currency&page&limit&status`

It returns minor-unit integer amounts only:

```ts
{
  summaryByCurrency: [{
    currency: 'USD',
    transactionNetAmount: number,
    feeAmount: number,
    settlementPayoutAmount: number,
    unlinkedCount: number,
    payoutVarianceCount: number,
    importErrorCount: number,
  }],
  items: [{
    id: string,
    occurredAt: string | null,
    sourceKind: 'TRANSACTION' | 'FEE' | 'SETTLEMENT_ACTIVITY' | 'PAYOUT_VARIANCE',
    amount: number,
    currency: string,
    reconciliationStatus: 'LINKED' | 'UNLINKED' | 'NEEDS_REVIEW',
    orderId: string | null,
    orderItemId: string | null,
    externalOrderId: string | null,
    settlementId: string | null,
    sourceRef: string | null,
    importBatchId: string | null,
    reason: string | null,
  }],
  pagination: { page: number, limit: number, total: number }
}
```

The Finance service composes its own repositories and Order public-port data only when needed for a display identity. It applies the caller's existing Finance/shop scope before any aggregate or list query. Controllers validate the whitelist query parameters and return DTOs; raw Mongo documents are not exposed.

## Error and empty states

- No data: explain that the selected scope has no completed imports and link to Integration imports.
- Partial import: show the completed rows normally and surface the error count in Needs review.
- Multiple currencies: separate summary groups and do not create a converted grand total.
- Missing fee or settlement relationship: render `Not linked`, not zero and not an inferred relationship.

## Visual and interaction rules

Use the existing dense, light operational-table language. Summary status uses both text and color; color never carries the only meaning. Drill-down actions are named links, keyboard reachable, and preserve current scope in the destination URL. No chart is required for the first release: the relationship timeline and exception queue explain reconciliation more precisely than a decorative graph.

The UI design-search helper could not run on this host because no Python runtime is installed, so these rules use the existing portal's operational-table patterns and the standard accessibility defaults.

## Verification

- Unit tests for summary arithmetic, currency grouping, status classification, and no item allocation from Order-only links.
- Repository/service tests proving Finance/shop scope applies to summary and list queries.
- API tests for query validation, pagination, DTO shape, and empty/partial-import cases.
- Frontend tests for scope propagation, drill-down URL construction, exception filters, and multi-currency rendering.
- Focused architecture test plus typecheck/lint for changed modules.

## Non-goals

- No change to import parsing or automatic reconciliation rules.
- No change to Ads reporting or allocation of ad spend into marketplace payout.
- No cross-currency conversion.
- No manual write/relink workflow in the initial cash-flow workspace.
