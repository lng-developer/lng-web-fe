# Catalog Listing Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Catalog PSD queues use effective readiness and ship a permission-aware Listing management/QC workbench.

**Architecture:** Backend Catalog keeps the existing models and API envelopes, adds one effective-readiness filter, and reuses `resolvePsdReadiness()` before queue/count/task decisions. Frontend adds one `portal/catalog` feature using the shared API client, TanStack Query, Ant Design, and existing operational UI components. Backend is completed and verified before frontend work begins.

**Tech Stack:** Node.js, Express, MongoDB/Mongoose, Joi, Jest; React, TypeScript, Ant Design, TanStack Query, SCSS modules, i18next, Vitest, Testing Library.

## Global Constraints

- Keep existing module boundaries and API envelopes.
- Keep `psdStatus` backward compatible; new operational UI uses `psdReadinessStatus`.
- Do not add models, dependencies, Product Type/Internal Template editors, Design Task UI, direct PSD upload, or a generic Media manager.
- Use backend-provided global and shop-scoped `CATALOG:READ` / `CATALOG:WRITE`; never hardcode role names.
- Complete backend safety before frontend implementation.
- Produce one backend implementation commit and one frontend implementation commit.

---

### Task 1: Correct effective PSD readiness in Catalog BE

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-be\.worktrees\fe-refactor\src\modules\catalog\validators\listing.validator.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\.worktrees\fe-refactor\src\modules\catalog\services\listing.service.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\.worktrees\fe-refactor\src\modules\catalog\routes\index.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\.worktrees\fe-refactor\src\modules\catalog\controllers\catalog.controller.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\.worktrees\fe-refactor\src\modules\catalog\services\catalog.service.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\.worktrees\fe-refactor\src\modules\shop\public.js`
- Test: `C:\lng_system\lng-web\lng-web-be\.worktrees\fe-refactor\src\test\catalog\services\catalog.service.test.js`
- Test: `C:\lng_system\lng-web\lng-web-be\.worktrees\fe-refactor\src\test\catalog\routes\index.test.js`

**Interfaces:**

- Consumes: existing `resolvePsdReadiness(listing, template)` and repository `listForSalesSort(filters)`.
- Produces: optional query `psdReadinessStatus: 'MISSING' | 'PRESENT' | 'NOT_REQUIRED'` on Listing list/summary.
- Preserves: list envelope `{ items, pagination }`, summary shape, Listing DTO, and stored `psdStatus`.
- Adds: `GET /api/catalog/listing-options` returning active scoped Shops plus active Product Type Groups and Internal Templates.

- [ ] **Step 1: Add failing service tests for effective filter and summary**

Add these fixture helpers inside the existing `describe` block, then add the focused tests:

```js
const listingFixture = (overrides = {}) => ({
  _id: listingId,
  shopId,
  salesChannelCode: 'AMAZON',
  marketplaceCode: 'AMAZON_US',
  sku: 'SKU-1',
  title: 'Custom shirt',
  productTypeGroupId: { _id: groupId, code: 'SHIRT', name: 'Shirt' },
  internalTemplateId: null,
  psdTemplateAssetId: null,
  psdStatus: 'MISSING',
  qcStatus: 'DRAFT',
  status: 'ACTIVE',
  ...overrides,
})

const templateFixture = (overrides = {}) => ({
  _id: templateId,
  productTypeGroupId: groupId,
  code: 'SHIRT_MAIN',
  name: 'Shirt Main',
  status: 'ACTIVE',
  requiresPsd: true,
  designAssets: [],
  ...overrides,
})

