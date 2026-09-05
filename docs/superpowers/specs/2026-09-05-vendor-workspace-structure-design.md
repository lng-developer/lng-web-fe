# Vendor Workspace Structure Design

## Goal

Refactor the vendor UI into colocated UI-and-logic units while preserving the existing routes, visual output, API calls, permissions, i18n usage, and operator workflows.

## Scope

- Reorganize source and vendor tests only.
- Keep the existing `vendors/api/vendorApi.ts` and `vendors/api/vendorKeys.ts` public API unchanged in this refactor.
- Do not change backend contracts, route paths, user-visible copy, or feature behavior.
- Do not modify the current unrelated working-tree changes under integrations, orders, shared UI, or i18n.

## Directory Design

`pages/` remains the route surface. Each route page becomes a directory whose `index.tsx` is the UI composition entry point; its adjacent `use*.tsx` owns page-specific orchestration.

```text
src/features/portal/vendors/
  api/
    vendorApi.ts
    vendorKeys.ts
  pages/
    VendorWorkspacePage/
      index.tsx
      useVendorWorkspace.tsx
      VendorWorkspacePage.module.scss
      VendorTabs/
        index.tsx
        useVendorTabs.tsx
      VendorTree/
        index.tsx
        useVendorTree.tsx
        VendorBranch.tsx
        VendorProductBranch.tsx
      VendorsTab/
        index.tsx
        useVendorsTab.tsx
      ProductsTab/
        index.tsx
        useProductsTab.tsx
        productMocks.ts
      MigrationTab/
        index.tsx
        useMigrationTab.tsx
      CostCenterDrawer/
        index.tsx
        useCostCenterDrawer.tsx
      dialogs/
        VendorEditorDialog/
          index.tsx
          useVendorEditorDialog.tsx
        VendorProductEditorDialog/
          index.tsx
          useVendorProductEditorDialog.tsx
        VendorCostCenterEditorDialog/
          index.tsx
          useVendorCostCenterEditorDialog.tsx
        VendorIntegrationDialog/
          index.tsx
          useVendorIntegrationDialog.tsx
    VendorProductCostCentersPage/
      index.tsx
      useVendorProductCostCentersPage.tsx
    VendorCostCenterEditorPage/
      index.tsx
      useVendorCostCenterEditorPage.tsx
```

## Boundaries

- `index.tsx` renders the unit and is limited to presentation composition, props, and event wiring. It must not contain lengthy query/mutation/form/import orchestration.
- `use*.tsx` owns the state and side effects exclusive to its colocated UI unit. It exposes a small view model consumed by its sibling `index.tsx`.
- Leaf components with no meaningful local orchestration, such as tree branches, remain colocated next to their parent rather than receiving artificial hooks.
- Dialog folders own their own form state and mutation behavior, preserving their existing exported component interfaces where practical.
- `VendorWorkspacePage/index.tsx` is the sole route entry and composes tabs, dialogs, and the workspace hook. It owns no detailed tab UI.
- The two existing standalone route pages move into their own page directories and use dedicated page hooks.

## Import and Route Compatibility

- Update router lazy imports to target each page directory's `index.tsx`.
- Update source and tests to import from the new directory paths.
- Preserve the default export of `VendorWorkspacePage` and named exports used by routes/tests, unless every local consumer is migrated in the same change.
- Do not introduce barrel files outside the local `index.tsx` component entries.

## Testing and Verification

- Move vendor tests to mirror the new page/unit paths under `src/test/portal/vendors/`.
- Retain behavioral tests for dialogs, tree expansion/loading, tabs, cost center pages, migration review, and the vendor API.
- Replace source-path assertions only where relocation changes the path; preserve assertions that protect intended behavior.
- Run the vendor test suite, then `npm run lint`, then `npm run build`.
