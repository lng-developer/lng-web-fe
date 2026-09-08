# Vendor Workspace Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tái cấu trúc vendor workspace theo các UI unit colocated (`index.tsx` + `useXxx.tsx`) mà không thay đổi hành vi.

**Architecture:** `pages/` vẫn là bề mặt route. Mỗi route page là một thư mục, trong đó `index.tsx` chỉ ghép UI còn hook liền kề cung cấp state, query/mutation và callback cho UI đó. Các tab, tree, drawer và dialog của workspace là những unit con có `index.tsx` và hook riêng khi có orchestration thực sự.

**Tech Stack:** React 19, TypeScript, React Router 7, TanStack Query 5, Ant Design 6, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-05-vendor-workspace-structure-design.md`

## Global Constraints

- Giữ nguyên backend contract, route path, API calls, quyền truy cập, i18n, copy hiển thị và hành vi UI.
- Không thêm dependency hoặc tạo API client/endpoint mới; tiếp tục dùng `vendorApi.ts` và `vendorKeys.ts`.
- Không thay đổi các chỉnh sửa chưa commit thuộc integrations, orders, shared UI hoặc i18n.
- `index.tsx` chỉ render/composition; state và side effect riêng của unit chuyển sang `use*.tsx` cùng thư mục.
- Test vendor mirror theo cấu trúc source mới bên dưới `src/test/portal/vendors/`.

---

## File Structure

```text
src/features/portal/vendors/pages/
  VendorWorkspacePage/
    index.tsx
    useVendorWorkspace.tsx
    VendorWorkspacePage.module.scss
    VendorTabs/{index.tsx,useVendorTabs.tsx}
    VendorTree/{index.tsx,useVendorTree.tsx,VendorBranch.tsx,VendorProductBranch.tsx}
    VendorsTab/{index.tsx,useVendorsTab.tsx}
    ProductsTab/{index.tsx,useProductsTab.tsx,productMocks.ts}
    MigrationTab/{index.tsx,useMigrationTab.tsx}
    CostCenterDrawer/{index.tsx,useCostCenterDrawer.tsx}
    dialogs/
      VendorEditorDialog/{index.tsx,useVendorEditorDialog.tsx}
      VendorProductEditorDialog/{index.tsx,useVendorProductEditorDialog.tsx}
      VendorCostCenterEditorDialog/{index.tsx,useVendorCostCenterEditorDialog.tsx}
      VendorIntegrationDialog/{index.tsx,useVendorIntegrationDialog.tsx}
  VendorProductCostCentersPage/{index.tsx,useVendorProductCostCentersPage.tsx}
  VendorCostCenterEditorPage/{index.tsx,useVendorCostCenterEditorPage.tsx}
```

`src/app/router/router.tsx` imports the directory entries. Existing test files move to matching folders, and only their imports/raw-module paths change unless they are extended to assert the new boundary.

### Task 1: Establish route-page directories and preserve route contracts

**Files:**

- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/index.tsx`
- Create: `src/features/portal/vendors/pages/VendorProductCostCentersPage/index.tsx`
- Create: `src/features/portal/vendors/pages/VendorCostCenterEditorPage/index.tsx`
- Move: `src/features/portal/vendors/pages/VendorWorkspacePage.tsx`
- Move: `src/features/portal/vendors/pages/VendorWorkspacePage.module.scss`
- Move: `src/features/portal/vendors/pages/VendorProductCostCentersPage.tsx`
- Move: `src/features/portal/vendors/pages/VendorCostCenterEditorPage.tsx`
- Modify: `src/app/router/router.tsx`
- Modify: `src/test/app/router/PortalVendorRoute.test.tsx`

**Interfaces:**

- Consumes: existing named exports `VendorWorkspacePage`, `VendorProductCostCentersPage`, `VendorCostCenterEditorPage`.
- Produces: the same named exports from directory entry modules, resolving with the existing imports `@/features/portal/vendors/pages/<PageName>`.

- [ ] **Step 1: Update the route-contract test first**

Change the mock to continue exercising the directory import and add coverage for all three named route-page exports:

