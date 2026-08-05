# Customization Review Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a scoped Portal exception queue that lets operators find, inspect, retry, and review buyer customizations blocking fulfillment.

**Architecture:** Extend the existing Customization module with safe operational read models, summary aggregation, and one retry orchestration command that reuses existing public services. Add a lazy React workspace that reuses the current Ant Design foundation, TanStack Query, Media previews, permissions, and i18n without duplicating Order management.

**Tech Stack:** Node.js, Express, Joi, Mongoose, Jest, React, TypeScript, Ant Design, TanStack Query, React Router, Vitest, React Testing Library.

## Global Constraints

- Execute in paired FE and BE worktrees on branch `EC/customization-review-workspace`, based on the latest `refactor/fe-foundation` in each repository.
- `ORDERS:READ` controls readable Shop data; `ORDERS:WRITE` controls processing actions.
- Backend Shop scope is authoritative.
- Never render raw customization, hashes, signed source URLs, local paths, provider storage identifiers, or MongoDB ObjectIDs.
- Do not add create, delete, raw JSON editing, bulk actions, a workflow engine, or a duplicate exception collection.
- Reuse existing shared UI and installed dependencies.
- Keep tests under `src/test`.
- Do not create intermediate commits. At completion, produce exactly one `feat(customization): add review workspace` commit in each repository that changed, including spec, plan, implementation, and tests.

---

### Task 1: Backend operational queue and summary

**Files:**

- Modify: `src/modules/customization/validators/customizationPayload.validator.js`
- Modify: `src/modules/customization/repositories/customizationPayload.repository.js`
- Modify: `src/modules/customization/services/customizationPayload.service.js`
- Modify: `src/modules/customization/controllers/customizationPayload.controller.js`
- Modify: `src/modules/customization/dtos/customizationPayload.dto.js`
- Modify: `src/modules/customization/routes/index.js`
- Modify: `src/modules/order/repositories/order.repository.js`
- Modify: `src/modules/order/public.js`
- Modify: `src/test/customization/repositories/customizationPayload.repository.test.js`
- Modify: `src/test/customization/services/customizationPayload.service.test.js`
- Modify: `src/test/customization/controllers/customizationPayload.controller.test.js`
- Modify: `src/test/customization/dtos/customizationPayload.dto.test.js`

**Interfaces:**

- Extends `GET /api/customizations` with `q`, `shopId`, `status`, `source`, `errorCode`, `blockedOnly`, `dateFrom`, `dateTo`, `page`, and `limit`.
- Produces `GET /api/customizations/summary` with the same Shop/date scope.
- Produces `repository.listOperational(query)` and `repository.summarizeOperational(query)`.
- Produces `orderPublic.findOrdersByIds(orderIds)` for bounded cross-module enrichment.
- Produces safe list rows containing business context, compact inputs, asset counts, issue fields, and timestamps.

- [ ] **Step 1: Write failing validator and repository tests**

Cover trimmed empty search, actionable default statuses, explicit completed history, source/error/date filters, latest payload per OrderItem, pagination, and summary counts.

```js
await repository.listOperational({
  shopIds: ['660000000000000000000101'],
  statuses: ['PENDING', 'NEEDS_REVIEW', 'FAILED'],
  q: 'ORDER-1001',
  page: 1,
  limit: 20,
})

expect(CustomizationPayload.aggregate).toHaveBeenCalledWith(
  expect.arrayContaining([
    expect.objectContaining({ $sort: { orderItemId: 1, createdAt: -1, _id: -1 } }),
    expect.objectContaining({ $group: expect.any(Object) }),
  ]),
)
```

- [ ] **Step 2: Run the focused tests and confirm RED**

```powershell
npx jest src/test/customization/repositories/customizationPayload.repository.test.js src/test/customization/controllers/customizationPayload.controller.test.js --runInBand
```

Expected failure: operational repository functions and summary route do not exist.

- [ ] **Step 3: Implement validated query normalization**

Add explicit Joi enums and defaults:

