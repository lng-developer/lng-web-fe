# Mapping Multi-Page Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Mapping into one operational Workbench and five focused rule-management pages while preserving item context, preview/conflict safety, and item-only recheck.

**Architecture:** Reuse the existing Mapping API, query keys, trace, queue, inventory, editor, impact, and history components. Replace `MappingWorkspacePage` with a Workbench page that never loads rule inventories plus one configurable rule-page shell used by five lazy routes. Extend the backend unmatched contract only where exact server-side queue filtering and readable blocker data are missing.

**Tech Stack:** React 19, TypeScript, Ant Design 6, TanStack Query 5, React Router 7, react-i18next, Node.js, Express, MongoDB/Mongoose, Joi, Vitest, Testing Library, Jest.

## Global Constraints

- Use backend permissions `MAPPING:READ` and `MAPPING:WRITE`; never hardcode roles.
- `/portal/mapping` redirects to `/portal/mapping/workbench`.
- Workbench shows every unmatched item and never imports or requests a rule inventory.
- Rule pages load only their own rule type.
- URL context contains identifiers and search hints only; canonical data is fetched from the backend.
- Accept `returnTo` only when it starts with `/portal/mapping/`; otherwise return to Workbench.
- Saving a rule rechecks only the originating item. Never silently recheck the full backlog.
- Vendor candidate selection stays in Workbench.
- Use readable labels for Shop, vendor, product group, and template; raw IDs are secondary metadata only.
- Reuse shared search, loading, feedback toast, dirty-state, permission, and i18n foundations.
- Add no dependencies.
- Preserve the user's clean-history preference: create one implementation commit for this plan after the final gate.

---

## File Map

**Backend worktree:** `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor`

- Modify `src/modules/mapping/validators/fulfillmentPlan.validator.js`: accept bounded Workbench query fields.
- Modify `src/modules/mapping/services/fulfillmentPlan.service.js`: return exact filtered unmatched results and readable stage/blocker data.
- Test `src/test/mapping/services/fulfillmentPlan.service.test.js`: contract and pagination coverage.

**Frontend worktree:** `C:/lng_system/lng-web/lng-web-fe/.worktrees/mapping-pipeline-workspace`

- Rename `pages/MappingWorkspacePage.tsx` to `pages/MappingWorkbenchPage.tsx` and remove all rule-editor orchestration.
- Rename the matching module stylesheet to `pages/MappingWorkbenchPage.module.scss`.
- Create `pages/MappingRulePage.tsx`: shared shell for one rule type.
- Create `model/mappingPageConfig.ts`: route/rule metadata and safe context helpers.
- Modify `components/ResolveQueuePanel.tsx`: queue metadata and route action integration.
- Reuse `LiveTracePanel`, `RuleInventoryPanel`, `RuleEditorPanel`, `RuleImpactSamples`, and `RuleHistoryModal`.
- Modify `api/mappingApi.ts` and `api/mappingKeys.ts`: exact queue params and route-specific keys.
- Modify `src/app/router/router.tsx` and `src/app/layout/appNavigation.ts`: redirect, six lazy routes, and Mapping navigation group.
- Modify EN/VI locale files.
- Replace `MappingWorkspacePage.test.tsx` with `MappingWorkbenchPage.test.tsx`.
- Create `pages/MappingRulePage.test.tsx` and update route/navigation/API/model tests.

---

### Task 1: Exact unmatched Workbench contract

**Files:**

- Modify: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/modules/mapping/validators/fulfillmentPlan.validator.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/modules/mapping/services/fulfillmentPlan.service.js`
- Test: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/test/mapping/services/fulfillmentPlan.service.test.js`
- Modify: `src/features/portal/mapping/api/mappingApi.ts`
- Test: `src/test/portal/mapping/api/mappingApi.test.ts`

**Interfaces:**

- Consumes existing `listUnmatchedOrderItems(query, authContext)` and stored `FulfillmentPlan.blockingReasons`.
- Produces `UnmatchedParams` with `q`, `blocker`, `stage`, `age`, existing Shop/marketplace/date filters, and pagination.
- Produces unmatched rows with `blockingReasons`, `recommendedFixTypes`, and `blockedStage` even when the client does not request a full preview.

