# Authenticated Media Consumption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route every protected MediaAsset preview and download through the authenticated frontend API client instead of raw relative `href` and `src` attributes.

**Architecture:** Add a small shared blob client plus a React hook that owns object-URL lifecycle. Existing feature pages call the shared download action or render an authenticated preview component; public external preview/customization URLs remain direct.

**Tech Stack:** React 19, TypeScript, Axios, Vitest, Testing Library, Ant Design

## Global Constraints

- Use the existing `apiClient`; do not add dependencies or duplicate API-base handling.
- Do not change upload endpoints or backend code.
- Do not replace public listing `previewUrl` or customization `secureUrl`.
- Revoke object URLs and abort obsolete preview requests.
- Preserve existing permissions, layouts, labels, and i18n behavior.
- Do not commit, merge, or push unless explicitly requested.

---

### Task 1: Shared authenticated blob client

**Files:**

- Create: `src/shared/media/mediaApi.ts`
- Create: `src/shared/media/index.ts`
- Test: `src/test/shared/media/mediaApi.test.ts`

**Interfaces:**

- Produces: `fetchMediaBlob(downloadUrl, signal?) => Promise<Blob>`.
- Produces: `downloadMediaAsset(downloadUrl, filename?) => Promise<void>`.

- [ ] **Step 1: Write failing client tests**

Mock `apiClient.get`, `URL.createObjectURL`, `URL.revokeObjectURL`, and the temporary anchor. Assert:

```ts
expect(apiClient.get).toHaveBeenCalledWith('/api/media/assets/a/download', {
  responseType: 'blob',
  signal,
})
expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
expect(anchor.click).toHaveBeenCalled()
expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:media')
```

Also assert an empty URL rejects before calling Axios.

- [ ] **Step 2: Verify RED**

Run `npx vitest run src/test/shared/media/mediaApi.test.ts`.
Expected: FAIL because `@/shared/media` does not exist.

- [ ] **Step 3: Implement the minimum shared client**

```ts
export async function fetchMediaBlob(downloadUrl: string, signal?: AbortSignal) {
  if (!downloadUrl.trim()) throw new Error('Media download URL is required')
  return (await apiClient.get(downloadUrl, { responseType: 'blob', signal })) as Blob
}

export async function downloadMediaAsset(downloadUrl: string, filename?: string) {
  const blobUrl = URL.createObjectURL(await fetchMediaBlob(downloadUrl))
  const anchor = document.createElement('a')
  try {
    anchor.href = blobUrl
    if (filename) anchor.download = filename
    document.body.append(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    URL.revokeObjectURL(blobUrl)
  }
}
```

Export both functions from `src/shared/media/index.ts`.

- [ ] **Step 4: Verify GREEN**

Run the focused shared test and `npm run lint -- --quiet` if supported; otherwise run ESLint on the changed files.

---

### Task 2: Authenticated preview hook and component

**Files:**

- Create: `src/shared/media/useAuthenticatedMediaUrl.ts`
- Create: `src/shared/media/AuthenticatedMediaImage.tsx`
- Modify: `src/shared/media/index.ts`
- Test: `src/test/shared/media/AuthenticatedMediaImage.test.tsx`

**Interfaces:**

- Consumes: `fetchMediaBlob(downloadUrl, signal)`.
- Produces: `useAuthenticatedMediaUrl(downloadUrl)`.
- Produces: `AuthenticatedMediaImage` with native image props plus `downloadUrl` and optional `fallback`.

- [ ] **Step 1: Write failing lifecycle tests**

Render with `downloadUrl="/api/media/assets/a/download"`; resolve a blob and assert `src="blob:preview-a"`. Rerender with another URL and unmount; assert the first request is aborted and each created object URL is revoked.

- [ ] **Step 2: Verify RED**

Run the focused UI test. Expected: FAIL because the hook/component does not exist.

- [ ] **Step 3: Implement lifecycle ownership**

Use one `useEffect` per URL. Create an `AbortController`, fetch the blob, create its URL, ignore `AbortError`, and in cleanup abort plus revoke the current object URL. The component renders the blob URL or the supplied fallback and passes through `alt`/class/style dimensions.

- [ ] **Step 4: Verify GREEN**

Run the focused component test and TypeScript lint for shared media files.

---

### Task 3: Design surfaces

**Files:**

- Modify: `src/features/portal/design/pages/DesignWorkbenchPage.tsx`
- Modify: `src/features/portal/design/pages/PsdFileWorkspacePage.tsx`
- Test: `src/test/portal/design/pages/DesignWorkbenchPage.test.tsx`
- Test: `src/test/portal/design/pages/PsdFileWorkspacePage.test.tsx`

**Interfaces:**

