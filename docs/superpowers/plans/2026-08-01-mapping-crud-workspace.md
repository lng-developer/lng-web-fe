# Mapping CRUD Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one Mapping workspace with a blocked-order Workbench and five consistent table-and-modal CRUD tabs.

**Architecture:** Keep `/portal/mapping` as the canonical lazy-loaded route and store the active internal tab in `?tab=`. Reuse the existing Mapping API, Ant Design, TanStack Query, shared search, feedback toast, permission boundary, and rule preview/conflict endpoints. Treat status changes as Enable/Disable; permanent delete remains unavailable until the backend exposes a safe usage check.

**Tech Stack:** React, TypeScript, React Router, Ant Design, TanStack Query, react-i18next, Vitest, Testing Library.

## Global Constraints

- The sidebar contains one Mapping entry; the six areas are internal tabs.
- CRUD editors use centered modals and preserve entered values after API errors.
- Product group, template, vendor, and shop render readable names/codes, never MongoDB ObjectIDs.
- Read controls use `MAPPING:READ`; mutations use backend-provided `MAPPING:WRITE`.
- No new frontend dependencies.
- Use shared API client, SearchInput, feedback toast, loading, empty, and permission components.
- Search filtering uses the shared 200 ms debounce.
- Permanent delete is not exposed until the backend provides safe usage checks.
- Produce at most three implementation commits for this plan.

---

### Task 1: Canonical Mapping workspace and tab navigation

**Files:**

- Create: `src/features/portal/mapping/pages/MappingWorkspacePage.tsx`
- Create: `src/features/portal/mapping/pages/LegacyMappingRedirect.tsx`
- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/app/router/router.tsx`
- Modify: `src/features/portal/mapping/model/mappingPageConfig.ts`
- Modify: `src/features/portal/mapping/pages/MappingWorkbenchPage.tsx`
- Test: `src/test/app/layout/appNavigation.test.ts`
- Test: `src/test/app/router/PortalMappingRoute.test.tsx`
- Test: `src/test/portal/mapping/model/mappingPageConfig.test.ts`
- Test: `src/test/portal/mapping/pages/MappingWorkbenchPage.test.tsx`

**Interfaces:**

- Produces: canonical URL `/portal/mapping?tab=<MappingWorkspaceTab>`.
- Produces: `MappingWorkspaceTab = 'workbench' | MappingRulePageKey`.
- Consumes: `MAPPING_RULE_PAGES`, `MappingWorkbenchPage`, and `MappingRulePage`.

- [ ] **Step 1: Write failing navigation and route tests**

Assert that only `/portal/mapping` appears in `appNavigation`, that the canonical route lazy-loads `MappingWorkspacePage`, and that legacy paths render `LegacyMappingRedirect` while preserving query parameters.

```tsx
expect(portalMappingItems.map((item) => item.path)).toEqual(['/portal/mapping'])
expect(mappingRoute.lazy).toBeTypeOf('function')
expect(legacyProductMappingRoute.element?.type).toBe(LegacyMappingRedirect)
```

- [ ] **Step 2: Run tests and confirm the old multi-route behavior fails**

Run:

```powershell
npx vitest run --project unit src/test/app/layout/appNavigation.test.ts src/test/app/router/PortalMappingRoute.test.tsx src/test/portal/mapping/model/mappingPageConfig.test.ts src/test/portal/mapping/pages/MappingWorkbenchPage.test.tsx
```

Expected: assertions fail because Mapping still exposes separate sidebar/route entries.

- [ ] **Step 3: Implement the canonical tab workspace**

Use one Ant Design `Tabs` instance and replace only the `tab` query value on change.

```tsx
export type MappingWorkspaceTab = 'workbench' | MappingRulePageKey

