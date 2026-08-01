# Portal Shop Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Portal core and a production-ready Shop workspace backed only by the existing Shop API.

**Architecture:** Extend the permission-derived shell with a Portal core, then add a lazy Shop route. Keep API mapping, query keys, the editor, and the table inside `features/portal/shops`; reuse shared DataTable, SearchInput, StatusTag, PermissionGate, feedback toast, and Ant Design forms.

**Tech Stack:** React 19, TypeScript, React Router 7, TanStack Query 5, Ant Design 6, react-i18next, Vitest.

## Global Constraints

- Frontend repository: `C:\lng_system\lng-web\lng-web-fe\.worktrees\fe-refactor`.
- Backend repository is read-only for this plan; Shop endpoints already exist.
- Do not add dependencies.
- Use backend permissions and scoped permissions, never role names.
- Add every visible string to both Vietnamese and English locale files.
- Keep tests under `src/test`, never beside `.tsx` source files.
- Create one checkpoint commit after the complete Shop module, not one commit per small edit.

---

### Task 1: Add Portal navigation and permission boundary

**Files:**

- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/app/router/router.tsx`
- Create: `src/features/portal/components/PortalPageBoundary.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Modify: `src/test/app/layout/appNavigation.test.ts`
- Create: `src/test/portal/components/PortalPageBoundary.test.tsx`

**Interfaces:**

- Produces: `AppCoreKey = 'portal' | 'hr' | 'system'`.
- Produces: `PortalPageBoundary({ anyOf, children })` using the effective permission list already stored by auth session restoration.
- Produces route: `/portal/shops` loaded dynamically.

- [ ] **Step 1: Write navigation tests**

Add expectations equivalent to:

```ts
expect(getAvailableCores(account(['SHOPS:READ'])).map(({ key }) => key)).toEqual(['portal'])
expect(getContextNavigation('portal', account(['SHOPS:READ']))).toMatchObject([
  { key: 'configuration', items: [{ key: 'shops', path: '/portal/shops' }] },
])
expect(getCoreForPath('/portal/shops')).toBe('portal')
```

Test that a user with no Portal read permission does not receive the Portal core. Test `PortalPageBoundary` renders children for `SHOPS:READ` and an Ant Design 403 Result otherwise.

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```powershell
npm test -- src/test/app/layout/appNavigation.test.ts src/test/portal/components/PortalPageBoundary.test.tsx
```

Expected: failure because `portal` and `PortalPageBoundary` do not exist.

- [ ] **Step 3: Implement the minimal Portal shell contract**

Add Portal handling to navigation without exposing future routes:

```ts
if (core === 'portal') {
  return [
    {
      key: 'configuration',
      labelKey: 'shell.groups.portalConfiguration',
      items: permissions.has('SHOPS:READ')
        ? [{ key: 'shops', path: '/portal/shops', labelKey: 'shell.navigation.shops' }]
        : [],
    },
  ].filter(({ items }) => items.length)
}
```

Map every `/portal` path to the Portal core. Add the lazy Shop page route and wrap page content with:

```tsx
<PortalPageBoundary anyOf={['SHOPS:READ']}>{children}</PortalPageBoundary>
```

The boundary must not call an API; it reads `getPermissions()` after the parent workspace loader has restored the session.

- [ ] **Step 4: Run focused tests**

Run the Step 2 command. Expected: all tests pass.

---

### Task 2: Implement the Shop API contract and query keys

**Files:**

- Create: `src/features/portal/shops/api/shopApi.ts`
- Create: `src/features/portal/shops/api/shopKeys.ts`
- Create: `src/test/portal/shops/api/shopApi.test.ts`

**Interfaces:**

- Produces `ShopStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'`.
- Produces `Shop`, `ShopListParams`, `PaginatedShops`, `CreateShopInput`.
- Produces `listShops`, `createShop`, `getShop`, `updateShopStatus`.
- Produces `shopKeys.all`, `shopKeys.list(params)`, `shopKeys.detail(id)`.

- [ ] **Step 1: Write API mapping tests**

Verify these calls exactly:

