# PSD File Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a permission-scoped, read-only PSD file workspace that lists real linked files and opens/downloads them through backend-provided URLs.

**Architecture:** Extend the existing backend Design workspace asset DTO without changing its query or authorization. Add one typed FE API call, a lazy guarded route, and one dense page built from existing Design and shared UI primitives.

**Tech Stack:** Node.js, Express, Jest, React, TypeScript, Ant Design, TanStack Query, Vitest, Testing Library.

## Global Constraints

- Do not add a dependency, second asset endpoint, public URL, upload, delete, relink, review, or PSD editor.
- Backend scope and authorization remain authoritative; FE must not infer shop or task scope.
- Use the existing API client, DataTable, FilterBar, DateRangePicker, StatusTag, and shared page feedback.
- Never compose a media URL in FE or fabricate a preview for a binary file.
- Keep route tests routing-only and add a dedicated component test.
- Run focused BE and FE tests, FE lint, and FE build using test infrastructure only.

---

## File Structure

- Modify `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/modules/design/dtos/designWorkspace.dto.js`: include backend-owned `downloadUrl` in `toAssetDto`.
- Modify `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/test/design/services/designTask.service.test.js`: prove the PSD row gets that URL.
- Modify `src/features/portal/design/api/designApi.ts`: PSD-file types and `listPsdFiles`.
- Modify `src/features/portal/design/api/designKeys.ts`: `psdFiles(params)` cache key.
- Create `src/features/portal/design/pages/PsdFileWorkspacePage.tsx`: page-local filters, table, preview, file actions.
- Modify `src/features/portal/design/pages/DesignWorkbenchPage.tsx`: navigation-only entry point.
- Modify `src/app/router/router.tsx`: lazy `/portal/design/files` route with existing Design permissions.
- Create `src/test/portal/design/pages/PsdFileWorkspacePage.test.tsx`: API-driven UI behavior.
- Modify `src/test/app/router/PortalDesignRoute.test.tsx`: route-only permission coverage.

### Task 1: Expose the backend-owned download URL

**Files:**

- Modify: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/modules/design/dtos/designWorkspace.dto.js:1-13`
- Modify: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/test/design/services/designTask.service.test.js:1029-1073`

**Interfaces:**

- Consumes: `toAssetDto(asset)` and a Media asset `_id` or `id`.
- Produces: `downloadUrl: '/api/media/assets/:assetId/download' | null` on every Design workspace asset.

- [ ] **Step 1: Write the failing assertion**

In the existing `lists PSD file links through scoped shops and maps only PSD task rows` test, add:

```js
asset: expect.objectContaining({
  createdAt: new Date('2026-07-10T00:00:00.000Z'),
  downloadUrl: `/api/media/assets/${assetId}/download`,
}),
```

- [ ] **Step 2: Run the focused test and observe the missing field**

Run:

```powershell
npm test -- --runInBand src/test/design/services/designTask.service.test.js -t "lists PSD file links"
```

Expected: FAIL because `downloadUrl` is absent.

- [ ] **Step 3: Implement the DTO field**

Use the existing Media route, once, inside `toAssetDto`:

```js
const id = asset._id || asset.id
return {
  id: String(id),
  originalFilename: asset.originalFilename || null,
  mimeType: asset.mimeType || null,
  size: asset.size ?? null,
  createdAt: asset.createdAt || null,
  downloadUrl: id ? `/api/media/assets/${id}/download` : null,
}
```

- [ ] **Step 4: Verify service and route behavior**

Run:

```powershell
npm test -- --runInBand src/test/design/services/designTask.service.test.js -t "lists PSD file links"
npm test -- --runInBand src/test/design/routes/index.test.js -t "GET /psd-files"
```

Expected: PASS; task type remains PSD_TEMPLATE and invalid role/sort plus permission behavior is unchanged.

### Task 2: Add typed API access and the guarded route

**Files:**

- Modify: `src/features/portal/design/api/designApi.ts:1-154`
- Modify: `src/features/portal/design/api/designKeys.ts:1-13`
- Modify: `src/app/router/router.tsx:174-194`
- Modify: `src/test/app/router/PortalDesignRoute.test.tsx:1-27`

**Interfaces:**

- Produces: `PsdFileListParams`, `PsdFileListItem`, `listPsdFiles(params)`, `designKeys.psdFiles(params)`, and a `/portal/design/files` route.

- [ ] **Step 1: Write a failing API client test**

Call this API function under a mocked shared client:

```ts
await listPsdFiles({
  page: 1,
  limit: 20,
  search: 'flower',
  role: 'APPROVED',
  taskStatus: 'APPROVED',
  dateFrom: '2026-08-01',
  dateTo: '2026-08-31',
})
```

Assert the client receives `'/api/design/psd-files'` and only non-empty parameters.

- [ ] **Step 2: Run the API test and observe it fail**

Run:

```powershell
npm test -- --run src/test/portal/design/api/designApi.test.ts
```

Expected: FAIL because `listPsdFiles` does not exist.

- [ ] **Step 3: Implement the API surface**