test('filters Listings by effective PSD readiness before pagination', async () => {
  listingRepository.listForSalesSort.mockResolvedValue([
    listingFixture({ _id: 'listing-direct', psdTemplateAssetId: 'asset-direct' }),
    listingFixture({ _id: 'listing-template', internalTemplateId: 'template-psd' }),
    listingFixture({ _id: 'listing-optional', internalTemplateId: 'template-optional' }),
    listingFixture({ _id: 'listing-missing' }),
  ])
  templateRepository.findByIds.mockResolvedValue([
    templateFixture({
      _id: 'template-psd',
      designAssets: [{ type: 'PSD_TEMPLATE', status: 'ACTIVE', mediaAssetId: 'asset-template' }],
    }),
    templateFixture({ _id: 'template-optional', requiresPsd: false }),
  ])

  const result = await service.listListings(
    { page: 1, limit: 20, psdReadinessStatus: 'MISSING' },
    { permissions: ['CATALOG:READ'], scopes: [] },
  )

  expect(result.items.map(({ id }) => id)).toEqual(['listing-missing'])
  expect(result.pagination.total).toBe(1)
})

test('summary excludes template-backed and optional PSD Listings from noPsdCount', async () => {
  listingRepository.summarize.mockResolvedValue({
    totalListingCount: 3,
    amazonListingCount: 3,
    etsyListingCount: 0,
    noPsdCount: 3,
    draftCount: 3,
    approvedCount: 0,
    rejectedCount: 0,
  })
  listingRepository.listForSalesSort.mockResolvedValue([
    listingFixture({ _id: 'listing-template', internalTemplateId: 'template-psd' }),
    listingFixture({ _id: 'listing-optional', internalTemplateId: 'template-optional' }),
    listingFixture({ _id: 'listing-missing' }),
  ])
  templateRepository.findByIds.mockResolvedValue([
    templateFixture({
      _id: 'template-psd',
      designAssets: [{ type: 'PSD_TEMPLATE', status: 'ACTIVE', mediaAssetId: 'asset-template' }],
    }),
    templateFixture({ _id: 'template-optional', requiresPsd: false }),
  ])

  await expect(
    service.getListingSummary({}, { permissions: ['CATALOG:READ'], scopes: [] }),
  ).resolves.toMatchObject({
    totalListingCount: 3,
    noPsdCount: 1,
  })
})
```

Use the existing fixture helpers in the test file; extend them only with the fields shown above.

- [ ] **Step 2: Add failing creation tests for PSD task suppression**

Add two tests next to the current manual Listing PSD task tests:

```js
test.each([
  [
    'template PSD',
    templateFixture({
      designAssets: [{ type: 'PSD_TEMPLATE', status: 'ACTIVE', mediaAssetId: 'asset-1' }],
    }),
  ],
  ['PSD not required', templateFixture({ requiresPsd: false })],
])(
  'createListing does not create a PSD task when readiness comes from %s',
  async (_, activeTemplate) => {
    templateRepository.findById.mockResolvedValue(activeTemplate)
    listingRepository.create.mockResolvedValue(
      listingFixture({
        _id: 'listing-1',
        internalTemplateId: activeTemplate._id,
      }),
    )

    await service.createListing(
      {
        shopId,
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'AMAZON_US',
        sku: 'SKU-1',
        title: 'Custom shirt',
        productTypeGroupId: groupId,
        internalTemplateId: activeTemplate._id,
      },
      { permissions: ['CATALOG:WRITE'], scopes: [] },
    )

    expect(designPublic.createPsdTemplateTaskFromListing).not.toHaveBeenCalled()
  },
)
```

The existing `createListing creates PSD design task when PSD is missing` test must remain green.

- [ ] **Step 3: Add failing route/validator tests**

Add route tests proving:

```js
await request(app).get('/api/catalog/listings?psdReadinessStatus=MISSING').expect(200)
expect(catalogService.listListings).toHaveBeenCalledWith(
  expect.objectContaining({ psdReadinessStatus: 'MISSING' }),
  expect.any(Object),
)