```ts
await listShops({ page: 2, limit: 20, search: 'football', status: 'ACTIVE' })
expect(apiClient.get).toHaveBeenCalledWith('/api/shops', { params: expectedParams })

await createShop({ name: 'Football US', currency: 'USD' })
expect(apiClient.post).toHaveBeenCalledWith('/api/shops', expectedInput)

await updateShopStatus('shop-1', 'SUSPENDED')
expect(apiClient.patch).toHaveBeenCalledWith('/api/shops/shop-1/status', {
  status: 'SUSPENDED',
})
```

- [ ] **Step 2: Run the API test and verify failure**

Run:

```powershell
npm test -- src/test/portal/shops/api/shopApi.test.ts
```

Expected: failure because the Shop API module does not exist.

- [ ] **Step 3: Implement types and API functions**

Use the shared API client and unwrap `{ success, data }` exactly once in the API module. Define stable query keys:

```ts
export const shopKeys = {
  all: ['portal', 'shops'] as const,
  list: (params: ShopListParams) => [...shopKeys.all, 'list', params] as const,
  detail: (shopId: string) => [...shopKeys.all, 'detail', shopId] as const,
}
```

Omit empty search/status values from request params so URL state and cache keys remain deterministic.

- [ ] **Step 4: Run the API test**

Run the Step 2 command. Expected: pass.

---

### Task 3: Build the Shop DataTable and centered editor

**Files:**

- Create: `src/features/portal/shops/pages/ShopWorkspacePage.tsx`
- Create: `src/features/portal/shops/pages/ShopWorkspacePage.module.scss`
- Create: `src/features/portal/shops/pages/ShopEditorModal.tsx`
- Create: `src/test/portal/shops/pages/ShopWorkspacePage.test.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes: Shop API and `shopKeys` from Task 2.
- Consumes: `DataTable`, `SearchInput`, `FilterBar`, `StatusTag`, `FeedbackAlert`, `FormActions`, `useFeedbackToast`.
- Produces: the lazy route component exported as `ShopWorkspacePage`.

- [ ] **Step 1: Write page interaction tests**

Cover:

- search text updates immediately but the list query changes after 200 ms;
- status and page are read from and written to URL search params;
- read-only users do not see create or status-save actions;
- clicking a row opens the status editor;
- create submits only `name` and `currency`;
- update submits only `status`;
- failed list renders persistent inline Retry;
- failed mutation keeps form values and shows the product error toast.

- [ ] **Step 2: Run the page test and verify failure**

Run:

```powershell
npm test -- src/test/portal/shops/pages/ShopWorkspacePage.test.tsx
```

Expected: failure because the page and editor do not exist.

- [ ] **Step 3: Implement server-driven page state**

Build `ShopListParams` from `useSearchParams` and call:

```ts
useQuery({
  queryKey: shopKeys.list(params),
  queryFn: () => listShops(params),
})
```

Use DataTable columns for name, currency, semantic status, updated time, and one accessible edit/status icon. Do not add metric cards.

- [ ] **Step 4: Implement the editor and targeted invalidation**

The create form requires `name`; currency defaults to `USD`. The update form shows name and currency read-only and allows only status changes. On success:

```ts
await queryClient.invalidateQueries({ queryKey: shopKeys.all })
```

Restore Ant Design modal transitions; do not set empty transition names. Use `Form.isFieldsTouched()` to trigger an unsaved-change confirmation before closing a dirty editor.

- [ ] **Step 5: Run Shop tests**

Run:

```powershell
npm test -- src/test/portal/shops src/test/app/layout/appNavigation.test.ts src/test/portal/components/PortalPageBoundary.test.tsx
```

Expected: pass.

---

### Task 4: Shop checkpoint

**Files:**

- Verify all files changed in Tasks 1-3.

**Interfaces:**

- Produces a complete, independently usable Shop workspace.

- [ ] **Step 1: Run narrow quality gates**

```powershell
npm run lint
npm run typecheck
npm test -- src/test/portal/shops src/test/portal/components src/test/app/layout/appNavigation.test.ts
npm run build
```

Expected: every command exits 0.

- [ ] **Step 2: Perform manual browser checks**

Verify read-only, writer, empty, loading, error, create, status update, URL refresh, VI, EN, light, and dark states at `/portal/shops`.

- [ ] **Step 3: Create one clean module commit only when requested**

```powershell
git add src/app/layout/appNavigation.ts src/app/router/router.tsx src/features/portal src/shared/i18n src/test/portal src/test/app/layout/appNavigation.test.ts docs/superpowers
git commit -m "feat(portal): add shop workspace"
```