```js
blockedOnly: Joi.boolean().truthy('true').falsy('false').default(true),
status: Joi.alternatives().try(
  Joi.string().valid(...Object.values(customizationStatuses)),
  Joi.array().items(Joi.string().valid(...Object.values(customizationStatuses))).single(),
),
q: Joi.string().trim().empty('').max(180),
```

Validate ISO dates, page `>= 1`, and limit `1..100`. Reject `dateTo < dateFrom`.

- [ ] **Step 4: Implement latest-payload queue and scoped summary**

Use one aggregation per result type. Select the newest payload per OrderItem before applying queue pagination. Enrich only the current page through `orderPublic.findItemsByIds()`, the new `orderPublic.findOrdersByIds()`, and `shopPublic.findByIds()`. Add the minimal bulk order repository/public-port function; do not import another module's model directly.

Return:

```js
{
  items: operationalRows,
  pagination: { total, page, limit },
}
```

Summary shape:

```js
{
  pending: 0,
  needsReview: 0,
  failed: 0,
  oldestBlockedAt: null,
}
```

- [ ] **Step 5: Add safe DTO tests**

Assert business identifiers are present and serialized output excludes:

```text
rawCustomization, rawCustomizationHash, sourceUrl, localPath,
sha256, providerAssetId, shopId, orderId, orderItemId
```

Opaque `id` may remain in API data for actions but must not be exposed as visible UI copy.

- [ ] **Step 6: Run Task 1 tests**

```powershell
npx jest src/test/customization/repositories/customizationPayload.repository.test.js src/test/customization/services/customizationPayload.service.test.js src/test/customization/controllers/customizationPayload.controller.test.js src/test/customization/dtos/customizationPayload.dto.test.js --runInBand
```

Expected: PASS.

---

### Task 2: Backend retry orchestration and reviewer audit

**Files:**

- Create: `src/modules/customization/services/customizationRetry.service.js`
- Modify: `src/modules/customization/services/customizationPayload.service.js`
- Modify: `src/modules/customization/controllers/customizationPayload.controller.js`
- Modify: `src/modules/customization/routes/index.js`
- Modify: `src/modules/customization/models/customizationPayload.model.js`
- Modify: `src/modules/customization/repositories/customizationPayload.repository.js`
- Create: `src/test/customization/services/customizationRetry.service.test.js`
- Modify: `src/test/customization/services/customizationPayload.service.test.js`
- Modify: `src/test/customization/controllers/customizationPayload.controller.test.js`

**Interfaces:**

- Produces `POST /api/customizations/:payloadId/retry`.
- Produces `retryCustomization(payloadId, authContext)`.
- Reuses parse, asset-download, ZIP-inspection, and image-extraction services.
- Manual parsed/failed outcomes persist `reviewedBy` and `reviewedAt`.

- [ ] **Step 1: Write failing retry decision tests**

Cover:

- `PENDING` with unparsed payload calls parse.
- Parsed payload with pending customized URL calls download.
- Downloaded ZIP without inspection calls inspect.
- Inspected ZIP with unextracted images calls extract.
- `FAILED` retries only the failed safe step.
- `PARSED` with no remaining work returns unchanged without duplicate Media writes.

```js
await retryService.retryCustomization('payload-id', authContext)
expect(parseService.parseForOrderItem).toHaveBeenCalledWith('order-item-id', authContext)
```

- [ ] **Step 2: Run retry tests and confirm RED**

```powershell
npx jest src/test/customization/services/customizationRetry.service.test.js --runInBand
```

Expected failure: retry service does not exist.

- [ ] **Step 3: Implement the minimum orchestration decision table**

Load the payload once, enforce exact Shop write access through the existing service boundary, increment `retryCount` and `lastTriedAt`, then call exactly one next safe operation. Do not introduce a generic workflow abstraction.

- [ ] **Step 4: Persist reviewer identity for manual outcomes**

Pass the authenticated account through existing parsed/failed commands:

```js
{
  reviewedBy: authContext.accountId,
  reviewedAt: new Date(),
}
```

Do not require a rejection reason when an operator confirms existing normalized data as parsed. Continue requiring a reason/error code for manual failure.