await request(app).get('/api/catalog/listings?psdReadinessStatus=UNKNOWN').expect(400)
```

Also change Product Type Group and Internal Template GET-route expectations so a scoped `CATALOG:READ` grant passes the coarse middleware, while POST/PATCH remain global-only.

- [ ] **Step 4: Run Catalog tests and verify RED**

Run:

```powershell
npm test -- --runInBand src/test/catalog
```

Expected: new tests fail because the query is rejected/ignored, summary uses stored `psdStatus`, creation triggers a task, and master-data GET routes require global permission.

- [ ] **Step 5: Implement the smallest effective-readiness path**

In `listing.validator.js`, add:

```js
psdReadinessStatus: Joi.string().valid('MISSING', 'PRESENT', 'NOT_REQUIRED'),
```

In `listing.service.js`, add one helper that fetches the already authorized/shop-filtered set, attaches template readiness, applies the optional readiness filter, and returns the enriched items:

```js
async function effectiveReadinessItems(query = {}) {
  const items = await attachTemplateRefs(await listingRepository.listForSalesSort(query))
  return query.psdReadinessStatus
    ? items.filter((item) => item.psdReadiness?.status === query.psdReadinessStatus)
    : items
}
```

For `listListings()`, use this helper only when `psdReadinessStatus` is present, paginate after filtering, then enrich only the selected page with assets, Shop, seller, and sales statistics. Preserve the existing fast repository path when the filter is absent.

For `getListingSummary()`, preserve repository counts when no readiness filter is present and replace only `noPsdCount` with the count of effective `MISSING` items. When `psdReadinessStatus` is present, compute all seven existing summary counters from the readiness-filtered items so metrics match the active filter.

Change `triggerPsdDesignTaskForManualListing()` to resolve the Listing's active Internal Template and return unless readiness is `MISSING`:

```js
const templateId = toPlainId(listing.internalTemplateId)
const template = templateId ? await internalTemplateRepository.findById(templateId) : null
if (resolvePsdReadiness(listing, template).status !== setupStatuses.MISSING) return
```

Do not update stored `psdStatus` merely because a template supplies readiness.

- [ ] **Step 6: Allow scoped Catalog grants to read master-data options**

In `routes/index.js`, use the existing `requireCatalogReadAny` middleware for GET Product Type Groups and GET Internal Templates/detail. Keep POST/PATCH on `requireCatalogWrite` so master-data mutations remain global-only. Service behavior remains unchanged because these are global read-only records.

- [ ] **Step 7: Run backend verification**

Before verification, add a route/service test for `GET /listing-options`. A scoped writer with Shop A must receive only Shop A; a global reader receives every active Shop. Assert the response shape:

```js
{
  shops: [{ id: shopId, name: 'Football Shop', currency: 'USD', status: 'ACTIVE' }],
  productTypeGroups: expect.any(Array),
  internalTemplates: expect.any(Array),
}
```

Implement `shopPublic.listActiveShops({ shopIds })` through the Shop repository, and let Catalog select `shopIds` from its existing Catalog access helper. The endpoint requires `requireCatalogReadAny`; it does not call `/api/shops` and does not grant `SHOPS:READ`.

Run backend verification:

Run:

```powershell
npm test -- --runInBand src/test/catalog
npm run test:architecture -- --runInBand
Get-ChildItem -Path src\modules\catalog -Recurse -Filter *.js | ForEach-Object { node -c $_.FullName }
```

Expected: Catalog 69 existing tests plus new tests pass; architecture 22/22 passes; every Catalog JS file exits syntax check with code 0.

- [ ] **Step 8: Create the single backend commit**

```powershell
git add -- src/modules/catalog/validators/listing.validator.js src/modules/catalog/services/listing.service.js src/modules/catalog/services/catalog.service.js src/modules/catalog/controllers/catalog.controller.js src/modules/catalog/routes/index.js src/modules/shop/public.js src/test/catalog/services/catalog.service.test.js src/test/catalog/routes/index.test.js
git diff --cached --check
git commit -m "fix(catalog): use effective PSD readiness"
```

---

### Task 2: Add the Catalog FE contract and permission-gated route

**Files:**

- Create: `src/features/portal/catalog/api/catalogApi.ts`
- Create: `src/features/portal/catalog/api/catalogKeys.ts`
- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/app/router/router.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Create: `src/test/portal/catalog/api/catalogApi.test.ts`
- Modify: `src/test/app/layout/appNavigation.test.ts`
- Create: `src/test/app/router/PortalCatalogRoute.test.tsx`

**Interfaces:**

- Produces: `CatalogListParams`, `Listing`, `CatalogSummary`, `ProductTypeGroup`, `InternalTemplate`, `CreateListingInput`, and `UpdateListingInput`.
- API functions: `listListings`, `getListingSummary`, `getListing`, `getListingOptions`, `createListing`, `updateListing`, `approveListing`, `rejectListing`.
- Route: `/portal/catalog`, available for effective `CATALOG:READ` or `CATALOG:WRITE`.

- [ ] **Step 1: Write failing API contract tests**

Mock `apiClient` exactly like existing portal API tests and assert these calls:

```ts
await listListings({ page: 1, limit: 20, search: '', psdReadinessStatus: 'MISSING' })
expect(apiClient.get).toHaveBeenCalledWith('/api/catalog/listings', {
  params: { page: 1, limit: 20, psdReadinessStatus: 'MISSING' },
})