```tsx
vi.mock('@/features/portal/vendors/pages/VendorWorkspacePage', () => ({
  VendorWorkspacePage: () => <div>Vendor workspace</div>,
}))
```

- [ ] **Step 2: Run the route test to confirm the pre-move baseline**

Run: `npm run test:unit -- src/test/app/router/PortalVendorRoute.test.tsx`

Expected: PASS before moving files; this establishes the import contract that must survive the refactor.

- [ ] **Step 3: Move each route page into a directory entry**

Move the implementation and associated style into the listed page directories. Preserve named exports and default export for the workspace entry:

```tsx
export const VendorWorkspacePage = () => {
  // existing workspace UI composition, reduced in later tasks
}

export default VendorWorkspacePage
```

Do not create forwarding files at the former `*.tsx` paths: TypeScript/Vite directory resolution must resolve `@/features/portal/vendors/pages/VendorWorkspacePage` to `index.tsx`.

- [ ] **Step 4: Update router lazy imports**

Keep each import expression textually stable while resolving the new entry:

```tsx
import('@/features/portal/vendors/pages/VendorWorkspacePage')
```

Do the same for `VendorProductCostCentersPage` and `VendorCostCenterEditorPage`; their named destructuring remains unchanged.

- [ ] **Step 5: Run the focused route test and typecheck**

Run: `npm run test:unit -- src/test/app/router/PortalVendorRoute.test.tsx && npm run typecheck`

Expected: PASS with all three routes resolving from their page directories.

- [ ] **Step 6: Commit the route-page boundary**

```bash
git add src/features/portal/vendors/pages src/app/router/router.tsx src/test/app/router/PortalVendorRoute.test.tsx
git commit -m "refactor(vendors): group route pages into directories"
```

### Task 2: Extract workspace orchestration and tabs into colocated units

**Files:**

- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/useVendorWorkspace.tsx`
- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/VendorTabs/index.tsx`
- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/VendorTabs/useVendorTabs.tsx`
- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/VendorsTab/index.tsx`
- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/VendorsTab/useVendorsTab.tsx`
- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/ProductsTab/index.tsx`
- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/ProductsTab/useProductsTab.tsx`
- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/ProductsTab/productMocks.ts`
- Move: `VendorWorkspaceVendorsTabPage.tsx`, `VendorWorkspaceProductsTabPage.tsx`, `vendorProductTabMocks.ts`
- Modify: `VendorWorkspacePage/index.tsx`
- Move/modify tests: `VendorWorkspacePage.test.tsx`, `VendorWorkspaceProductsTabPage.test.tsx`, `VendorWorkspaceVendorsTabPage.source.test.ts`, `VendorWorkspaceResponsiveTabs.source.test.ts`

**Interfaces:**

- Consumes: `vendorApi` functions, `vendorKeys`, catalog API, `Vendor`/`VendorProduct` types and existing page callbacks.
- Produces: `useVendorWorkspace()` view model for `VendorWorkspacePage/index.tsx`; `VendorTabs`, `VendorsTab`, and `ProductsTab` presentational entries with their existing props retained or replaced by typed local view-model props in the same change.

- [ ] **Step 1: Add boundary tests before extraction**

Update the workspace source test to import the new raw entry and assert that the entry consumes its hook rather than direct TanStack Query APIs:

```ts
import workspaceSource from '@/features/portal/vendors/pages/VendorWorkspacePage/index.tsx?raw'

expect(workspaceSource).toContain('useVendorWorkspace')
expect(workspaceSource).not.toContain('useQuery(')
```

Update tab tests to import `VendorsTab/index.tsx` and `ProductsTab/index.tsx` paths.

- [ ] **Step 2: Run these tests and observe the intended red failure**

Run: `npm run test:unit -- src/test/portal/vendors/pages/VendorWorkspacePage.test.tsx src/test/portal/vendors/pages/VendorWorkspaceVendorsTabPage.source.test.ts src/test/portal/vendors/pages/VendorWorkspaceProductsTabPage.test.tsx`