export function MappingWorkspacePage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const active: MappingWorkspaceTab = isMappingWorkspaceTab(requested) ? requested : 'workbench'

  return (
    <Tabs
      activeKey={active}
      destroyOnHidden
      items={workspaceItems}
      onChange={(tab) => {
        const next = new URLSearchParams(params)
        next.set('tab', tab)
        setParams(next, { replace: true })
      }}
    />
  )
}
```

Redirect legacy URLs without dropping `orderItemId`, `configCode`, or `returnTo`.

```tsx
export function LegacyMappingRedirect({ tab }: { readonly tab: MappingWorkspaceTab }) {
  const [params] = useSearchParams()
  const next = new URLSearchParams(params)
  next.set('tab', tab)
  return <Navigate replace to={`/portal/mapping?${next.toString()}`} />
}
```

- [ ] **Step 4: Run the focused tests**

Run the command from Step 2. Expected: all focused unit tests pass.

- [ ] **Step 5: Commit workspace routing**

```powershell
git add src/app/layout/appNavigation.ts src/app/router/router.tsx src/features/portal/mapping/pages/MappingWorkspacePage.tsx src/features/portal/mapping/pages/LegacyMappingRedirect.tsx src/features/portal/mapping/model/mappingPageConfig.ts src/features/portal/mapping/pages/MappingWorkbenchPage.tsx src/test/app/layout/appNavigation.test.ts src/test/app/router/PortalMappingRoute.test.tsx src/test/portal/mapping/model/mappingPageConfig.test.ts src/test/portal/mapping/pages/MappingWorkbenchPage.test.tsx
git commit -m "refactor(mapping): consolidate workspace navigation"
```

---

### Task 2: Table-and-modal CRUD for five rule tabs

**Files:**

- Modify: `src/features/portal/mapping/api/mappingApi.ts`
- Modify: `src/features/portal/mapping/api/mappingKeys.ts`
- Modify: `src/features/portal/mapping/components/RuleEditorPanel.tsx`
- Modify: `src/features/portal/mapping/components/RuleInventoryPanel.tsx`
- Modify: `src/features/portal/mapping/components/RuleHistoryModal.tsx`
- Modify: `src/features/portal/mapping/pages/MappingRulePage.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Test: `src/test/portal/mapping/pages/MappingRulePage.test.tsx`
- Test: `src/test/portal/mapping/components/RuleEditorPanel.test.tsx`

**Interfaces:**

- Consumes: `listMappingRules`, `createMappingRule`, `updateMappingRule`, `previewMappingRule`, `findMappingRuleConflicts`, `getListingOptions`, and `listVendors`.
- Produces: `RuleReferenceOptions` containing readable product groups, templates, and vendors.
- Produces: Create, Update, Enable, Disable, Preview, conflict validation, and History actions.

- [ ] **Step 1: Write failing CRUD behavior tests**

Cover these observable behaviors:

```tsx
fireEvent.click(screen.getByRole('button', { name: /create rule/i }))
expect(await screen.findByRole('dialog')).toBeInTheDocument()
expect(screen.getByText('Product group')).toBeInTheDocument()
expect(screen.queryByText('69b12f8d99b2e3b197021d76')).not.toBeInTheDocument()

fireEvent.click(screen.getByRole('row', { name: /TS1S/i }))
expect(await screen.findByRole('dialog')).toHaveTextContent('Update rule')

fireEvent.click(screen.getByRole('menuitem', { name: /disable/i }))
expect(await screen.findByRole('dialog', { name: /disable rule/i })).toBeInTheDocument()
```

Mock a failed save and assert the entered config code remains in the form.

```tsx
await user.type(screen.getByRole('textbox', { name: /config code/i }), 'TS1S')
mockUpdate.mockRejectedValueOnce(new Error('Conflict'))
await user.click(screen.getByRole('button', { name: /save rule/i }))
expect(screen.getByRole('textbox', { name: /config code/i })).toHaveValue('TS1S')
```

- [ ] **Step 2: Run UI tests and verify failure**

```powershell
npx vitest run --project ui src/test/portal/mapping/pages/MappingRulePage.test.tsx src/test/portal/mapping/components/RuleEditorPanel.test.tsx
```

Expected: failures for modal CRUD, readable reference selects, or status confirmation behavior.

- [ ] **Step 3: Replace the rule list with a dense table toolbar**

Keep filter state in `MappingRulePage` and pass only display/action props to `RuleInventoryPanel`.

```ts
export type RuleTableFilters = {
  q: string
  shopId?: string
  status?: 'ACTIVE' | 'INACTIVE'
}
```

The table columns are selected from a `Record<MappingRuleType, ColumnsType<MappingRule>>`; every type includes readable business fields, priority, status, updated time, and actions. Row click calls `onSelect(rule)`. Action buttons stop propagation.

- [ ] **Step 4: Implement centered Create/Update and reference selects**

Load reference options only while a relevant modal is open.

```tsx
const editorOpen = creating || Boolean(selectedRule)
const catalogOptions = useQuery({
  queryKey: ['portal', 'catalog', 'listing-options'],
  queryFn: getListingOptions,
  enabled: canWrite && editorOpen && needsCatalogOptions(page.ruleType),
})
```

Render reference fields with searchable labels while retaining IDs only as submitted values.

```tsx
<Select
  showSearch
  optionFilterProp="label"
  options={items.map(({ id, code, name }) => ({
    value: id,
    label: code ? `${name} · ${code}` : name,
  }))}
/>
```

Filter internal templates by the form's selected `productTypeGroupId`. Do not reset or destroy the form on mutation errors. Close and reset only after mutation success.

- [ ] **Step 5: Implement Preview/conflict gating and Enable/Disable**

Save stays disabled until both preview and conflict queries complete without errors. Warnings require acknowledgement. Enable/Disable reuses `updateMappingRule(type, id, { status })` and the existing product confirmation modal.