await getListingSummary({ shopId: 'shop-1' })
expect(apiClient.get).toHaveBeenCalledWith('/api/catalog/listings/summary', {
  params: { shopId: 'shop-1' },
})

await createListing(createInput)
await updateListing('listing-1', updateInput)
await approveListing('listing-1')
await rejectListing('listing-1', 'Missing setup')
expect(apiClient.post).toHaveBeenCalledWith('/api/catalog/listings', createInput)
expect(apiClient.patch).toHaveBeenCalledWith('/api/catalog/listings/listing-1', updateInput)
expect(apiClient.post).toHaveBeenCalledWith('/api/catalog/listings/listing-1/approve')
expect(apiClient.post).toHaveBeenCalledWith('/api/catalog/listings/listing-1/reject', {
  rejectionReason: 'Missing setup',
})
```

Also assert detail uses `/api/catalog/listings/:id` and `getListingOptions()` uses `/api/catalog/listing-options`.

- [ ] **Step 2: Write failing navigation and route tests**

Add navigation assertions for global and scoped Catalog readers/writers:

```ts
expect(getContextNavigation('portal', account([], ['CATALOG:READ']))[0]?.items).toContainEqual({
  key: 'catalog',
  path: '/portal/catalog',
  labelKey: 'shell.navigation.catalog',
})
```

Create `PortalCatalogRoute.test.tsx` by following `PortalOrderRoute.test.tsx`: mock `CatalogListingWorkbenchPage`, load the lazy route, prove `CATALOG:READ` renders it, and prove unrelated permissions render 403.

- [ ] **Step 3: Run contract/navigation tests and verify RED**

Run:

```powershell
npx vitest run src/test/portal/catalog/api/catalogApi.test.ts src/test/app/layout/appNavigation.test.ts src/test/app/router/PortalCatalogRoute.test.tsx
```

Expected: FAIL because Catalog files, route, navigation, and locale label do not exist.

- [ ] **Step 4: Implement the API and query keys**

Use the shared `apiClient` and the existing envelope unwrap pattern. `CatalogListParams` includes page, limit, search, shopId, salesChannelCode, qcStatus, `psdReadinessStatus`, productTypeGroupId, and sort. `toParams()` omits only empty/undefined filters.

Use these query keys:

```ts
export const catalogKeys = {
  all: ['portal', 'catalog'] as const,
  list: (params: CatalogListParams) => [...catalogKeys.all, 'list', params] as const,
  summary: (params: CatalogSummaryParams) => [...catalogKeys.all, 'summary', params] as const,
  detail: (id: string) => [...catalogKeys.all, 'detail', id] as const,
  options: () => [...catalogKeys.all, 'listing-options'] as const,
}
```

- [ ] **Step 5: Wire navigation, route, and labels**

Put Catalog in Portal Configuration after Shops and before Vendors. Use effective permissions, not `globalPermissions`, so scoped Catalog grants work. Add the lazy route:

```tsx
<PortalPageBoundary anyOf={['CATALOG:READ', 'CATALOG:WRITE']}>
  <CatalogListingWorkbenchPage />