- [ ] **Step 5: Add route authorization and duplicate-action tests**

Verify 401 unauthenticated, 403 without exact Shop `ORDERS:WRITE`, controlled 404, one operation per request, and stable state when two retries encounter already-completed work.

- [ ] **Step 6: Run all customization tests and architecture contracts**

```powershell
npx jest src/test/customization --runInBand
npm run test:architecture -- --runInBand
```

Expected: PASS.

---

### Task 3: Frontend API, query keys, and presentation model

**Files:**

- Create: `src/features/portal/customization/api/customizationApi.ts`
- Create: `src/features/portal/customization/api/customizationKeys.ts`
- Create: `src/features/portal/customization/model/customizationPresentation.ts`
- Create: `src/test/portal/customization/api/customizationApi.test.ts`
- Create: `src/test/portal/customization/model/customizationPresentation.test.ts`

**Interfaces:**

- Produces `listCustomizationQueue(params)`.
- Produces `getCustomizationSummary(params)` and `getCustomizationPayload(id)`.
- Produces `retryCustomization(id)`, `confirmCustomization(id, parsedData)`, and `failCustomization(id, reason)`.
- Produces status tones, translated error keys, compact input summaries, asset counts, and waiting-time helpers.

- [ ] **Step 1: Write failing API contract tests**

```ts
await listCustomizationQueue({ q: ' ORDER-1001 ', blockedOnly: true, page: 1, limit: 20 })

expect(apiClient.get).toHaveBeenCalledWith('/api/customizations', {
  params: { q: 'ORDER-1001', blockedOnly: true, page: 1, limit: 20 },
})
```

Verify empty values are omitted and each mutation uses the exact endpoint and body.

- [ ] **Step 2: Run API/model tests and confirm RED**

```powershell
npx vitest run --project unit src/test/portal/customization
```

Expected failure: feature API and presentation model do not exist.

- [ ] **Step 3: Implement minimal types and API functions**

Define queue row, summary, detail, input, asset, inspection, status, and query parameter types from the safe BE DTO. Do not expose raw payload or ObjectID fields through presentation props.

- [ ] **Step 4: Implement pure presentation helpers**

Map known error codes to keys generated as `customization.errors.${errorCode}` and return `customization.errors.unknown` otherwise. Format relative age without adding a date dependency; use the existing date library or `Intl.RelativeTimeFormat`.

- [ ] **Step 5: Run Task 3 tests**

```powershell
npx vitest run --project unit src/test/portal/customization
```

Expected: PASS.

---

### Task 4: Queue page and review modal

**Files:**

- Create: `src/features/portal/customization/pages/CustomizationReviewPage.tsx`
- Create: `src/features/portal/customization/components/CustomizationReviewModal.tsx`
- Create: `src/features/portal/customization/components/CustomizationSummary.tsx`
- Create: `src/test/portal/customization/pages/CustomizationReviewPage.test.tsx`
- Create: `src/test/portal/customization/components/CustomizationReviewModal.test.tsx`

**Interfaces:**

- Consumes Task 3 API, keys, and presentation helpers.
- Reuses `PageHeader`, `MetricCard`, `DataTable`, `FilterBar`, `SearchInput`, `DateRangePicker`, `StatusTag`, `AuthenticatedMediaImage`, and product toast.
- Produces lazy route component `CustomizationReviewPage`.

- [ ] **Step 1: Write failing queue UI tests**

Assert:

- actionable states load by default;
- filters reset page and debounce search;
- business identifiers render;
- ObjectIDs and sensitive fields do not render;
- row click opens the modal;
- write actions are absent without effective `ORDERS:WRITE`;
- positive-empty, filtered-empty, loading, and error states differ.

- [ ] **Step 2: Run page tests and confirm RED**

```powershell
npx vitest run --project ui src/test/portal/customization/pages/CustomizationReviewPage.test.tsx
```

Expected failure: page does not exist.

- [ ] **Step 3: Implement summary, filters, and queue table**

Keep one query for current filters/page and one summary query. Use previous data during filter transitions. Render a single contextual primary action per row plus `Open order`.