Add these exact shapes near existing Design types:

```ts
export type PsdFileListParams = {
  page: number
  limit: number
  search?: string
  role?: 'REFERENCE' | 'SUBMISSION' | 'APPROVED'
  designerId?: string
  taskStatus?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'createdAt' | 'submittedAt'
  sortOrder?: 'asc' | 'desc'
}
export type PsdFileListItem = {
  rowKey: string
  linkedAt: string | null
  role: string
  asset: (DesignAsset & { createdAt?: string | null }) | null
  task: { id: string; taskType: string; status: string }
  listing: { id: string; code: string | null; title: string | null }
  designer: { id: string | null; name: string | null }
  submission: { id: string | null; version: number | null; submittedAt: string | null }
}
```

Implement `listPsdFiles` with existing `compact` and `unwrap`, then add `designKeys.psdFiles(params)`. Add a lazy route using `PsdFileWorkspacePage` in the same `PortalPageBoundary` permission array as `/portal/design`.

- [ ] **Step 4: Extend the route-only test and verify focused FE checks**

Mock `PsdFileWorkspacePage` as `<div>PSD files</div>`. For each `DESIGN:READ`, `DESIGN:WRITE`, `DESIGN:WORK`, and `DESIGN:REVIEW`, lazy-load `portal/design/files` and assert it renders.

Run:

```powershell
npm test -- --run src/test/portal/design/api/designApi.test.ts src/test/app/router/PortalDesignRoute.test.tsx
```

Expected: PASS.

### Task 3: Implement the read-only PSD File Workspace

**Files:**

- Create: `src/features/portal/design/pages/PsdFileWorkspacePage.tsx`
- Modify: `src/features/portal/design/pages/DesignWorkbenchPage.tsx:98-700`
- Create: `src/test/portal/design/pages/PsdFileWorkspacePage.test.tsx`

**Interfaces:**

- Consumes: `listPsdFiles`, `listDesignAssignees`, `designKeys.psdFiles`, `DataTable`, `FilterBar`, `DateRangePicker`, and `StatusTag`.
- Produces: server-paginated PSD rows and a navigation-only Design workbench entry point.

- [ ] **Step 1: Write failing component tests**

Mock an `image/png` row and an `application/octet-stream` PSD row. Assert:

```tsx
expect(await screen.findByText('PSD files')).toBeVisible()
expect(screen.getByRole('img', { name: 'reference.png' })).toBeVisible()
expect(screen.queryByRole('img', { name: 'master.psd' })).not.toBeInTheDocument()
expect(screen.getByRole('link', { name: 'Download master.psd' })).toHaveAttribute(
  'href',
  '/api/media/assets/asset-2/download',
)
```

Change role, designer, status, and date filters; assert the subsequent `listPsdFiles` call uses those values with `page: 1`. Add a row whose `downloadUrl` is null and assert there is no actionable link. In the Design workbench test, click `PSD files` and assert navigation without any dialog or detail drawer.

- [ ] **Step 2: Run the component tests and observe failure**

Run:

```powershell
npm test -- --run src/test/portal/design/pages/PsdFileWorkspacePage.test.tsx src/test/portal/design/pages/DesignWorkbenchPage.test.tsx
```

Expected: FAIL because the workspace and entry point do not exist.

- [ ] **Step 3: Implement the minimum workspace**

Keep `{ page, limit, search, role, designerId, taskStatus, dateFrom, dateTo }` as page-local state. Query `listPsdFiles(params)` through `useQuery({ queryKey: designKeys.psdFiles(params) })`. Reset page to `1` on filter change.

Use compact shared controls and a `DataTable` with: File, Role, Listing, Task status, Designer, Version, Linked, Actions. Render an image thumbnail only when `asset.mimeType?.startsWith('image/')`; all other files show icon plus filename. Render accessible `Open` and `Download` links only from `asset.downloadUrl`. Add a navigation-only `PSD files` action to `DesignWorkbenchPage`.

- [ ] **Step 4: Verify focused component and route tests**

Run:

```powershell
npm test -- --run src/test/portal/design/pages/PsdFileWorkspacePage.test.tsx src/test/portal/design/pages/DesignWorkbenchPage.test.tsx src/test/app/router/PortalDesignRoute.test.tsx
```

Expected: PASS; filters query the backend, binary files get no fake preview, and actions use returned URLs.

- [ ] **Step 5: Run release checks and make one implementation commit**

Run:

```powershell
npm run lint
npm run build
git add --all
git commit -m "feat(design): add PSD file workspace"
```

Expected: lint and build exit `0`; create exactly one implementation commit after all BE and FE verification passes.

## Self-review

- Spec coverage: Task 1 supplies safe URLs, Task 2 provides typed/cache/route integration, Task 3 covers filters, display, image-only preview, real actions, pagination, entry point, and component verification.
- Placeholder scan: no deferred or unspecified implementation remains.
- Type consistency: Task 2 defines `PsdFileListParams`, `PsdFileListItem`, `listPsdFiles`, and `designKeys.psdFiles`; Task 3 uses those exact names.
