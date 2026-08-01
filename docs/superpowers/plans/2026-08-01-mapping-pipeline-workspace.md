# Mapping Pipeline Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved operator-facing Mapping Pipeline Workspace at `/portal/mapping` using the existing backend contract.

**Architecture:** Keep all mapping server state inside feature-owned TanStack Query hooks and normalize API responses before rendering. The page composes a stable context bar, pipeline navigation, rule inventory/editor, live trace, impact samples, and resolve queue so editing one region does not rerender the entire workspace.

**Tech Stack:** React 19, TypeScript, Ant Design 6, TanStack Query 5, react-i18next, Zod, Vitest, Testing Library.

## Global Constraints

- Execute in a dedicated Mapping worktree created from `refactor/fe-foundation`; do not edit the dirty Catalog/Design working tree.
- Use the existing shared API client, UI foundations, feedback toast, permission boundary, and debounced search.
- Do not add dependencies or duplicate backend mapping logic in the browser.
- Use backend permissions `MAPPING:READ` and `MAPPING:WRITE`; never hardcode roles.
- Route pages remain lazy; heavy history/editor content mounts only when opened.
- Every user-facing string must exist in both Vietnamese and English locale files.
- Do not expose a distinct Confirm Mapping action because `/confirm` is not a real status transition.
- Label impact records as samples; do not present an exact affected-item total.
- Run focused tests after each task and the full quality gate only at the final checkpoint.
- Preserve the user's one-clean-commit preference: keep task changes uncommitted, then create one final Mapping implementation commit after the final gate.

---

## File Map

**Create under `src/features/portal/mapping/`:**

- `api/mappingApi.ts`: request/response types and API functions only.
- `api/mappingKeys.ts`: stable query-key factory.
- `model/mappingModel.ts`: pipeline-stage metadata and pure response-to-view-model functions.
- `pages/MappingWorkspacePage.tsx`: route-level composition and selected context.
- `pages/MappingWorkspacePage.module.scss`: dense desktop workspace grid and panel overflow rules.
- `components/MappingContextBar.tsx`: Shop/marketplace/item context and preview trigger.
- `components/MappingPipelineNav.tsx`: ordered five-stage navigation.
- `components/RuleInventoryPanel.tsx`: filters and rule selection.
- `components/RuleEditorPanel.tsx`: inline create/update/status flow.
- `components/LiveTracePanel.tsx`: preview evidence, blockers, and candidates.
- `components/RuleImpactSamples.tsx`: preview/conflict/sample evidence.
- `components/ResolveQueuePanel.tsx`: unmatched items and context handoff.
- `components/RuleHistoryModal.tsx`: lazy rule audit history.

**Create tests under `src/test/portal/mapping/`:**

- `api/mappingApi.test.ts`
- `model/mappingModel.test.ts`
- `pages/MappingWorkspacePage.test.tsx`
- `components/RuleEditorPanel.test.tsx`
- `components/ResolveQueuePanel.test.tsx`

**Create route test:**

- `src/test/app/router/PortalMappingRoute.test.tsx`

**Modify:**

- `src/app/router/router.tsx`
- `src/app/layout/appNavigation.ts`
- `src/test/app/layout/appNavigation.test.ts`
- `src/shared/i18n/locales/en/common.json`
- `src/shared/i18n/locales/vi/common.json`

---

### Task 1: Mapping API contract and normalized model

**Files:**

- Create: `src/features/portal/mapping/api/mappingApi.ts`
- Create: `src/features/portal/mapping/api/mappingKeys.ts`
- Create: `src/features/portal/mapping/model/mappingModel.ts`
- Test: `src/test/portal/mapping/api/mappingApi.test.ts`
- Test: `src/test/portal/mapping/model/mappingModel.test.ts`

**Interfaces:**

- Produces `MappingContext`, `MappingPreview`, `MappingRuleType`, `MappingRule`, `UnmatchedMappingItem`, `RuleConflictResult`, and `VendorCandidate`.
- Produces `mappingKeys`, `PIPELINE_STAGES`, `getRuleTypeForStage()`, `getStageForFixType()`, and `toMappingTraceView()`.
- All later tasks consume these exports and must not parse raw API envelopes.

- [ ] **Step 1: Write API serialization tests**