- [ ] **Step 4: Write failing modal tests**

Cover customer text/options/images, asset state, ZIP warnings/errors, diagnostics, retry, confirm, fail reason validation, authenticated previews, and retained state after mutation failure.

- [ ] **Step 5: Implement the centered review modal**

Use a wide desktop modal with Customer Inputs, Assets, and Diagnostics sections. Keep the modal open on errors. Invalidate queue, summary, and detail keys after success. Navigate to `/portal/orders` with an order-item query parameter through React Router.

- [ ] **Step 6: Run Task 4 tests**

```powershell
npx vitest run --project ui src/test/portal/customization
```

Expected: PASS.

---

### Task 5: Route, navigation, and EN/VI copy

**Files:**

- Modify: `src/app/router/router.tsx`
- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Modify: `src/test/app/layout/appNavigation.test.ts`
- Create: `src/test/app/router/PortalCustomizationRoute.test.tsx`

**Interfaces:**

- Produces `/portal/customizations` lazy route.
- Produces Portal Operations navigation item.
- Uses `PortalPageBoundary anyOf={['ORDERS:READ']}` and backend Shop scoping.

- [ ] **Step 1: Write failing navigation and route tests**

Verify readable users see the item, users without `ORDERS:READ` do not, route loads lazily, and the boundary does not grant write actions.

- [ ] **Step 2: Run tests and confirm RED**

```powershell
npx vitest run --project unit src/test/app/layout/appNavigation.test.ts
npx vitest run --project ui src/test/app/router/PortalCustomizationRoute.test.tsx
```

- [ ] **Step 3: Add route, navigation, and complete locale keys**

Add page, summary, filter, column, state, action, modal, feedback, and known error-code labels in both languages. Place Customization review near Orders and Mapping in Portal Operations.

- [ ] **Step 4: Run route and feature tests**

```powershell
npx vitest run --project unit src/test/app/layout/appNavigation.test.ts src/test/portal/customization
npx vitest run --project ui src/test/app/router/PortalCustomizationRoute.test.tsx src/test/portal/customization
```

Expected: PASS.

---

### Task 6: Integrated verification, single commit, merge, and cleanup

**Files:** No new production files.

- [ ] **Step 1: Run final BE gates**

```powershell
npx jest src/test/customization --runInBand
npm run test:architecture -- --runInBand
git diff --check
```

- [ ] **Step 2: Run final FE gates**

```powershell
npx vitest run --project unit src/test/portal/customization src/test/app/layout/appNavigation.test.ts
npx vitest run --project ui src/test/portal/customization src/test/app/router/PortalCustomizationRoute.test.tsx
npm run typecheck
npm run lint
npm run build
git diff --check
```

- [ ] **Step 3: Create the only module commit in each changed repository**

Stage only Customization spec, plan, implementation, route/navigation/i18n hunks, and tests. Preserve unrelated files.

```powershell
git commit -m "feat(customization): add review workspace"
```

Before the FE commit, squash the temporary spec commit into the module working set so the final branch history contains one Customization commit, not separate spec and plan commits.

- [ ] **Step 4: Merge BE then FE into `refactor/fe-foundation`**

Require clean target worktrees. Merge without deleting source worktrees, then rerun the focused BE/FE gates on the merged targets.

- [ ] **Step 5: Remove completed worktrees and branches**

Only after both merged targets pass:

```powershell
git -C C:\lng_system\lng-web\lng-web-fe worktree remove C:\lng_system\lng-web\lng-web-fe\.worktrees\customization-review
git -C C:\lng_system\lng-web\lng-web-fe worktree prune
git -C C:\lng_system\lng-web\lng-web-fe branch -d EC/customization-review-workspace

git -C C:\lng_system\lng-web\lng-web-be worktree remove C:\lng_system\lng-web\lng-web-be\.worktrees\customization-review
git -C C:\lng_system\lng-web\lng-web-be worktree prune
git -C C:\lng_system\lng-web\lng-web-be branch -d EC/customization-review-workspace
```

Report local merge status and whether any remote push occurred. Do not push unless explicitly requested.
