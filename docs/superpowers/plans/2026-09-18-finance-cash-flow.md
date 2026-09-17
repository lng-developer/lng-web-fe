# Finance Cash-flow Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a scoped Finance cash-flow workspace that traces imported money movements to settlement payouts and order-item P&L while surfacing reconciliation exceptions.

**Architecture:** Add a Finance-owned read endpoint which aggregates existing settlement headers, ledger lines, fee lines, and import batches into a DTO-only cash-flow response. Add a single Finance page with currency-separated summary cards, a paginated movement table, an exception filter, and deep links to the existing transaction, settlement, and P&L views.

**Tech Stack:** Node.js, Express, Mongoose aggregation, Joi, Jest, React, TypeScript, TanStack Query, Ant Design, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-18-finance-cash-flow-design.md`

## Global Constraints

- Keep Integration import-only; all new read behavior belongs to Finance.
- Use minor-unit integer amounts; never sum or convert currencies together.
- Preserve the current safe reconciliation rule: an Order-only link must never become an OrderItem allocation.
- Apply Finance global/shop scope before all aggregate and list queries.
- No new dependency, parser change, automatic relink, or Ads payout allocation.
- Return DTOs only; use `.lean()` for Mongoose read queries.
- Use server-side date filters and pagination; validate every query field with Joi.

---

### Task 1: Add the cash-flow query contract and access boundary

**Files:**
- Create: `C:/Users/stack/Task/lng-web-be/.worktrees/codex-finance-reconciliation/src/modules/finance/validators/financeCashFlow.validator.js`
- Modify: `C:/Users/stack/Task/lng-web-be/.worktrees/codex-finance-reconciliation/src/modules/finance/services/financeAccess.service.js`
- Test: `C:/Users/stack/Task/lng-web-be/.worktrees/codex-finance-reconciliation/tests/finance/validators/financeCashFlow.validator.test.js`

**Interfaces:**
- Consumes: `financeAccess.hasGlobal(auth, financePermissions.READ)` and `auth.scopes`.
- Produces: `listCashFlowQuerySchema` validating `{ shopId?, salesChannelCode?, marketplaceCode?, currency?, dateFrom?, dateTo?, status?, page?, limit? }`, and `financeAccess.accessibleShopIds(auth)` returning `null` for global read or a string array for shop-scoped read.

- [ ] **Step 1: Write failing validator and access tests**

```js
test('accepts only known cash-flow query fields', () => {
  const { value, details } = validate(listCashFlowQuerySchema, { status: 'UNLINKED', currency: 'usd', page: 2, limit: 20, unsafe: true });
  expect(details).toBeUndefined();
  expect(value).toEqual({ status: 'UNLINKED', currency: 'USD', page: 2, limit: 20 });
});