</PortalPageBoundary>
```

Add English `Catalog` and Vietnamese `Danh mục sản phẩm` navigation labels plus the page/form/status copy used in Tasks 3 and 4.

- [ ] **Step 6: Run API/navigation tests and verify GREEN**

Run the Step 3 command again. Expected: all tests pass.

---

### Task 3: Build the Listing editor with exact write boundaries

**Files:**

- Create: `src/features/portal/catalog/pages/CatalogListingEditorModal.tsx`
- Create: `src/test/portal/catalog/pages/CatalogListingEditorModal.test.tsx`

**Interfaces:**

- Props: `{ open, listing?, shops, productTypes, templates, saving, onClose, onSubmit }`.
- Create submits `CreateListingInput`; edit submits `UpdateListingInput` without identity fields.

- [ ] **Step 1: Write failing create/edit tests**

Create one test for each mode:

```tsx
it('submits required identity and setup fields when creating', async () => {
  renderEditor()
  await user.selectOptions(screen.getByLabelText('Shop'), 'shop-1')
  await user.selectOptions(screen.getByLabelText('Sales channel'), 'AMAZON')
  await user.type(screen.getByLabelText('Marketplace'), 'AMAZON_US')
  await user.type(screen.getByLabelText('SKU'), 'SKU-1')
  await user.type(screen.getByLabelText('Title'), 'Custom shirt')
  await user.selectOptions(screen.getByLabelText('Product type'), 'group-1')
  await user.click(screen.getByRole('button', { name: 'Create listing' }))
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      shopId: 'shop-1',
      salesChannelCode: 'AMAZON',
      marketplaceCode: 'AMAZON_US',
      sku: 'SKU-1',
      title: 'Custom shirt',
      productTypeGroupId: 'group-1',
    }),
  )
})

it('keeps identity read-only and submits only PATCH fields when editing', async () => {
  renderEditor({ listing })
  expect(screen.getByLabelText('SKU')).toBeDisabled()
  await user.clear(screen.getByLabelText('Title'))
  await user.type(screen.getByLabelText('Title'), 'Updated shirt')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(onSubmit).toHaveBeenCalledWith(expect.not.objectContaining({ shopId: expect.anything() }))
  expect(onSubmit).toHaveBeenCalledWith(expect.not.objectContaining({ sku: expect.anything() }))
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated shirt' }))
})
```

Use the repository's installed `userEvent` equivalent if present; otherwise use existing `fireEvent` patterns without adding a dependency.

- [ ] **Step 2: Run editor tests and verify RED**

Run:

```powershell
npx vitest run src/test/portal/catalog/pages/CatalogListingEditorModal.test.tsx
```

Expected: FAIL because the modal does not exist.

- [ ] **Step 3: Implement the minimal Ant Design modal**

Use vertical `Form`, `Select`, `Input`, and `InputNumber`. Create mode renders editable identity fields; edit mode renders them disabled and removes them from the submitted PATCH object. Filter Internal Template options by the selected Product Type Group. Treat `baseCostAmount` as integer minor units and currency as a three-letter uppercase value. Reset form on close and retain values while a failed mutation keeps the modal open.

- [ ] **Step 4: Run editor tests and verify GREEN**

Run the Step 2 command again. Expected: all editor tests pass.

---

### Task 4: Build the Catalog Listing workbench and QC flow

**Files:**

- Create: `src/features/portal/catalog/pages/CatalogListingWorkbenchPage.tsx`
- Create: `src/features/portal/catalog/pages/CatalogListingWorkbenchPage.module.scss`
- Create: `src/test/portal/catalog/pages/CatalogListingWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes Task 2 API/query keys and Task 3 editor.
- Produces the `/portal/catalog` operational page with summary/list/detail and permission-aware mutations.

- [ ] **Step 1: Write failing read/RBAC tests**

Mock Catalog API functions and render with `account` prop, following existing portal page tests. Assert:

```tsx
expect(await screen.findByText('SKU-1')).toBeVisible()
expect(screen.getByText('Template PSD')).toBeVisible()
expect(screen.queryByRole('button', { name: 'Create listing' })).not.toBeInTheDocument()
```

