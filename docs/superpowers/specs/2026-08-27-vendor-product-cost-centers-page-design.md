# Vendor product cost centers detail page

## Goal

Replace the cost-center list drawer opened from **Manage cost centers** with a bookmarkable product detail route:

`/portal/vendors/products/:productId/cost-centers`

The page keeps the existing operator workflow: identify the product, search cost centers, paginate, add, import, and edit cost centers.

## Route and access

- Add a lazy portal route for the URL above.
- Guard it with the existing `VENDORS:READ` global permission boundary.
- The Products table navigates to the route instead of setting drawer state.
- A back action returns to `/portal/vendors`; the Products tab remains the entry point.

## Page composition

1. Product context header: back navigation, product name/code, vendor information, and status.
2. Cost-center toolbar: search, **Add cost center**, and **Import cost centers**. Write actions use the shared Vendor permission check.
3. `CoreDataTable`: existing Code, Name, SKU, Base cost, Status, and Actions columns; horizontal scroll and shared pagination/page-size control remain enabled.
4. Existing cost-center editor remains a Drawer for this increment. Its save invalidates the product cost-center query and the parent product list.
5. Existing CSV import modal moves with the page, preserving validation, preview, feedback, and invalidation behavior.

## Data flow

- Resolve `productId` from React Router params.
- Fetch the product with the existing vendor API adapter, then query its cost centers using route-local search, page, and page-size state.
- Invalid/missing products render the standard error state rather than opening an empty workspace.
- Query keys continue to use `vendorKeys`, so editor/import updates refresh both the detail page and Products list.

## Migration

- Remove cost-center drawer state, query, and rendering from `VendorWorkspacePage`.
- Retire `VendorWorkspaceCostCenterDrawer`; its table behavior is moved into the dedicated page rather than duplicated.
- Keep `VendorCostCenterEditorModal` unchanged for now.

## Verification

- Route/page tests: render by product ID, product context, pagination, and back navigation.
- Products tab test: Manage cost centers navigates to the new route.
- Existing editor/import tests remain valid; run focused Vendor tests, lint, and production build.