```ts
it('omits blank optional query values from unmatched requests', async () => {
  await listUnmatchedItems({ shopId: 'shop-1', configCode: '', limit: 25 })
  expect(mockGet).toHaveBeenCalledWith('/api/mapping/order-items/unmatched', {
    params: { shopId: 'shop-1', limit: 25 },
  })
})

it('posts candidate selection to the canonical select endpoint', async () => {
  await selectFulfillmentCandidate('item-1', {
    vendorProductId: 'product-1',
    vendorCostCenterId: 'cost-1',
  })
  expect(mockPost).toHaveBeenCalledWith('/api/mapping/order-items/item-1/select', {
    vendorProductId: 'product-1',
    vendorCostCenterId: 'cost-1',
  })
})
```

- [ ] **Step 2: Run API tests and verify failure**

Run: `npx vitest run src/test/portal/mapping/api/mappingApi.test.ts --project unit`

Expected: FAIL because the mapping API module does not exist.

- [ ] **Step 3: Implement the typed API surface**

Expose these functions through `mappingApi.ts`:

```ts
export function getMappingWorkbench(params: MappingContextParams): Promise<MappingWorkbench>
export function getMappingSummary(params: MappingContextParams): Promise<MappingSummary>
export function listAuthorableShops(): Promise<AuthorableShopResult>
export function listUnmatchedItems(
  params: UnmatchedParams,
): Promise<Paginated<UnmatchedMappingItem>>
export function previewOrderItem(orderItemId: string): Promise<MappingPreview>
export function resolveOrderItem(orderItemId: string): Promise<MappingPreviewOrPlan>
export function recheckOrderItem(orderItemId: string): Promise<MappingPreviewOrPlan>
export function recheckUnmatched(input: RecheckBatchInput): Promise<RecheckBatchResult>
export function searchVendorCandidates(
  orderItemId: string,
  input: CandidateSearchInput,
): Promise<CandidateResult>
export function selectFulfillmentCandidate(
  orderItemId: string,
  input: CandidateSelection,
): Promise<FulfillmentPlan>
export function listMappingRules(
  type: MappingRuleType,
  params: RuleListParams,
): Promise<Paginated<MappingRule>>
export function createMappingRule(
  type: MappingRuleType,
  input: MappingRuleInput,
): Promise<MappingRule>
export function updateMappingRule(
  type: MappingRuleType,
  id: string,
  input: Partial<MappingRuleInput>,
): Promise<MappingRule>
export function previewMappingRule(input: RulePreviewInput): Promise<RulePreviewResult>
export function findMappingRuleConflicts(input: RuleConflictInput): Promise<RuleConflictResult>
export function listMappingRuleHistory(
  type: MappingRuleType,
  id: string,
): Promise<RuleHistoryEvent[]>
```

Use one `unwrap<T>()` helper and remove empty string query values before requests.

- [ ] **Step 4: Write and implement pipeline-model tests**

```ts
expect(getRuleTypeForStage('SKU_CLEANUP')).toBe('skuNormalize')
expect(getRuleTypeForStage('PRODUCT_MAPPING')).toBe('skuConfig')
expect(getRuleTypeForStage('INPUT_SEMANTICS')).toBe('semanticRules')
expect(getRuleTypeForStage('VALUE_ALIASES')).toBe('valueAliases')
expect(getRuleTypeForStage('VENDOR_ROUTING')).toBe('vendorRouting')
expect(getStageForFixType('CREATE_SKU_CONFIG_RULE')).toBe('PRODUCT_MAPPING')
expect(toMappingTraceView(preview).impactLabel).toBe('SAMPLED')
```

Keep the mappings exhaustive using `Record<MappingPipelineStage, MappingRuleType>` and return `undefined` for unknown backend recommendation values.

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run src/test/portal/mapping/api/mappingApi.test.ts src/test/portal/mapping/model/mappingModel.test.ts --project unit`

Expected: PASS.

---

### Task 2: Permission-gated route, navigation, and translations

**Files:**

- Modify: `src/app/router/router.tsx`
- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/test/app/layout/appNavigation.test.ts`
- Create: `src/test/app/router/PortalMappingRoute.test.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes `MappingWorkspacePage` by lazy import.
- Produces the `/portal/mapping` route and `mapping` navigation item.

- [ ] **Step 1: Add failing navigation tests**

```ts
it('shows Mapping for a scoped read permission', () => {
  const scopedReader = account([], ['MAPPING:READ'])
  expect(getContextNavigation('portal', scopedReader)[0]?.items).toContainEqual(
    expect.objectContaining({ key: 'mapping', path: '/portal/mapping' }),
  )
})