Expected: FAIL because the new directories and hook imports do not yet exist.

- [ ] **Step 3: Create the workspace hook and return a typed view model**

Move current workspace query, mutation, filter, selection, import, dialog and active-tab orchestration into `useVendorWorkspace.tsx`. The hook returns data and callbacks currently supplied to tabs/dialogs:

```tsx
export function useVendorWorkspace() {
  // current useState, useQuery, useMutation and handlers
  return {
    activeTab,
    vendors,
    products,
    migrationReview,
    dialogs,
    actions,
  }
}
```

Do not alter query keys, mutation functions, toast messages, permission checks or invalidation behavior.

- [ ] **Step 4: Move tab UI and add local hooks only for local state/derivations**

`VendorsTab/index.tsx` and `ProductsTab/index.tsx` receive data/callbacks via props. Put their UI-only filtering/derived display logic in their adjacent hooks:

```tsx
export function useProductsTab(products: VendorProduct[] | undefined) {
  return { visibleProducts: products ?? [] }
}
```

Move mock data to `ProductsTab/productMocks.ts`. `VendorTabs` owns tab presentation/accessibility state and calls `useVendorTabs` only if it has local tab derivations.

- [ ] **Step 5: Reduce the route entry to composition**

The workspace entry follows this shape:

```tsx
export const VendorWorkspacePage = () => {
  const workspace = useVendorWorkspace()
  return <VendorTabs {...workspace} />
}
```

Render dialogs from the entry with view-model props, but do not reintroduce their implementation or mutation code there.

- [ ] **Step 6: Run tab/workspace tests**

Run: `npm run test:unit -- src/test/portal/vendors/pages/VendorWorkspacePage.test.tsx src/test/portal/vendors/pages/VendorWorkspaceProductsTabPage.test.tsx src/test/portal/vendors/pages/VendorWorkspaceVendorsTabPage.source.test.ts src/test/portal/vendors/pages/VendorWorkspaceResponsiveTabs.source.test.ts`

Expected: PASS with tabs behaving exactly as before and the entry free of direct query orchestration.

- [ ] **Step 7: Commit workspace and tab extraction**

```bash
git add src/features/portal/vendors/pages/VendorWorkspacePage src/test/portal/vendors/pages
git commit -m "refactor(vendors): colocate workspace tabs and logic"
```

### Task 3: Colocate tree and cost-center drawer units

**Files:**

- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/VendorTree/index.tsx`
- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/VendorTree/useVendorTree.tsx`
- Move: `VendorTree.tsx`, `VendorBranch.tsx`, `VendorProductBranch.tsx`
- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/CostCenterDrawer/index.tsx`
- Create: `src/features/portal/vendors/pages/VendorWorkspacePage/CostCenterDrawer/useCostCenterDrawer.tsx`
- Move: `VendorWorkspaceCostCenterDrawer.tsx`
- Modify: workspace, products tab and relevant relative imports
- Move/modify tests: `VendorTree.test.tsx`, `VendorWorkspaceCostCenterDrawer.test.tsx`

**Interfaces:**

- Consumes: existing `VendorEditorCommand`, vendor/product/cost-center API types and cost-center drawer callbacks.
- Produces: named `VendorTree` and `VendorWorkspaceCostCenterDrawer` exports from their new directory entries.

- [ ] **Step 1: Update imports in tree and drawer tests**

Point tests to the new public entries:

```ts
import { VendorTree } from '@/features/portal/vendors/pages/VendorWorkspacePage/VendorTree'
import { VendorWorkspaceCostCenterDrawer } from '@/features/portal/vendors/pages/VendorWorkspacePage/CostCenterDrawer'
```

- [ ] **Step 2: Run tests to verify they fail before the move**

Run: `npm run test:unit -- src/test/portal/vendors/pages/VendorTree.test.tsx src/test/portal/vendors/pages/VendorWorkspaceCostCenterDrawer.test.tsx`

Expected: FAIL with module resolution errors for the new paths.

- [ ] **Step 3: Extract each unit's local orchestration**

Move tree expanded-node, paging and lazy-load behavior to `useVendorTree.tsx`; preserve its callback surface:

```tsx
export function useVendorTree(onEdit: (command: VendorEditorCommand) => void) {
  return { roots, onEdit, toggleVendor, toggleProduct }
}
```

Move drawer-only open/selection/derived cost-center presentation logic to `useCostCenterDrawer.tsx`. Do not move commands coordinated by the workspace page out of `useVendorWorkspace`.

- [ ] **Step 4: Render from the directory entries and colocate leaf branches**

`VendorTree/index.tsx` renders hook output and imports its two branch components from the same folder. `CostCenterDrawer/index.tsx` renders drawer markup from its hook view model. Update style imports to `../../VendorWorkspacePage.module.scss` or the appropriate sibling-relative path after moving files.

- [ ] **Step 5: Run focused behavioral tests**

Run: `npm run test:unit -- src/test/portal/vendors/pages/VendorTree.test.tsx src/test/portal/vendors/pages/VendorWorkspaceCostCenterDrawer.test.tsx`

Expected: PASS; tree still lazy-loads products/cost centers and drawer callbacks remain unchanged.

- [ ] **Step 6: Commit tree and drawer units**

```bash
git add src/features/portal/vendors/pages/VendorWorkspacePage src/test/portal/vendors/pages
git commit -m "refactor(vendors): colocate tree and cost center drawer"
```

### Task 4: Colocate migration and dialog UI/logic

**Files:**

- Create/move: `VendorWorkspacePage/MigrationTab/{index.tsx,useMigrationTab.tsx}`
- Create/move: `VendorWorkspacePage/dialogs/VendorEditorDialog/{index.tsx,useVendorEditorDialog.tsx}`
- Create/move: `VendorWorkspacePage/dialogs/VendorProductEditorDialog/{index.tsx,useVendorProductEditorDialog.tsx}`
- Create/move: `VendorWorkspacePage/dialogs/VendorCostCenterEditorDialog/{index.tsx,useVendorCostCenterEditorDialog.tsx}`
- Create/move: `VendorWorkspacePage/dialogs/VendorIntegrationDialog/{index.tsx,useVendorIntegrationDialog.tsx}`
- Move: current `VendorMigrationTabPage.tsx`, four modal files and `vendorEditorHelpers.ts`
- Modify: `VendorWorkspacePage/index.tsx`, standalone page imports and tests
- Move/modify tests: `VendorMigrationTabPage.test.tsx`, `VendorEditors.test.tsx`, `VendorIntegrationModal.test.tsx`, `vendorEditorHelpers.test.ts`

**Interfaces:**

- Consumes: current modal props, vendor API functions and i18n keys.
- Produces: current named editor/integration component exports from their new directories plus local form/mutation hooks.

- [ ] **Step 1: Change dialog and migration test imports to future paths**

For example:

```ts
import { VendorProductEditorModal } from '@/features/portal/vendors/pages/VendorWorkspacePage/dialogs/VendorProductEditorDialog'
```

Preserve existing test assertions for required form data, credential redaction and mutation payloads.

- [ ] **Step 2: Run focused tests to validate red state**

Run: `npm run test:unit -- src/test/portal/vendors/pages/VendorEditors.test.tsx src/test/portal/vendors/pages/VendorIntegrationModal.test.tsx src/test/portal/vendors/pages/VendorMigrationTabPage.test.tsx`

Expected: FAIL only because the future module paths do not exist.

- [ ] **Step 3: Move migration behavior into its local hook**

Move migration-specific filter, selection and bulk-assign derivations from the current tab into `useMigrationTab.tsx`:

```tsx
export function useMigrationTab(props: VendorMigrationTabProps) {
  return { columns, selectedRowKeys, onAssignProductTypeGroup }
}
```

The parent workspace hook remains responsible for the query/mutation it already owns; the tab hook is UI orchestration only.

- [ ] **Step 4: Move dialog form/mutation logic into dialog hooks**

Keep every existing dialog's component prop contract. Extract implementation into the local hook so its entry is presentation-led:

```tsx
export function useVendorProductEditorDialog(props: VendorProductEditorModalProps) {
  return { form, isSaving, onSubmit }
}
```

Preserve current validation, `onSaved`/`onCancel` invocation, success/error feedback, and no-secret integration config behavior.

- [ ] **Step 5: Update all consumers and raw-source tests**

Update workspace and standalone cost-center page imports to the new dialog entries. Change raw imports in source tests to `index.tsx?raw` and hook paths when asserting the new architecture.

- [ ] **Step 6: Run dialog and migration tests**

Run: `npm run test:unit -- src/test/portal/vendors/pages/VendorEditors.test.tsx src/test/portal/vendors/pages/VendorIntegrationModal.test.tsx src/test/portal/vendors/pages/VendorMigrationTabPage.test.tsx src/test/portal/vendors/pages/vendorEditorHelpers.test.ts`

Expected: PASS with existing behavior preserved.

- [ ] **Step 7: Commit dialog and migration extraction**

```bash
git add src/features/portal/vendors/pages/VendorWorkspacePage src/test/portal/vendors/pages
git commit -m "refactor(vendors): colocate dialogs and migration logic"
```

### Task 5: Split standalone-page orchestration, relocate tests, and verify

**Files:**

- Create: `VendorProductCostCentersPage/useVendorProductCostCentersPage.tsx`
- Create: `VendorCostCenterEditorPage/useVendorCostCenterEditorPage.tsx`
- Modify: their `index.tsx` entries
- Move/modify: all vendor test paths under `src/test/portal/vendors/` to match final source folders
- Modify: source-path assertions in `VendorProductCostCentersPage.source.test.ts`, `VendorWorkspacePageStyles.source.test.ts`, and affected raw imports
- Modify: `src/app/router/router.tsx` only if TypeScript/Vite resolution requires explicit `/index` (otherwise retain directory imports)

**Interfaces:**

- Consumes: route params/location/navigation and `vendorApi`/`vendorKeys` functions.
- Produces: dedicated hook view models; unchanged named page exports for router consumers.

- [ ] **Step 1: Add assertions that the standalone page entries use their hooks**

```ts
import source from '@/features/portal/vendors/pages/VendorProductCostCentersPage/index.tsx?raw'

