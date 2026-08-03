# Media Asset Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global Media operations workspace for listing, filtering, inspecting, uploading, previewing, and downloading media assets.

**Architecture:** Extend the existing BE Media module with one paginated list endpoint backed by its repository and DTO. Add a lazy FE portal route using a feature-local API and page while reusing shared DataTable, SearchInput, DateRangePicker, authenticated media preview/download, toast, and upload foundations.

**Tech Stack:** Node.js, Express, Joi, Mongoose, Jest, React, TypeScript, Ant Design, TanStack Query, Vitest, React Testing Library.

## Global Constraints

- Work directly on `refactor/fe-foundation` in the existing FE and BE worktrees.
- Global workspace access requires global `MEDIA:READ`; upload requires `MEDIA:WRITE`.
- Do not display MongoDB ObjectIDs.
- Do not add hard delete, manual discard, folders, tags, gallery mode, bulk actions, or cross-module owner enrichment.
- Add no dependency.
- Keep tests under `src/test`, never beside production files.

---

### Task 1: Backend paginated media list

**Files:**

- Create: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/modules/media/validators/mediaAsset.validator.js`
- Create: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/test/media/repositories/mediaAsset.repository.test.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/modules/media/repositories/mediaAsset.repository.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/modules/media/services/mediaAsset.service.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/modules/media/controllers/mediaAsset.controller.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/modules/media/dtos/mediaAsset.dto.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/modules/media/routes/index.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/test/media/routes/index.test.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/.worktrees/fe-refactor/src/test/media/services/mediaAsset.service.test.js`

**Interfaces:**

- Produces: `GET /api/media/assets`.
- Produces: `mediaAssetService.listAssets(query)`.
- Produces: `mediaAssetRepository.list(query) -> { items, pagination }`.
- Query: `{ q?, mimeGroup?, provider?, resourceType?, ownerType?, status?, dateFrom?, dateTo?, page?, limit? }`.

- [ ] **Step 1: Write failing repository tests**

Cover filename prefix search, MIME group, provider/resource/owner filters, active/discarded status, date range, and pagination:

```js
await repository.list({
  q: 'design',
  mimeGroup: 'IMAGE',
  status: 'ACTIVE',
  page: 2,
  limit: 20,
})

expect(MediaAsset.find).toHaveBeenCalledWith(
  expect.objectContaining({
    originalFilename: expect.any(RegExp),
    mimeType: /^image\//,
    discardedAt: null,
  }),
)
```

- [ ] **Step 2: Run repository test and verify RED**

Run:

```powershell
npx jest src/test/media/repositories/mediaAsset.repository.test.js --runInBand
```

Expected: FAIL because `repository.list` does not exist.

- [ ] **Step 3: Implement validation, repository list, service, DTO, controller, and route**

Use `normalizePagination` and return:

```js
{
  items: rows,
  pagination: { total, page, limit },
}
```

Map status without persisting a duplicate field:

```js
status: asset.discardedAt ? 'DISCARDED' : 'ACTIVE'
```

Register the list route before `/assets/:assetId`:

```js
router.get(
  '/assets',
  authPublic.authenticate,
  authPublic.authorizePermissions('MEDIA:READ'),
  asyncHandler(controller.listAssets),
)
```

- [ ] **Step 4: Add route/service tests**

Verify:

- 401 without authentication.
- 403 with scoped-only or missing global `MEDIA:READ`.
- 200 response excludes storage paths, hashes, secure URLs, owner IDs, and shop IDs.
- Empty `q` is stripped instead of rejected.
- Invalid dates, MIME group, status, page, and limit return 400.

- [ ] **Step 5: Run focused BE tests**

```powershell
npx jest src/test/media --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/modules/media src/test/media
git commit -m "feat(media): add paginated asset listing"
```

---

### Task 2: Frontend media API and upload contract

**Files:**

- Create: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/features/portal/media/api/mediaApi.ts`
- Create: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/features/portal/media/api/mediaKeys.ts`
- Create: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/test/portal/media/api/mediaApi.test.ts`

**Interfaces:**

- Produces: `listMediaAssets(params): Promise<MediaAssetPage>`.
- Produces: `uploadMediaAsset(file): Promise<MediaAsset>`.
- Reuses: `fetchMediaBlob`, `downloadMediaAsset`, and `AuthenticatedMediaImage` from `@/shared/media`.

- [ ] **Step 1: Write failing API tests**

```ts
await listMediaAssets({ q: ' design ', status: 'ACTIVE', page: 2, limit: 20 })

