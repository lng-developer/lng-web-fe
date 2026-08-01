# Portal Vendor Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lazy, searchable Vendor to Product to Cost Center management workspace with secure provider-credential editing.

**Architecture:** Keep Vendor API types and query keys isolated under `features/portal/vendors`. Render memoized branch components so each expansion owns its query and state; mount grouped centered editors only when opened. Use the existing Vendor backend without adding endpoints.

**Tech Stack:** React 19, TypeScript, TanStack Query 5, Ant Design 6, react-i18next, Vitest.

## Global Constraints

- Frontend repository: `C:\lng_system\lng-web\lng-web-fe\.worktrees\fe-refactor`.
- Backend repository is read-only for this plan; Vendor endpoints already exist.
- Do not add dependencies or consume Vendor Submission endpoints.
- Vendor permissions are global: `VENDORS:READ` and `VENDORS:WRITE`.
- Never render, log, persist, or return decrypted provider secrets.
- Child branches load only when expanded and a failed branch never collapses siblings.
- Tests live under `src/test`.
- Create one checkpoint commit after the complete Vendor module, only when requested.

---

### Task 1: Add Vendor route, navigation, API types, and query keys

**Files:**

- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/app/router/router.tsx`
- Create: `src/features/portal/vendors/api/vendorApi.ts`
- Create: `src/features/portal/vendors/api/vendorKeys.ts`
- Create: `src/test/portal/vendors/api/vendorApi.test.ts`
- Modify: `src/test/app/layout/appNavigation.test.ts`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Produces Vendor, VendorProduct, VendorCostCenter, VendorIntegrationConfig and input types matching `vendor.dto.js`.
- Produces list/detail/create/update functions for all existing Vendor endpoint groups.
- Produces `vendorKeys.vendors`, `vendorKeys.products`, `vendorKeys.costCenters`, `vendorKeys.integration`.

- [ ] **Step 1: Write contract tests**

Test representative calls for every endpoint group, including:

```ts
expect(apiClient.get).toHaveBeenCalledWith('/api/vendors/products', {
  params: { vendorId: 'vendor-1', page: 1, limit: 20, q: 'shirt' },
})
expect(apiClient.get).toHaveBeenCalledWith('/api/vendors/products/product-1/cost-centers', {
  params: { page: 1, limit: 20, q: 'XL' },
})
expect(apiClient.patch).toHaveBeenCalledWith('/api/vendors/vendor-1/integration', input)
```

Assert that `VendorIntegrationConfig` exposes configured booleans, status, expiry, and error but no plaintext secret property.

- [ ] **Step 2: Run tests and verify failure**

```powershell
npm test -- src/test/portal/vendors/api/vendorApi.test.ts src/test/app/layout/appNavigation.test.ts
```

Expected: failure because Vendor frontend modules and navigation do not exist.

- [ ] **Step 3: Implement API and query keys**

Use stable factories such as:

```ts
export const vendorKeys = {
  all: ['portal', 'vendors'] as const,
  vendors: (params: VendorListParams) => [...vendorKeys.all, 'list', params] as const,
  products: (vendorId: string, params: ProductListParams) =>
    [...vendorKeys.all, vendorId, 'products', params] as const,
  costCenters: (productId: string, params: CostCenterListParams) =>
    [...vendorKeys.all, 'products', productId, 'cost-centers', params] as const,
  integration: (vendorId: string) => [...vendorKeys.all, vendorId, 'integration'] as const,
}
```

Add Vendor under Portal Configuration only for `VENDORS:READ`, add its lazy route, and wrap it in `PortalPageBoundary`.

- [ ] **Step 4: Run focused tests**

Run the Step 2 command. Expected: pass.

---

### Task 2: Build memoized lazy Vendor branches

**Files:**

- Create: `src/features/portal/vendors/pages/VendorWorkspacePage.tsx`
- Create: `src/features/portal/vendors/pages/VendorTree.tsx`
- Create: `src/features/portal/vendors/pages/VendorBranch.tsx`
- Create: `src/features/portal/vendors/pages/VendorProductBranch.tsx`
- Create: `src/features/portal/vendors/pages/VendorWorkspacePage.module.scss`
- Create: `src/test/portal/vendors/pages/VendorTree.test.tsx`

**Interfaces:**

- Consumes API and query keys from Task 1.
- Produces editor commands `{ kind: 'vendor' | 'product' | 'costCenter' | 'integration'; ... }` for the page.
- Each branch receives stable primitive ids and memoized callbacks, not the entire page state.

- [ ] **Step 1: Write branch behavior tests**

Test that:

- initial render calls only the vendor list;
- opening one vendor calls only that vendor's product list;
- opening one product calls only that product's cost-center list;
- closing and reopening uses cached data;
- child error shows branch-local Retry;
- editing a node does not rerender unrelated memoized branches;
- clearing a branch search does not close other branches.

- [ ] **Step 2: Run the tree test and verify failure**

```powershell
npm test -- src/test/portal/vendors/pages/VendorTree.test.tsx
```

Expected: failure because Vendor tree components do not exist.

- [ ] **Step 3: Implement top-level and branch-local search**

Use shared `SearchInput` for vendor search. Put another shared SearchInput inside an expanded Vendor branch for products and inside an expanded Product branch for cost centers. Set child queries to `enabled: expanded`.

Use memoized components:

```tsx
export const VendorBranch = memo(function VendorBranch(props: VendorBranchProps) {
  const products = useQuery({
    queryKey: vendorKeys.products(props.vendorId, props.params),
    queryFn: () => listVendorProducts(props.params),
    enabled: props.expanded,
  })
  // render only this branch
})
```

Do not add a speculative generic tree abstraction in this task. Reuse Ant Design Collapse and extract a shared tree only after a second new consumer proves the same API.

- [ ] **Step 4: Implement semantic rows and actions**

Display the fields defined by the spec and use icon actions with Tooltip and `aria-label`. Gate mutation actions with `VENDORS:WRITE`. Keep selected and expanded keys local to the nearest branch.

- [ ] **Step 5: Run the tree test**

Run the Step 2 command. Expected: pass.

---

### Task 3: Add grouped Vendor, Product, and Cost Center editors

**Files:**

- Create: `src/features/portal/vendors/pages/VendorEditorModal.tsx`
- Create: `src/features/portal/vendors/pages/VendorProductEditorModal.tsx`
- Create: `src/features/portal/vendors/pages/VendorCostCenterEditorModal.tsx`
- Create: `src/test/portal/vendors/pages/VendorEditors.test.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes Task 1 create/update functions.
- Produces `onSaved(entity)` callbacks so the page can invalidate the precise branch.