```tsx
const changeStatus = (rule: MappingRule) =>
  updateMappingRule(page.ruleType, rule.id, {
    status: rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
  })
```

Do not render permanent Delete.

- [ ] **Step 6: Run focused tests, typecheck, and lint**

```powershell
npx vitest run --project ui src/test/portal/mapping/pages/MappingRulePage.test.tsx src/test/portal/mapping/components/RuleEditorPanel.test.tsx
npm run typecheck
npm run lint
```

Expected: all commands exit `0`.

- [ ] **Step 7: Commit CRUD tabs**

```powershell
git add src/features/portal/mapping src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/portal/mapping
git commit -m "feat(mapping): complete rule CRUD workspace"
```

---

### Task 3: Operational Workbench layout and final gate

**Files:**

- Modify: `src/features/portal/mapping/components/MappingContextBar.tsx`
- Modify: `src/features/portal/mapping/components/ResolveQueuePanel.tsx`
- Modify: `src/features/portal/mapping/components/MappingFlowBoard.tsx`
- Modify: `src/features/portal/mapping/pages/MappingWorkbenchPage.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Test: `src/test/portal/mapping/pages/MappingWorkbenchPage.test.tsx`
- Test: `src/test/portal/mapping/components/ResolveQueuePanel.test.tsx`

**Interfaces:**

- Consumes: unmatched item query, Mapping summary, preview, recheck, and rule-tab route contract from Task 1.
- Produces: compact filter toolbar, stage counters, readable blocked queue, selected-item processing path, and `Open rule` navigation.

- [ ] **Step 1: Write failing Workbench layout tests**

```tsx
expect(screen.getByRole('searchbox', { name: /order, sku or asin/i })).toBeInTheDocument()
expect(screen.getByText('Need product')).toBeInTheDocument()
await user.click(screen.getByRole('row', { name: /ORD-1001/i }))
expect(screen.getByText('Product')).toBeInTheDocument()
expect(screen.getByRole('button', { name: /open rule/i })).toBeInTheDocument()
```

Assert that `Open rule` navigates to `/portal/mapping?tab=<recommended-tab>` and preserves `orderItemId`, `configCode`, and `returnTo`.

- [ ] **Step 2: Run Workbench tests and confirm failure**

```powershell
npx vitest run --project ui src/test/portal/mapping/pages/MappingWorkbenchPage.test.tsx src/test/portal/mapping/components/ResolveQueuePanel.test.tsx
```

- [ ] **Step 3: Build the compact toolbar and stage counters**

Place Shop, Marketplace, shared debounced search, blocked stage, age, clear filter, and Recheck controls in one wrapping toolbar. Render counters as a compact segmented strip derived from `MappingSummary`; counters update filters instead of navigating away.

- [ ] **Step 4: Build the queue and selected-item processing path**

Use a dense table for the queue with order, SKU, shop, blocked stage, reason, age, and status. Keep the selected row visible. The detail pane renders the five process stages and only available business-readable values; missing values use the localized unavailable label.

Generate the canonical rule link with the existing mapping page config:

```ts
const target = new URLSearchParams({
  tab: recommendedTab,
  orderItemId: item.orderItemId,
  returnTo: currentWorkbenchUrl,
})
if (item.skuMapping?.configCode) target.set('configCode', item.skuMapping.configCode)
```

- [ ] **Step 5: Run the complete verification gate**

```powershell
npx vitest run --project unit src/test/app/layout/appNavigation.test.ts src/test/app/router/PortalMappingRoute.test.tsx src/test/portal/mapping/model/mappingPageConfig.test.ts
npx vitest run --project ui src/test/portal/mapping/pages/MappingRulePage.test.tsx src/test/portal/mapping/pages/MappingWorkbenchPage.test.tsx src/test/portal/mapping/components/RuleEditorPanel.test.tsx src/test/portal/mapping/components/ResolveQueuePanel.test.tsx
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: all tests and static checks pass; build may retain the known non-blocking large-chunk warning.

- [ ] **Step 6: Verify all six tabs in Browser**

At the running local URL, verify:

- Sidebar shows one Mapping item.
- Each internal tab updates `?tab=` without page reload.
- Create and row-click Update open centered modals.
- Search, Shop, Status, and tab-specific filters work.
- Product groups, templates, vendors, shops, table cells, modal text, and history contain no visible 24-character MongoDB ObjectID.
- Failed save preserves form values.
- Enable/Disable confirmation and toast behavior work.
- Vietnamese/English and light/dark modes remain readable.

- [ ] **Step 7: Commit Workbench and final integration**

```powershell
git add src/features/portal/mapping src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/portal/mapping
git commit -m "feat(mapping): finish operational workbench"
```