expect(source).toContain('useVendorProductCostCentersPage')
expect(source).not.toContain('useQuery(')
```

Repeat for `VendorCostCenterEditorPage/index.tsx`.

- [ ] **Step 2: Run source and page tests to confirm red state**

Run: `npm run test:unit -- src/test/portal/vendors/pages/VendorProductCostCentersPage.source.test.ts src/test/portal/vendors/pages/VendorWorkspacePageStyles.source.test.ts`

Expected: FAIL until the hooks are created and raw imports are corrected.

- [ ] **Step 3: Extract standalone page hooks**

Move params, query, local selection/edit state and callbacks into the corresponding hook. Keep entries minimal:

```tsx
export function VendorProductCostCentersPage() {
  const page = useVendorProductCostCentersPage()
  return <CostCentersTable {...page} />
}
```

The resulting render must preserve error/loading output, permission checks, navigation paths and modal invocation.

- [ ] **Step 4: Move test files to mirror final source folders**

Place workspace-specific tests beneath `src/test/portal/vendors/pages/VendorWorkspacePage/`, and standalone-page tests in `VendorProductCostCentersPage/` or `VendorCostCenterEditorPage/`. Keep API tests at `src/test/portal/vendors/api/`.

- [ ] **Step 5: Run the complete vendor test suite**

Run: `npm run test:unit -- src/test/portal/vendors`

Expected: PASS with no import to a removed flat page module.

- [ ] **Step 6: Run lint and production build**

Run: `npm run lint && npm run build`

Expected: both commands exit 0.

- [ ] **Step 7: Inspect the final diff and commit**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; no unrelated files staged.

```bash
git add src/features/portal/vendors src/test/portal/vendors src/test/app/router/PortalVendorRoute.test.tsx src/app/router/router.tsx
git commit -m "refactor(vendors): organize vendor UI by colocated units"
```