- [ ] **Step 1: Write editor tests**

Cover immutable vendor code on update, required Vendor/Product/Cost Center fields from backend validators, grouped optional fields, minor-unit money mapping, field-preserving API errors, dirty-close warnings, and correct targeted invalidation.

- [ ] **Step 2: Run and verify failure**

```powershell
npm test -- src/test/portal/vendors/pages/VendorEditors.test.tsx
```

Expected: failure because editors do not exist.

- [ ] **Step 3: Implement centered grouped modals**

Mount only the active editor. Use wide desktop modals and responsive grids inside the modal, with normal Ant Design transitions. Keep optional values optional; do not invent required rules beyond backend validators.

For money fields, keep integer minor-unit values in submitted payloads and format the visible field with its currency label. Invalidate only the owning vendor/product/cost-center query key after success.

- [ ] **Step 4: Run editor tests**

Run the Step 2 command. Expected: pass.

---

### Task 4: Add secure provider configuration

**Files:**

- Create: `src/features/portal/vendors/pages/VendorIntegrationModal.tsx`
- Create: `src/test/portal/vendors/pages/VendorIntegrationModal.test.tsx`

**Interfaces:**

- Consumes `getVendorIntegrationConfig`, `updateVendorIntegrationConfig`, and `refreshVendorIntegrationCredential`.
- Produces only redacted/configured status to the page.

- [ ] **Step 1: Write credential safety tests**

Verify API response flags render, existing secrets are represented as configured, blank secret inputs are omitted from update payloads, new secret values are submitted only when entered, refresh requires confirmation, and errors never echo submitted secrets.

- [ ] **Step 2: Run and verify failure**

```powershell
npm test -- src/test/portal/vendors/pages/VendorIntegrationModal.test.tsx
```

Expected: failure because the integration modal does not exist.

- [ ] **Step 3: Implement auth-type-specific fields**

Render fields by auth type:

```ts
const fieldsByAuthType = {
  API_KEY: ['accessToken'],
  ACCESS_REFRESH: ['accessToken', 'refreshToken'],
  LOGIN_PASSWORD: ['username', 'password'],
} as const
```

Use password inputs with browser autocomplete appropriate to credential updates. Never initialize secret fields from GET data. Use action-local loading for save and refresh.

- [ ] **Step 4: Run credential tests**

Run the Step 2 command. Expected: pass.

---

### Task 5: Vendor checkpoint

**Files:**

- Verify all Vendor and navigation files from Tasks 1-4.

**Interfaces:**

- Produces a complete Vendor master-data workspace independent of Vendor Submission.

- [ ] **Step 1: Run quality gates**

```powershell
npm run lint
npm run typecheck
npm test -- src/test/portal/vendors src/test/app/layout/appNavigation.test.ts
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 2: Manual browser verification**

Check read-only/writer permissions, lazy branches, retry isolation, create/update flows, credential redaction, VI/EN, light/dark, and editor-open performance at `/portal/vendors`.

- [ ] **Step 3: Create one clean module commit only when requested**

```powershell
git add src/app/layout/appNavigation.ts src/app/router/router.tsx src/features/portal/vendors src/shared/i18n src/test/portal/vendors docs/superpowers
git commit -m "feat(portal): add vendor workspace"
```