For a shop-scoped writer, assert Create/Edit/Approve/Reject appear only for a Listing in the exact granted shop. A Listing in another shop has no mutation actions even if present in mocked data.

- [ ] **Step 2: Write failing filter and QC tests**

Assert selecting **Missing PSD** calls `listListings` with `psdReadinessStatus: 'MISSING'` and resets page to 1. Assert Reject opens a required reason input, whitespace cannot submit, and a valid reason calls `rejectListing(id, reason)`. Assert Approve is shown only for Draft and calls `approveListing(id)` after confirmation.

- [ ] **Step 3: Run page tests and verify RED**

Run:

```powershell
npx vitest run src/test/portal/catalog/pages/CatalogListingWorkbenchPage.test.tsx
```

Expected: FAIL because the page does not exist.

- [ ] **Step 4: Implement queries, metrics, filters, and table**

Reuse `PageHeader`, `SectionCard`, `FilterBar`, `DataTable`, `StatusTag`, `FeedbackAlert`, and `useFeedbackToast`. Use page size 20. Query list, summary, active Product Types, and active Internal Templates; load detail only when a row is selected.

Render exactly these metrics: Total, No PSD, Draft, Approved, Rejected. Render table columns: preview; SKU/title; Shop/channel; Product Type/Internal Template; quantity/order count; effective PSD readiness; QC status; updated time. Use localized labels and do not expose raw IDs.

- [ ] **Step 5: Implement detail drawer and mutations**

Use a 720px drawer and full width below the existing mobile breakpoint. Show identity, setup, asset links, effective readiness source, sales, QC metadata, rejection reason, and timestamps.

Use a shared local permission helper:

```ts
function canWriteListing(account: CurrentAccount | undefined, shopId: string) {
  if (account?.permissions.includes('CATALOG:WRITE')) return true
  return (
    account?.scopes.some(
      (scope) =>
        scope.scopeType === 'shop' &&
        scope.scopeId === shopId &&
        scope.permissions.includes('CATALOG:WRITE'),
    ) ?? false
  )
}
```

Create/edit mutations keep the editor open on error. Approve/reject are available only for Draft. On every success, invalidate `catalogKeys.all`; close the corresponding modal and show the existing success toast.

- [ ] **Step 6: Add operational styling**

SCSS contains only page-specific layout: five-column metric grid, dense filters, preview sizing, detail sections, two-column metrics below tablet width, horizontal table behavior through the existing `DataTable`, and full-width drawer via Ant Design responsive width. Do not duplicate shared card/table/button styling.

- [ ] **Step 7: Run focused frontend tests**

Run:

```powershell
npx vitest run src/test/portal/catalog src/test/app/layout/appNavigation.test.ts src/test/app/router/PortalCatalogRoute.test.tsx
```

Expected: all Catalog API/editor/page/navigation/route tests pass.

- [ ] **Step 8: Run full frontend verification**

Run:

```powershell
npm test
npm run lint
npm run build
```

Expected: full unit/UI suites pass; lint exits 0; production build exits 0. The existing Vite large-chunk warning is non-blocking unless this change creates a new eager chunk regression.

- [ ] **Step 9: Create the single frontend commit**

```powershell
git add -- src/features/portal/catalog src/test/portal/catalog src/app/layout/appNavigation.ts src/app/router/router.tsx src/test/app/layout/appNavigation.test.ts src/test/app/router/PortalCatalogRoute.test.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json docs/superpowers/plans/2026-08-01-catalog-listing-workbench.md
git diff --cached --check
git commit -m "feat(catalog): add listing workbench"
```

## Final Cross-Repository Verification

- [ ] Backend `git status --short` is clean and log contains `fix(catalog): use effective PSD readiness`.
- [ ] Frontend `git status --short` is clean and log contains `feat(catalog): add listing workbench`.
- [ ] Re-run the focused BE Catalog suite and focused FE Catalog suite after commit hooks.
- [ ] Record both commit hashes in the delivery response; do not push or merge without user instruction.