it('hides Mapping without mapping permissions', () => {
  expect(getContextNavigation('portal', account([]))).toEqual([])
  expect(getContextNavigation('portal', account(['ORDERS:READ']))[0]?.items).not.toContainEqual(
    expect.objectContaining({ key: 'mapping' }),
  )
})
```

- [ ] **Step 2: Add the lazy-route contract test**

Assert that `/portal/mapping` loads `MappingWorkspacePage` inside `PortalPageBoundary` with `anyOf={['MAPPING:READ', 'MAPPING:WRITE']}` and does not statically import the page.

- [ ] **Step 3: Run the two tests and verify failure**

Run: `npx vitest run src/test/app/layout/appNavigation.test.ts --project unit`

Run: `npx vitest run src/test/app/router/PortalMappingRoute.test.tsx --project ui`

Expected: FAIL because no route/navigation item exists.

- [ ] **Step 4: Add route, navigation, and locale keys**

Add Mapping under Portal operations after Orders. Add matching keys under `shell.navigation.mapping` and a `mapping` locale namespace covering stage names, actions, filters, blockers, validation, feedback, empty states, and accessibility labels in both locale files.

- [ ] **Step 5: Run focused tests and locale parity test**

Run: `npx vitest run src/test/app/layout/appNavigation.test.ts src/test/shared/i18n/locales.test.ts --project unit`

Run: `npx vitest run src/test/app/router/PortalMappingRoute.test.tsx --project ui`

Expected: PASS.

---

### Task 3: Stable workspace shell and pipeline navigation

**Files:**

- Create: `src/features/portal/mapping/pages/MappingWorkspacePage.tsx`
- Create: `src/features/portal/mapping/pages/MappingWorkspacePage.module.scss`
- Create: `src/features/portal/mapping/components/MappingContextBar.tsx`
- Create: `src/features/portal/mapping/components/MappingPipelineNav.tsx`
- Test: `src/test/portal/mapping/pages/MappingWorkspacePage.test.tsx`

**Interfaces:**

- Consumes `PIPELINE_STAGES`, `MappingContext`, and mapping summary/workbench queries.
- Produces callbacks `onContextChange(context)`, `onPreview(orderItemId)`, and `onStageChange(stage)` for child panels.

- [ ] **Step 1: Write the failing workspace behavior test**

```tsx
render(<MappingWorkspacePage />)
await user.selectOptions(screen.getByLabelText('Shop'), 'shop-1')
await user.click(screen.getByRole('button', { name: 'Product mapping' }))
expect(screen.getByLabelText('Shop')).toHaveValue('shop-1')
expect(screen.getByRole('button', { name: 'Product mapping' })).toHaveAttribute(
  'aria-current',
  'step',
)
```

Also assert that `MAPPING:READ` does not render write actions and `MAPPING:WRITE` does.

- [ ] **Step 2: Run the test and verify failure**

Run: `npx vitest run src/test/portal/mapping/pages/MappingWorkspacePage.test.tsx --project ui`

Expected: FAIL because the workspace components do not exist.

- [ ] **Step 3: Implement the stable shell**

Keep only these state values at page level:

```ts
type WorkspaceState = {
  context: MappingContext
  activeStage: MappingPipelineStage
  selectedRuleId?: string
  selectedOrderItemId?: string
}
```

Use CSS grid for desktop regions. Each panel owns its transient search/form state so typing does not rerender the queue.

- [ ] **Step 4: Implement context and pipeline components**

Use shared `SearchInput`, Ant Design `Select`, and `PermissionGate`. Context changes update query keys; preview only runs after an explicit preview action or queue selection.

- [ ] **Step 5: Run the workspace test**

Run: `npx vitest run src/test/portal/mapping/pages/MappingWorkspacePage.test.tsx --project ui`

Expected: PASS.

---

### Task 4: Live Trace and unmatched resolve queue

**Files:**

- Create: `src/features/portal/mapping/components/LiveTracePanel.tsx`
- Create: `src/features/portal/mapping/components/ResolveQueuePanel.tsx`
- Test: `src/test/portal/mapping/components/ResolveQueuePanel.test.tsx`
- Modify: `src/features/portal/mapping/pages/MappingWorkspacePage.tsx`

**Interfaces:**

- `ResolveQueuePanel` produces `onSelect(item: UnmatchedMappingItem)` and `onRecommendedStage(stage)` events.
- `LiveTracePanel` consumes `MappingTraceView`, `canWrite`, candidate selection, resolve, and recheck callbacks.

- [ ] **Step 1: Write queue-to-stage and no-request-loop tests**

```tsx
await user.click(screen.getByText('J2501-TS2S-2394'))
expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-1' }))
expect(onRecommendedStage).toHaveBeenCalledWith('VENDOR_ROUTING')
expect(listUnmatchedItems).toHaveBeenCalledTimes(1)
```

Rerender and simulate panel scrolling; the API call count must remain one.

- [ ] **Step 2: Run the test and verify failure**

Run: `npx vitest run src/test/portal/mapping/components/ResolveQueuePanel.test.tsx --project ui`

Expected: FAIL because the queue does not exist.

- [ ] **Step 3: Implement Resolve Queue**

Use shared `SearchInput` with 200 ms debounce and filters for Shop, blocker, config code, product type, marketplace, and age. Query from filter state only; never attach fetching to scroll handlers.

- [ ] **Step 4: Implement Live Trace**

Render original/canonical SKU, applied rules, normalized inputs with source, template/product group, blockers, recommendation, candidates, confidence, cost, and current plan. IDs may appear only in a secondary copyable technical section.

- [ ] **Step 5: Add guarded resolve/recheck/select behavior**

Hide write actions without `MAPPING:WRITE`. On selection, call `selectFulfillmentCandidate()` and offer auto-next after successful query invalidation. Do not call `/confirm`.

- [ ] **Step 6: Run queue and workspace tests**

Run: `npx vitest run src/test/portal/mapping/components/ResolveQueuePanel.test.tsx src/test/portal/mapping/pages/MappingWorkspacePage.test.tsx --project ui`

Expected: PASS.

---

### Task 5: Rule inventory, inline editor, impact preview, and history

**Files:**

- Create: `src/features/portal/mapping/components/RuleInventoryPanel.tsx`
- Create: `src/features/portal/mapping/components/RuleEditorPanel.tsx`
- Create: `src/features/portal/mapping/components/RuleImpactSamples.tsx`
- Create: `src/features/portal/mapping/components/RuleHistoryModal.tsx`
- Test: `src/test/portal/mapping/components/RuleEditorPanel.test.tsx`
- Modify: `src/features/portal/mapping/pages/MappingWorkspacePage.tsx`

**Interfaces:**

- `RuleInventoryPanel` consumes active rule type and produces selected rule.
- `RuleEditorPanel` consumes selected rule, stage-specific field metadata, authorable Shops, and preview/conflict/save callbacks.
- `RuleImpactSamples` consumes `RulePreviewResult` and `RuleConflictResult` and labels impact as sampled.

- [ ] **Step 1: Write editor safety tests**

```tsx
await user.type(screen.getByLabelText('Config code'), 'TS1S')
await user.click(screen.getByRole('button', { name: 'Preview changes' }))
expect(screen.getByText('Exact conflict')).toBeVisible()
expect(screen.getByRole('button', { name: 'Save rule' })).toBeDisabled()
```

Verify call order with Vitest's built-in metadata:

```ts
expect(previewMappingRule.mock.invocationCallOrder[0]).toBeLessThan(
  findMappingRuleConflicts.mock.invocationCallOrder[0],
)
```

Add a second test proving a broader-scope overlap requires acknowledgement but does not permanently block save.

- [ ] **Step 2: Run the test and verify failure**

Run: `npx vitest run src/test/portal/mapping/components/RuleEditorPanel.test.tsx --project ui`

Expected: FAIL because the editor does not exist.

- [ ] **Step 3: Implement inventory and stage-specific field definitions**

Support the five API aliases: `skuNormalize`, `skuConfig`, `semanticRules`, `valueAliases`, and `vendorRouting`. Use readable Shop, vendor, product group, and template labels. Keep advanced scope fields visible but grouped after the primary match/output fields.

- [ ] **Step 4: Implement the inline editor safety sequence**

The save state machine is:

```ts
type SaveGate =
  | { state: 'DIRTY' }
  | { state: 'PREVIEWED'; preview: RulePreviewResult }
  | { state: 'BLOCKED'; conflicts: RuleConflictResult }
  | { state: 'WARNING'; conflicts: RuleConflictResult; acknowledged: boolean }
  | { state: 'READY' }