- Consumes: `downloadMediaAsset` and `AuthenticatedMediaImage`.

- [ ] **Step 1: Write failing consumer tests**

Mock `@/shared/media`. Click submission/PSD download buttons and assert:

```ts
expect(downloadMediaAsset).toHaveBeenCalledWith('/api/media/assets/asset-1/download', 'design.psd')
```

Assert the PSD thumbnail receives `downloadUrl` through `AuthenticatedMediaImage` rather than a native protected `src`.

- [ ] **Step 2: Verify RED**

Run both design page tests. Expected: FAIL because raw `href`/`src` remains.

- [ ] **Step 3: Replace protected navigation**

Remove protected `href` values. Use button `onClick={() => void downloadMediaAsset(url, originalFilename ?? undefined)}`; replace only MediaAsset preview images with `AuthenticatedMediaImage`.

- [ ] **Step 4: Verify GREEN**

Run both focused design suites.

---

### Task 4: Catalog, orders, and work-score downloads

**Files:**

- Modify: `src/features/portal/catalog/pages/CatalogListingWorkbenchPage.tsx`
- Modify: `src/features/portal/orders/pages/OrderInlinePanel.tsx`
- Modify: `src/features/portal/work-scores/pages/WorkScoreWorkbenchPage.tsx`
- Test: `src/test/portal/catalog/pages/CatalogListingWorkbenchPage.test.tsx`
- Test: `src/test/portal/orders/pages/OrderInlinePanel.test.tsx`
- Test: `src/test/portal/work-scores/pages/WorkScoreWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes: `downloadMediaAsset(downloadUrl, filename?)`.

- [ ] **Step 1: Write failing action tests**

For each feature, click the existing download action and assert the shared helper receives the protected URL. Catalog passes `originalFilename`; order/work-score omit the filename when their contract does not supply one. Assert public listing preview and customization links remain unchanged.

- [ ] **Step 2: Verify RED**

Run the three focused page suites. Expected: FAIL because buttons still use raw `href`.

- [ ] **Step 3: Replace protected hrefs**

Import the shared helper and use existing button click handlers. Preserve row-click `stopPropagation()` in work-score before starting the download.

- [ ] **Step 4: Verify GREEN**

Run the three focused page suites.

---

### Task 5: Production previews and downloads

**Files:**

- Modify: `src/features/portal/production/pages/ProductionWorkbenchPage.tsx`
- Create: `src/test/portal/production/pages/ProductionWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes: `AuthenticatedMediaImage` and `downloadMediaAsset`.

- [ ] **Step 1: Write failing production tests**

Mock production API data containing input/output MediaAsset download URLs. Assert protected preview images are represented by `AuthenticatedMediaImage`. Click the existing download control and assert `downloadMediaAsset` receives the selected URL.

- [ ] **Step 2: Verify RED**

Run the new production test. Expected: FAIL because native `img src` and raw download links remain.

- [ ] **Step 3: Migrate both preview locations**

Use `AuthenticatedMediaImage` in the slot cards and comparison inspector. Replace protected download links with button actions; leave zoom behavior and missing-file fallback unchanged.

- [ ] **Step 4: Verify GREEN**

Run the focused production suite.

---

### Task 6: Contract and repository verification

**Files:**

- Test only unless a verified regression needs the smallest root-cause correction.

- [ ] **Step 1: Confirm no raw protected navigation remains**

Run:

```powershell
rg -n 'href=\{.*(downloadUrl|assetDownloadUrl)|src=\{.*(inputAssetDownloadUrl|outputAssetDownloadUrl|downloadUrl)' src/features
```

Expected: no MediaAsset protected matches; public preview/customization uses remain documented.

- [ ] **Step 2: Run focused tests**

```powershell
npx vitest run src/test/shared/media src/test/portal/design src/test/portal/catalog/pages/CatalogListingWorkbenchPage.test.tsx src/test/portal/orders/pages/OrderInlinePanel.test.tsx src/test/portal/work-scores/pages/WorkScoreWorkbenchPage.test.tsx src/test/portal/production/pages/ProductionWorkbenchPage.test.tsx
```

- [ ] **Step 3: Run delivery checks**

```powershell
npm run lint
npm run build
```

- [ ] **Step 4: Inspect final scope**

```powershell
git diff --check
git diff -- src/shared/media src/features/portal/design src/features/portal/catalog/pages/CatalogListingWorkbenchPage.tsx src/features/portal/orders/pages/OrderInlinePanel.tsx src/features/portal/work-scores/pages/WorkScoreWorkbenchPage.tsx src/features/portal/production/pages/ProductionWorkbenchPage.tsx src/test
```

Confirm no dependency, env, auth-storage, upload-contract, backend, commit, or unrelated UI changes entered the diff.