- [ ] **Step 1: Add failing backend tests for blocker metadata and filtering**

Add cases that create an unmatched item with persisted `blockingReasons: ['LISTING_NOT_FOUND']`, then assert:

```js
const result = await service.listUnmatchedOrderItems(
  { blocker: 'LISTING_NOT_FOUND', stage: 'PRODUCT_MAPPING', page: 1, limit: 20 },
  auth,
)

expect(result.items).toEqual([
  expect.objectContaining({
    orderItemId: String(orderItem._id),
    blockingReasons: ['LISTING_NOT_FOUND'],
    blockedStage: 'PRODUCT_MAPPING',
  }),
])
expect(result.pagination.total).toBe(1)
```

Add a second item with a different blocker and prove it is excluded before pagination totals are calculated. Add `q` coverage for SKU and external order ID.

- [ ] **Step 2: Run the backend focused test and verify failure**

Run:

```powershell
npm test -- --runInBand src/test/mapping/services/fulfillmentPlan.service.test.js
```

Expected: FAIL because the validator/service do not support these filters or metadata.

- [ ] **Step 3: Implement the bounded backend query contract**

Add Joi fields:

```js
q: Joi.string().trim().max(120),
blocker: Joi.string().trim().max(80),
stage: Joi.string().valid(
  'SKU_CLEANUP',
  'PRODUCT_MAPPING',
  'INPUT_SEMANTICS',
  'VALUE_ALIASES',
  'VENDOR_ROUTING',
),
age: Joi.string().valid('TODAY', 'OVER_24_HOURS', 'OVER_3_DAYS'),
```

Filter before slicing the requested page. Reuse persisted plan blockers; build a preview only when an unmatched item has no usable blocker snapshot. Derive `blockedStage` from the same blocker-to-fix mapping already used by `recommendedFixTypes()`. Do not duplicate mapping resolution rules in the controller.

- [ ] **Step 4: Add frontend serialization coverage and update types**

Assert:

```ts
await listUnmatchedItems({
  q: 'J2501',
  blocker: 'LISTING_NOT_FOUND',
  stage: 'PRODUCT_MAPPING',
  age: 'OVER_24_HOURS',
  page: 1,
  limit: 20,
})
```

serializes all non-empty fields and omits empty values. Add `blockedStage?: MappingPipelineStage` to `UnmatchedMappingItem`.

- [ ] **Step 5: Run focused backend and frontend tests**

Run the backend command from Step 2 and:

```powershell
npx vitest run --project unit src/test/portal/mapping/api/mappingApi.test.ts src/test/portal/mapping/model/mappingModel.test.ts
```

Expected: PASS.

---

### Task 2: Multi-page route and navigation contract

**Files:**