test('returns only shop scopes for a non-global Finance reader', () => {
  expect(accessibleShopIds({ scopes: [
    { scopeType: 'shop', scopeId: 'shop-1', permissions: ['FINANCE:READ'] },
    { scopeType: 'team', scopeId: 'team-1', permissions: ['FINANCE:READ'] },
  ] })).toEqual(['shop-1']);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the validator is absent**

Run: `npx jest tests/finance/validators/financeCashFlow.validator.test.js --runInBand`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Add strict Joi validation and scoped-shop extraction**

```js
const listCashFlowQuerySchema = Joi.object({
  shopId: objectId,
  salesChannelCode: Joi.string().trim().uppercase(),
  marketplaceCode: Joi.string().trim().uppercase(),
  currency: Joi.string().trim().uppercase().length(3),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')),
  status: Joi.string().valid('LINKED', 'UNLINKED', 'NEEDS_REVIEW'),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

function accessibleShopIds(auth = {}, permission = financePermissions.READ) {
  if (hasGlobal(auth, permission)) return null;
  return (auth.scopes || [])
    .filter((scope) => scope.scopeType === 'shop' && scopeHas(scope, permission) && scope.scopeId)
    .map((scope) => String(scope.scopeId));
}
```

- [ ] **Step 4: Run validator/access tests and verify whitelist behavior**

Run: `npx jest tests/finance/validators/financeCashFlow.validator.test.js --runInBand`

Expected: PASS; unknown keys are stripped, invalid status reports validation details, and only read-authorized shop scopes are returned.

- [ ] **Step 5: Commit this bounded contract change**

```bash
git add src/modules/finance/validators/financeCashFlow.validator.js src/modules/finance/services/financeAccess.service.js tests/finance/validators/financeCashFlow.validator.test.js
git commit -m "feat(finance): define cash flow query scope"
```

### Task 2: Build the Finance cash-flow repository and DTO

**Files:**
- Create: `C:/Users/stack/Task/lng-web-be/.worktrees/codex-finance-reconciliation/src/modules/finance/repositories/financeCashFlow.repository.js`
- Create: `C:/Users/stack/Task/lng-web-be/.worktrees/codex-finance-reconciliation/src/modules/finance/dtos/financeCashFlow.dto.js`
- Test: `C:/Users/stack/Task/lng-web-be/.worktrees/codex-finance-reconciliation/tests/finance/repositories/financeCashFlow.repository.test.js`

**Interfaces:**
- Consumes: a scope query from Task 1 including optional `shopIds`, `dateFrom`, `dateTo`, `currency`, `status`, `page`, and `limit`.
- Produces: `getCashFlow(query)` returning `{ summaryByCurrency, items, pagination }`; every item has the exact fields in the approved spec.

- [ ] **Step 1: Write failing repository tests for query scope and status classification**

```js
test('uses the scoped shop ids in every cash-flow aggregate', async () => {
  await repository.getCashFlow({ shopIds: ['660000000000000000140003'], status: 'UNLINKED', page: 1, limit: 20 });
  expect(MarketplaceSettlementLedgerLine.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
    expect.objectContaining({ $match: expect.objectContaining({ shopId: { $in: expect.any(Array) }, orderId: null }) }),
  ]));
});

test('does not classify an Order-only row as item-linked', () => {
  expect(repository.reconciliationStatus({ orderId: 'order-1', orderItemId: null })).toBe('NEEDS_REVIEW');
});
```

- [ ] **Step 2: Run the repository test and confirm it fails because the repository does not exist**

Run: `npx jest tests/finance/repositories/financeCashFlow.repository.test.js --runInBand`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement scoped aggregate reads without mutating source data**

Use `MarketplaceSettlementLedgerLine.aggregate` for ledger movements and `MarketplaceFeeLine.aggregate` for fee movements. Normalize each source into the same item shape, then sort/page the combined list in Mongo with `$unionWith`.

```js
function reconciliationStatus(row) {
  if (row.orderItemId) return 'LINKED';
  if (row.orderId) return 'NEEDS_REVIEW';
  return 'UNLINKED';
}

function cashScope(query = {}) {
  const filter = {};
  if (query.shopId) filter.shopId = toObjectId(query.shopId);
  if (query.shopIds) filter.shopId = { $in: query.shopIds.map(toObjectId) };
  if (query.salesChannelCode) filter.salesChannelCode = query.salesChannelCode;
  if (query.marketplaceCode) filter.marketplaceCode = query.marketplaceCode;
  if (query.currency) filter.currency = query.currency;
  return filter;
}
```

Use `totalFeeAmount: { $multiply: [-1, { $ifNull: ['$totalFeeAmount', 0] }] }` in the fee branch so the API returns signed cash movement amounts. The summary must separately aggregate `transactionNetAmount`, signed `feeAmount`, settlement payout, unlinked count, and payout variance count by currency. Return `importErrorCount` as a top-level scope-level count because import batches do not have a currency field. `$match` the `status` after adding `reconciliationStatus`.

`financeCashFlow.dto.js` maps `_id` to `id`, strips `rawReference`, and guarantees nullable links are `null`; it must not expose raw Mongoose fields.

- [ ] **Step 4: Run repository tests and verify summary/sign semantics**

Run: `npx jest tests/finance/repositories/financeCashFlow.repository.test.js --runInBand`

Expected: PASS; fees are negative movements, no currency is collapsed, scoped query is present in each branch, and Order-only links remain `NEEDS_REVIEW`.

- [ ] **Step 5: Commit the repository/DTO unit**

```bash
git add src/modules/finance/repositories/financeCashFlow.repository.js src/modules/finance/dtos/financeCashFlow.dto.js tests/finance/repositories/financeCashFlow.repository.test.js
git commit -m "feat(finance): aggregate cash flow movements"
```

### Task 3: Add the scoped cash-flow service and endpoint integration

**Files:**
- Create: `C:/Users/stack/Task/lng-web-be/.worktrees/codex-finance-reconciliation/src/modules/finance/services/financeCashFlow.service.js`
- Modify: `C:/Users/stack/Task/lng-web-be/.worktrees/codex-finance-reconciliation/src/modules/finance/controllers/financeCashFlow.controller.js`
- Modify: `C:/Users/stack/Task/lng-web-be/.worktrees/codex-finance-reconciliation/src/modules/finance/routes/index.js`
- Test: `C:/Users/stack/Task/lng-web-be/.worktrees/codex-finance-reconciliation/tests/finance/services/financeCashFlow.service.test.js`
- Test: `C:/Users/stack/Task/lng-web-be/.worktrees/codex-finance-reconciliation/tests/finance/routes/index.test.js`

**Interfaces:**
- Consumes: validated request query and `financeAccess.accessibleShopIds(auth)` from Task 1; `repository.getCashFlow(query)` from Task 2.
- Produces: `getCashFlow(query, authContext)`; it throws `403` if a non-global reader has no shop scope and sends scoped DTO data to the controller.

- [ ] **Step 1: Write failing service tests for global and shop-scoped reads**

```js
test('adds shop scope before calling the repository', async () => {
  financeAccess.accessibleShopIds.mockReturnValue(['660000000000000000140003']);
  repository.getCashFlow.mockResolvedValue({ summaryByCurrency: [], items: [], pagination: { total: 0, page: 1, limit: 20 } });
  await service.getCashFlow({ page: 1, limit: 20 }, { scopes: [{ scopeType: 'shop', scopeId: '660000000000000000140003', permissions: ['FINANCE:READ'] }] });
  expect(repository.getCashFlow).toHaveBeenCalledWith(expect.objectContaining({ shopIds: ['660000000000000000140003'] }));
});

test('rejects a reader without global or shop scope', async () => {
  await expect(service.getCashFlow({}, { permissions: [], scopes: [] })).rejects.toMatchObject({ statusCode: 403 });
});

test('GET /cash-flow requires FINANCE:READ and reaches the service with validated query', async () => {
  cashFlowService.getCashFlow.mockResolvedValue({ summaryByCurrency: [], items: [], pagination: { total: 0, page: 1, limit: 20 } });
  const response = await request(createServer(), {
    method: 'GET', path: '/cash-flow?status=UNLINKED&page=2&limit=20',
    headers: { 'X-Auth-Context': JSON.stringify({ permissions: ['FINANCE:READ'] }) },
  });
  expect(response.statusCode).toBe(200);
  expect(cashFlowService.getCashFlow).toHaveBeenCalledWith({ status: 'UNLINKED', page: 2, limit: 20 }, expect.any(Object));
});
```

- [ ] **Step 2: Run the service test and confirm it fails because the service is absent**

Run: `npx jest tests/finance/services/financeCashFlow.service.test.js --runInBand`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the service as a read-only scope gate**

```js
async function getCashFlow(query = {}, authContext = {}) {
  const shopIds = financeAccess.accessibleShopIds(authContext, financePermissions.READ);
  if (shopIds !== null && !shopIds.length) throw forbidden();
  return toCashFlowDto(await repository.getCashFlow({ ...query, ...(shopIds === null ? {} : { shopIds }) }));
}
```

The controller validates with `listCashFlowQuerySchema`, calls the service with `auditAuth(req)`, and responds `200` with `{ success: true, data }`. Mount it before `/imported-data/:sourceType`:

```js
router.get('/cash-flow', authPublic.authenticate, requireRead, asyncHandler(cashFlowController.list));
```

- [ ] **Step 4: Run focused service and route tests**

Run: `npx jest tests/finance/services/financeCashFlow.service.test.js tests/finance/routes/index.test.js --runInBand`

Expected: PASS; caller scope is applied before repository access and no raw document is returned.

- [ ] **Step 5: Commit the service integration**

```bash
git add src/modules/finance/services/financeCashFlow.service.js src/modules/finance/controllers/financeCashFlow.controller.js src/modules/finance/routes/index.js tests/finance/services/financeCashFlow.service.test.js tests/finance/routes/index.test.js
git commit -m "feat(finance): scope cash flow reconciliation data"
```

### Task 4: Add the cash-flow API client, query hook, and focused UI components

**Files:**
- Modify: `C:/Users/stack/Task/lng-web-fe/.worktrees/codex-transaction-detail-filters/src/features/portal/finance/api/financeApi.ts`
- Create: `C:/Users/stack/Task/lng-web-fe/.worktrees/codex-transaction-detail-filters/src/features/portal/finance/hooks/useCashFlow.ts`
- Create: `C:/Users/stack/Task/lng-web-fe/.worktrees/codex-transaction-detail-filters/src/features/portal/finance/components/CashFlowSummary.tsx`
- Create: `C:/Users/stack/Task/lng-web-fe/.worktrees/codex-transaction-detail-filters/src/features/portal/finance/components/CashFlowMovementTable.tsx`
- Test: `C:/Users/stack/Task/lng-web-fe/.worktrees/codex-transaction-detail-filters/src/test/portal/finance/components/CashFlowSummary.test.tsx`
- Test: `C:/Users/stack/Task/lng-web-fe/.worktrees/codex-transaction-detail-filters/src/test/portal/finance/components/CashFlowMovementTable.test.tsx`

**Interfaces:**
- Consumes: `GET /api/finance/cash-flow` contract from Task 3.
- Produces: `listCashFlow(query)`, `useCashFlow(query)`, summary cards grouped by currency, and a paginated movement table emitting existing drill-down URLs.

- [ ] **Step 1: Write failing component tests for currency grouping and deep links**

```tsx
it('renders one summary group per currency without a converted total', () => {
  render(<CashFlowSummary summaries={[usdSummary, vndSummary]} onStatusSelect={vi.fn()} />)
  expect(screen.getByText('USD')).toBeInTheDocument()
  expect(screen.getByText('VND')).toBeInTheDocument()
  expect(screen.queryByText(/grand total/i)).not.toBeInTheDocument()
})

it('links a settlement activity to its existing settlement detail', () => {
  render(<CashFlowMovementTable data={settlementMovementPage} onPageChange={vi.fn()} />)
  expect(screen.getByRole('link', { name: 'View settlement' })).toHaveAttribute('href', '/portal/finance/settlements?settlementId=settlement-1')
})
```

- [ ] **Step 2: Run the tests and confirm they fail because components are absent**

Run: `npx vitest run src/test/portal/finance/components/CashFlowSummary.test.tsx src/test/portal/finance/components/CashFlowMovementTable.test.tsx --project ui --maxWorkers=1`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the API and query hook with a stable server query key**

```ts
export type CashFlowQuery = {
  shopId?: string; salesChannelCode?: string; marketplaceCode?: string; currency?: string
  dateFrom?: string; dateTo?: string; status?: 'LINKED' | 'UNLINKED' | 'NEEDS_REVIEW'; page?: number; limit?: number
}

export const listCashFlow = (query: CashFlowQuery) =>
  unwrap<CashFlowPage>(apiClient.get('/api/finance/cash-flow', { params: params(query) }))

export const useCashFlow = (query: CashFlowQuery) => useQuery({
  queryKey: ['finance', 'cash-flow', query],
  queryFn: () => listCashFlow(query),
})
```

Render signed fees with the existing money formatter, status text alongside semantic `StatusTag`, and named `<Link>` actions. Do not generate client-side totals from paginated movement rows.

- [ ] **Step 4: Run component tests and typecheck**

Run: `npx vitest run src/test/portal/finance/components/CashFlowSummary.test.tsx src/test/portal/finance/components/CashFlowMovementTable.test.tsx --project ui --maxWorkers=1 && npm run typecheck`

Expected: PASS; separate currency groups, accessible actions, and correct destination URLs.

- [ ] **Step 5: Commit the client and reusable UI pieces**

```bash
git add src/features/portal/finance/api/financeApi.ts src/features/portal/finance/hooks/useCashFlow.ts src/features/portal/finance/components/CashFlowSummary.tsx src/features/portal/finance/components/CashFlowMovementTable.tsx src/test/portal/finance/components/CashFlowSummary.test.tsx src/test/portal/finance/components/CashFlowMovementTable.test.tsx
git commit -m "feat(finance): add cash flow workspace components"
```

### Task 5: Compose the workspace, exception queue, and navigation

**Files:**
- Create: `C:/Users/stack/Task/lng-web-fe/.worktrees/codex-transaction-detail-filters/src/features/portal/finance/pages/CashFlowWorkspacePage.tsx`
- Create: `C:/Users/stack/Task/lng-web-fe/.worktrees/codex-transaction-detail-filters/src/features/portal/finance/pages/CashFlowWorkspacePage.module.scss`
- Modify: `C:/Users/stack/Task/lng-web-fe/.worktrees/codex-transaction-detail-filters/src/app/router/router.tsx`
- Modify: `C:/Users/stack/Task/lng-web-fe/.worktrees/codex-transaction-detail-filters/src/features/portal/finance/pages/FinanceWorkspacePage.tsx`
- Test: `C:/Users/stack/Task/lng-web-fe/.worktrees/codex-transaction-detail-filters/src/test/portal/finance/pages/CashFlowWorkspacePage.test.tsx`

**Interfaces:**
- Consumes: `useCashFlow` from Task 4 and current Finance filter controls.
- Produces: `/portal/finance/cash-flow`, with one scope state shared by summary, table, and exception queue.

- [ ] **Step 1: Write the failing page test for shared scope and exception filtering**

```tsx
it('uses one scope for cards and movements, then filters exceptions server-side', async () => {
  renderPage()
  await user.selectOptions(screen.getByLabelText('Cash flow status'), 'UNLINKED')
  await waitFor(() => expect(listCashFlow).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'UNLINKED', page: 1 })))
  expect(screen.getByText('Needs review')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the page test and confirm it fails because the page and route are absent**

Run: `npx vitest run src/test/portal/finance/pages/CashFlowWorkspacePage.test.tsx --project ui --maxWorkers=1`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement one shared scope state and existing-screen drill-downs**

```tsx
const [status, setStatus] = useState<CashFlowQuery['status']>()
const query = { ...scope, status, page, limit: DEFAULT_PAGE_SIZE }
const cashFlow = useCashFlow(query)

<CashFlowSummary summaries={cashFlow.data?.summaryByCurrency ?? []} onStatusSelect={(next) => { setStatus(next); setPage(1) }} />
<CashFlowMovementTable data={cashFlow.data} onPageChange={setPage} />
```

Add a Finance dashboard link labelled `Cash flow` and lazy-load the new route behind the existing `FINANCE:READ` / `FINANCE:WRITE` boundary. The exception queue is a `status=UNLINKED|NEEDS_REVIEW` table state; it has no write button.

- [ ] **Step 4: Run page and related Finance tests**

Run: `npx vitest run src/test/portal/finance/pages/CashFlowWorkspacePage.test.tsx src/test/portal/finance/pages/FinanceWorkspacePage.test.tsx --project ui --maxWorkers=1 && npx eslint src/features/portal/finance/pages/CashFlowWorkspacePage.tsx src/features/portal/finance/components/CashFlowSummary.tsx src/features/portal/finance/components/CashFlowMovementTable.tsx && npm run typecheck`

Expected: PASS; a status selection resets pagination, destination links preserve identity, and the page never offers an unsafe relink action.

- [ ] **Step 5: Commit the completed user-facing workspace**

```bash
git add src/features/portal/finance/pages/CashFlowWorkspacePage.tsx src/features/portal/finance/pages/CashFlowWorkspacePage.module.scss src/app/router/router.tsx src/features/portal/finance/pages/FinanceWorkspacePage.tsx src/test/portal/finance/pages/CashFlowWorkspacePage.test.tsx
git commit -m "feat(finance): add cash flow reconciliation workspace"
```

### Task 6: Run cross-repository verification and review the final diff

**Files:**
- Verify only; do not add production behavior in this task.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: evidence that Finance contract, scope, DTOs, UI behavior, and architecture boundaries remain valid.

- [ ] **Step 1: Run backend focused suites**

Run: `npx jest tests/finance/repositories/financeCashFlow.repository.test.js tests/finance/services/financeCashFlow.service.test.js tests/finance/routes/index.test.js --runInBand && npm run test:architecture -- --runInBand`

Expected: PASS; Finance cash-flow tests and architecture tests pass.

- [ ] **Step 2: Run frontend focused suites and static checks**

Run: `npx vitest run src/test/portal/finance/components/CashFlowSummary.test.tsx src/test/portal/finance/components/CashFlowMovementTable.test.tsx src/test/portal/finance/pages/CashFlowWorkspacePage.test.tsx --project ui --maxWorkers=1 && npm run typecheck`

Expected: PASS; cash-flow UI tests and TypeScript pass.

- [ ] **Step 3: Inspect only task-related diffs**

Run: `git diff --check && git diff -- src/modules/finance src/app/router/router.tsx src/features/portal/finance src/test/portal/finance tests/finance`

Expected: no whitespace errors; no Integration operational screen, no Ads payout allocation, and no unrelated file edits.

- [ ] **Step 4: Record verification in the implementation handoff**

Report focused test counts and commands separately from any pre-existing full-suite failure. Do not claim deployment, live data correctness, or cross-currency reconciliation without direct evidence.