expect(apiClient.get).toHaveBeenCalledWith('/api/media/assets', {
  params: { q: 'design', status: 'ACTIVE', page: 2, limit: 20 },
})
```

Also verify upload sends one `file` field through `FormData`.

- [ ] **Step 2: Run API tests and verify RED**

```powershell
npx vitest run --project unit src/test/portal/media/api/mediaApi.test.ts
```

Expected: FAIL because the feature API does not exist.

- [ ] **Step 3: Implement minimal types, API calls, and query keys**

Define `MediaAsset`, `MediaAssetListParams`, `MediaAssetPage`, MIME/status unions, `listMediaAssets`, and `uploadMediaAsset`. Trim `q` and omit empty values.

- [ ] **Step 4: Run API tests**

```powershell
npx vitest run --project unit src/test/portal/media/api/mediaApi.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/portal/media/api src/test/portal/media/api
git commit -m "feat(media): add workspace API client"
```

---

### Task 3: Media operations workspace

**Files:**

- Create: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/features/portal/media/pages/MediaWorkspacePage.tsx`
- Create: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/features/portal/media/pages/MediaAssetDetailModal.tsx`
- Create: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/features/portal/media/pages/MediaUploadModal.tsx`
- Create: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/test/portal/media/pages/MediaWorkspacePage.test.tsx`

**Interfaces:**

- Consumes: Task 2 API and keys.
- Consumes: `CurrentAccount.permissions`.
- Produces: `MediaWorkspacePage`.

- [ ] **Step 1: Write failing workspace test**

Render the page with `MEDIA:READ` and assert:

- Search and filter controls are visible.
- ObjectIDs are absent.
- Human-readable filename, type, size, owner type, created date, and status render.
- Clicking a row opens the detail modal.
- Download action does not open the row modal.
- Upload is hidden without `MEDIA:WRITE`.

- [ ] **Step 2: Run workspace test and verify RED**

```powershell
npx vitest run --project ui src/test/portal/media/pages/MediaWorkspacePage.test.tsx
```

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement the table-first page**

Reuse:

- `PageHeader`, `SectionCard`, `DataTable`, `FilterBar`, `SearchInput`.
- `DateRangePicker`, `StatusTag`, `useFeedbackToast`.
- Ant Design `Select`, `Button`, `Tooltip`, `Modal`, and `Upload`.

Keep one query per current filter/page state. Reset page to 1 after filter changes. Render image previews only for image MIME types.

- [ ] **Step 4: Implement detail and upload modals**

Detail modal shows preview/icon, filename, MIME type, formatted size, provider, resource type, owner type, status, and created date. It never renders IDs.

Upload modal accepts one file, uses `beforeUpload={() => false}`, disables submit while pending, closes and invalidates `mediaKeys.all` on success, and keeps the selected file on error.

- [ ] **Step 5: Add error/loading/empty tests and run GREEN**

```powershell
npx vitest run --project ui src/test/portal/media/pages/MediaWorkspacePage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/portal/media/pages src/test/portal/media/pages
git commit -m "feat(media): add asset operations workspace"
```

---

### Task 4: Route, navigation, and translations

**Files:**

- Modify: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/app/router/router.tsx`
- Modify: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/app/layout/appNavigation.ts`
- Modify: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/shared/i18n/locales/en/common.json`
- Modify: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/shared/i18n/locales/vi/common.json`
- Modify: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/test/app/layout/AppSidebar.test.tsx`
- Create: `C:/lng_system/lng-web/lng-web-fe/.worktrees/fe-refactor/src/test/app/router/PortalMediaRoute.test.tsx`

**Interfaces:**

- Produces: lazy route `/portal/media`.
- Produces: Portal Operations navigation item visible only with global `MEDIA:READ`.

- [ ] **Step 1: Write failing route/navigation tests**

Verify the route lazy-loads `MediaWorkspacePage`, uses `PortalPageBoundary anyOf={['MEDIA:READ']} globalOnly`, and navigation is absent for scoped-only media permission.

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx vitest run --project ui src/test/app/router/PortalMediaRoute.test.tsx src/test/app/layout/AppSidebar.test.tsx
```

- [ ] **Step 3: Add route, navigation item, and EN/VI strings**

Place Media in Portal Operations near Design/Production. Add labels for title, description, filters, columns, states, detail, upload, success, and errors.

- [ ] **Step 4: Run route/navigation/workspace tests**

```powershell
npx vitest run --project ui src/test/app/router/PortalMediaRoute.test.tsx src/test/app/layout/AppSidebar.test.tsx src/test/portal/media/pages/MediaWorkspacePage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/app src/shared/i18n src/test/app
git commit -m "feat(media): expose workspace navigation"
```

---

### Task 5: Integrated verification

**Files:**

- No new production files.

- [ ] **Step 1: Run BE media tests**

```powershell
npx jest src/test/media --runInBand
```

- [ ] **Step 2: Run FE focused tests**

```powershell
npx vitest run --project unit src/test/portal/media/api/mediaApi.test.ts
npx vitest run --project ui src/test/portal/media/pages/MediaWorkspacePage.test.tsx src/test/app/router/PortalMediaRoute.test.tsx src/test/app/layout/AppSidebar.test.tsx
```

- [ ] **Step 3: Run FE gates**

```powershell
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 4: Validate Git state**

```powershell
git diff --check
git status --short
```

Expected: no conflict markers, no unintended files, and all implementation changes committed.