- Create: `src/features/portal/mapping/model/mappingPageConfig.ts`
- Modify: `src/app/router/router.tsx`
- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/test/app/router/PortalMappingRoute.test.tsx`
- Modify: `src/test/app/layout/appNavigation.test.ts`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Produces `MAPPING_RULE_PAGES`, `MappingRulePageKey`, `getMappingRulePage()`, `getRulePageForFixType()`, and `safeMappingReturnTo()`.
- Produces six permission-gated lazy routes plus the legacy redirect.

- [ ] **Step 1: Add failing pure-model tests**

Assert all route mappings and return-path safety:

```ts
expect(getRulePageForFixType('CREATE_SKU_CONFIG_RULE')?.path).toBe('product-mapping')
expect(safeMappingReturnTo('/portal/mapping/workbench')).toBe('/portal/mapping/workbench')
expect(safeMappingReturnTo('https://evil.example')).toBe('/portal/mapping/workbench')
```

- [ ] **Step 2: Add failing route and navigation tests**

Verify `/portal/mapping` redirects to `/portal/mapping/workbench`; each child route is lazy and wrapped by `PortalPageBoundary`; sidebar exposes a Mapping group with Workbench and five rule pages only to effective Mapping readers/writers.

- [ ] **Step 3: Run tests and verify failure**

```powershell
npx vitest run --project unit src/test/app/layout/appNavigation.test.ts src/test/portal/mapping/model/mappingModel.test.ts
npx vitest run --project ui src/test/app/router/PortalMappingRoute.test.tsx
```

- [ ] **Step 4: Implement config, routes, navigation, and EN/VI copy**

Define one static config entry per rule page:

```ts
type MappingRulePageConfig = {
  key: MappingRulePageKey
  path: string
  ruleType: MappingRuleType
  titleKey: string
  descriptionKey: string
}
```

Generate neither routes nor JSX through a runtime factory; five explicit lazy routes remain easier to inspect and type-check.

- [ ] **Step 5: Run route, navigation, model, and locale parity tests**

Expected: PASS.

---

### Task 3: Workbench-only operational page

**Files:**

- Rename: `src/features/portal/mapping/pages/MappingWorkspacePage.tsx` → `MappingWorkbenchPage.tsx`
- Rename: `src/features/portal/mapping/pages/MappingWorkspacePage.module.scss` → `MappingWorkbenchPage.module.scss`
- Modify: `src/features/portal/mapping/components/ResolveQueuePanel.tsx`
- Modify: `src/features/portal/mapping/components/LiveTracePanel.tsx`
- Replace test: `src/test/portal/mapping/pages/MappingWorkspacePage.test.tsx` → `MappingWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes unmatched list, summary, item preview/recheck/resolve, candidate selection, and `getRulePageForFixType()`.
- Produces links shaped as `{ pathname, search }` with `orderItemId`, relevant hint, and validated `returnTo`.
- Must not import `listMappingRules`, `RuleInventoryPanel`, or `RuleEditorPanel`.

- [ ] **Step 1: Write failing Workbench tests**

Cover:

```tsx
expect(listMappingRules).not.toHaveBeenCalled()
await user.click(screen.getByRole('button', { name: /J2501-TS1S-01/i }))
expect(screen.getByRole('link', { name: 'Open Product Mapping' })).toHaveAttribute(
  'href',
  expect.stringContaining('/portal/mapping/product-mapping?orderItemId=item-1'),
)
```

Add one item for each blocker stage, vendor candidate selection, reader/write visibility, filter serialization, and scroll-without-refetch.

- [ ] **Step 2: Run Workbench tests and verify failure**

```powershell
npx vitest run --project ui src/test/portal/mapping/pages/MappingWorkbenchPage.test.tsx
```

- [ ] **Step 3: Remove rule management from Workbench**

Delete rule queries, editor/history/draft state, pipeline-stage editing, and rule mutation orchestration from the page. Keep queue, selected preview, item-level mutations, explicit batch confirmation, and product feedback.

- [ ] **Step 4: Implement queue metadata and context action**

Use backend `blockedStage` as the primary stage label and the first recommended fix to select the destination page. If no page applies, show recheck/resolve or candidate-selection actions without inventing a route.

- [ ] **Step 5: Run Workbench and queue tests**

Expected: PASS, including zero rule-list calls.

---

### Task 4: Shared focused rule-page shell

**Files:**

- Create: `src/features/portal/mapping/pages/MappingRulePage.tsx`
- Create: `src/features/portal/mapping/pages/MappingRulePage.module.scss`
- Modify: `src/features/portal/mapping/components/RuleInventoryPanel.tsx`
- Modify: `src/features/portal/mapping/components/RuleEditorPanel.tsx`
- Modify: `src/features/portal/mapping/components/RuleImpactSamples.tsx`
- Modify: `src/features/portal/mapping/components/RuleHistoryModal.tsx`
- Create: `src/test/portal/mapping/pages/MappingRulePage.test.tsx`

**Interfaces:**

- `MappingRulePage({ pageKey }: { pageKey: MappingRulePageKey })` consumes one config entry.
- Reads `orderItemId`, page-specific hint, and safe `returnTo` from search params.
- Reuses existing rule CRUD, preview, conflict, history, and authorable-Shop API functions.

- [ ] **Step 1: Write failing page-shell tests**