```

Any field change returns the gate to `DIRTY`. Exact conflict cannot reach `READY`. Broader overlap reaches `READY` only after acknowledgement.

- [ ] **Step 5: Implement impact samples and lazy history modal**

Render `Sampled impact` in both languages. History query uses `enabled: open && Boolean(ruleId)` so closed modals perform no request.

- [ ] **Step 6: Implement dirty-state protection**

Intercept rule selection, stage change, context change, and editor close. Reuse Ant Design confirmation modal and preserve the draft when the user cancels navigation.

- [ ] **Step 7: Run editor and workspace tests**

Run: `npx vitest run src/test/portal/mapping/components/RuleEditorPanel.test.tsx src/test/portal/mapping/pages/MappingWorkspacePage.test.tsx --project ui`

Expected: PASS.

---

### Task 6: Mutation feedback, cache invalidation, and explicit batch recheck

**Files:**

- Modify: `src/features/portal/mapping/api/mappingKeys.ts`
- Modify: `src/features/portal/mapping/pages/MappingWorkspacePage.tsx`
- Modify: `src/features/portal/mapping/components/ResolveQueuePanel.tsx`
- Modify: `src/features/portal/mapping/components/RuleEditorPanel.tsx`
- Modify: `src/test/portal/mapping/pages/MappingWorkspacePage.test.tsx`

**Interfaces:**

- Mutation success invalidates only Mapping summary, relevant rule list/history, selected preview, and unmatched queue keys.
- Uses shared `useFeedbackToast()` for product success/error banners.

- [ ] **Step 1: Add failing mutation-scope tests**

Assert that saving a rule invalidates Mapping keys but does not call `recheckUnmatched()`. Assert that batch recheck runs only after explicit confirmation and sends `limit <= 100` with current Shop/channel context.

- [ ] **Step 2: Run the test and verify failure**

Run: `npx vitest run src/test/portal/mapping/pages/MappingWorkspacePage.test.tsx --project ui`

Expected: FAIL until mutation orchestration is complete.

- [ ] **Step 3: Implement targeted invalidation and feedback**

Use `mappingKeys` roots rather than `queryClient.clear()`. Preserve editor values on mutation failure. Extract backend error messages through the shared API-error helper and provide retry only for idempotent preview/recheck reads.

- [ ] **Step 4: Implement explicit batch confirmation**

The confirmation copy states the current Shop/channel scope and maximum item count. Disable submission while pending and show returned processed/resolved/blocked counts in the success feedback.

- [ ] **Step 5: Run Mapping UI tests**

Run: `npx vitest run src/test/portal/mapping --project unit && npx vitest run src/test/portal/mapping --project ui --maxWorkers=4`

Expected: PASS.

---

### Task 7: Final quality gate and one clean implementation commit

**Files:**

- Verify all Mapping files and integration files listed above.

**Interfaces:**

- Produces a complete permission-gated Mapping Pipeline Workspace with no backend change.

- [ ] **Step 1: Run source formatting and lint checks**

Run: `npx prettier --check src/features/portal/mapping src/test/portal/mapping src/test/app/router/PortalMappingRoute.test.tsx`

Run: `npx eslint src/features/portal/mapping src/test/portal/mapping src/test/app/router/PortalMappingRoute.test.tsx src/app/layout/appNavigation.ts src/app/router/router.tsx`

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run focused Mapping tests**

Run: `npx vitest run src/test/portal/mapping src/test/app/layout/appNavigation.test.ts --project unit`

Run: `npx vitest run src/test/portal/mapping src/test/app/router/PortalMappingRoute.test.tsx --project ui --maxWorkers=4`

Expected: PASS.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: PASS and the Mapping page remains a lazy route chunk.

- [ ] **Step 5: Review staged scope**

Stage only Mapping feature, Mapping tests, route/navigation integration, and matching locale keys. Run `git diff --cached --check` and verify Catalog/Design files are absent.

- [ ] **Step 6: Create the single implementation commit**

```powershell
git commit -m "feat(mapping): add pipeline operator workspace"
```

- [ ] **Step 7: Runtime handoff**

Run FE and BE locally, sign in with a `MAPPING:READ`/`MAPPING:WRITE` account, verify queue selection, preview, conflict gate, save, recheck, manual selection, language switch, and dark/light theme. Record any backend data gap instead of displaying raw IDs.