For Product Mapping deep link, assert the page requests only `skuConfig`, previews `orderItemId`, pre-fills `configCode`, and shows readable originating-order context. Assert direct navigation without `orderItemId` remains a normal rule-management page.

- [ ] **Step 2: Add save-flow safety tests**

Prove exact conflict blocks save, overlap requires acknowledgement, mutation error keeps form values, success rechecks only the originating item, and no `recheckUnmatched()` call occurs.

- [ ] **Step 3: Run tests and verify failure**

```powershell
npx vitest run --project ui src/test/portal/mapping/pages/MappingRulePage.test.tsx src/test/portal/mapping/components/RuleEditorPanel.test.tsx
```

- [ ] **Step 4: Implement the shared shell**

Compose inventory, editor, and preview/conflict regions. Use config to choose rule type and visible fields, but keep one mutation lifecycle. Context prefill sets only fields supported by the destination page.

- [ ] **Step 5: Implement successful return behavior**

After save and item recheck:

- resolved item: navigate to validated `returnTo` with `resolvedItemId`;
- remaining actionable blocker: show “Continue to <page>” and preserve the same `orderItemId`;
- missing item: keep the saved rule result and offer Workbench return.

- [ ] **Step 6: Run rule-page and component tests**

Expected: PASS.

---

### Task 5: Cache scope, route chunks, and integration regression

**Files:**

- Modify: `src/features/portal/mapping/api/mappingKeys.ts`
- Modify: `src/features/portal/mapping/pages/MappingWorkbenchPage.tsx`
- Modify: `src/features/portal/mapping/pages/MappingRulePage.tsx`
- Modify: Mapping route/page tests.

**Interfaces:**

- Workbench queries use `mappingKeys.unmatched()` and `mappingKeys.preview()` only.
- Rule pages use `mappingKeys.rulesRoot(ruleType)` and `mappingKeys.history()` only.
- Successful save invalidates the current rule type, selected preview, summary, and unmatched root without clearing unrelated app cache.

- [ ] **Step 1: Add failing invalidation tests**

Spy on `queryClient.invalidateQueries` and assert exact Mapping roots after rule save and candidate selection. Assert no `queryClient.clear()` and no non-Mapping key invalidation.

- [ ] **Step 2: Add route chunk regression test**

Verify Workbench and rule page remain lazy and the app router does not statically import either page.

- [ ] **Step 3: Implement minimal query-key changes**

Add only missing root helpers; do not build a second query abstraction.

- [ ] **Step 4: Run all Mapping-focused tests**

```powershell
npx vitest run --project unit src/test/portal/mapping src/test/app/layout/appNavigation.test.ts
npx vitest run --project ui src/test/portal/mapping src/test/app/router/PortalMappingRoute.test.tsx --maxWorkers=4
```

Expected: PASS.

---

### Task 6: Final verification and one implementation commit

**Files:** All backend and frontend files modified by Tasks 1–5.

- [ ] **Step 1: Run backend focused gate**

```powershell
npm test -- --runInBand src/test/mapping/services/fulfillmentPlan.service.test.js
npm run lint
```

- [ ] **Step 2: Run frontend focused and static gates**

```powershell
npm run lint
npm run typecheck
npm run build
npx vitest run --project unit src/test/portal/mapping src/test/app/layout/appNavigation.test.ts
npx vitest run --project ui src/test/portal/mapping src/test/app/router/PortalMappingRoute.test.tsx --maxWorkers=4
```

- [ ] **Step 3: Runtime verification**

Run FE and BE locally. Verify Workbench queue filtering, five blocker destinations, direct rule-page navigation, deep-link prefill, conflict gate, save/recheck/return, vendor selection, reader/write permissions, Vietnamese/English, and light/dark themes.

- [ ] **Step 4: Review scope**

Run `git diff --check` in both repos. Confirm no Catalog, Design, HR, Orders, or unrelated generated files are staged.

- [ ] **Step 5: Create one implementation commit per repository only when needed**

Frontend:

```powershell
git commit -m "refactor(mapping): split workbench and rule pages"
```

Backend only if Task 1 changed its contract:

```powershell
git commit -m "feat(mapping): add unmatched workbench filters"
```

Do not create intermediate task commits.
