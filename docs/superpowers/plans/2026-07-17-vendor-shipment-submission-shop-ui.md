# Vendor Submission, Shipment, Vendor, Shop UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build real operator UI for `vendorSubmission`, `shipment`, `vendor`, and `shop` around the backend POD flow: Production ready -> vendor submission -> vendor tracking -> shipment.

**Architecture:** Reuse the existing operations layout (`src/components/operations/*`) and existing endpoint constants. Add the smallest missing API adapters and pages; do not keep `ApiWorkflowPage` as the operator UI for shipping/vendor submissions.

**Tech Stack:** React, Vite, MUI, TanStack Query patterns already used in `src/features/*/api`, existing `apiClient`, existing `ENDPOINTS`.

## Global Constraints

- No new dependency.
- Use `ENDPOINTS` and `apiClient`; no hard-coded URL strings inside pages.
- Every operator list gets an ID search field when BE supports it.
- Do not make FE call N detail requests per row to derive counts or display IDs.
- Keep `pod-workbench` as navigation/overview only, not the main workflow surface.
- Do not replace existing `VendorListPage` and `VendorProductsPage`; polish them in place.
- Direct vendor/shipment actions must follow BE state gates, not optimistic local status guesses.
- Worktree is dirty; keep diffs scoped and do not revert unrelated files.

---

## File Structure

- Modify `src/services/endpoints.js` only if endpoint names are missing.
- Modify `src/services/endpoints.contract.test.js` for endpoint contract coverage.
- Create `src/features/vendor-submissions/api/vendorSubmissions.keys.js`.
- Create `src/features/vendor-submissions/api/vendorSubmissions.queries.js`.
- Create `src/features/vendor-submissions/api/vendorSubmissions.mutations.js`.
- Create `src/features/vendor-submissions/utils/vendorSubmissionsApi.js`.
- Create `src/features/vendor-submissions/utils/vendorSubmissionsApi.test.js`.
- Create `src/features/vendor-submissions/pages/VendorSubmissionsPage.jsx`.
- Create `src/features/vendor-submissions/pages/vendorSubmissionsPageComposition.test.js`.
- Create `src/features/shipments/api/shipments.keys.js`.
- Create `src/features/shipments/api/shipments.queries.js`.
- Create `src/features/shipments/api/shipments.mutations.js`.
- Create `src/features/shipments/utils/shipmentsApi.js`.
- Create `src/features/shipments/utils/shipmentsApi.test.js`.
- Replace `src/features/shipments/pages/ShippingPage.jsx`.
- Create `src/features/shipments/pages/shippingPageComposition.test.js`.
- Modify `src/features/vendors/pages/VendorListPage.jsx`.
- Modify `src/features/vendors/pages/VendorProductsPage.jsx`.
- Modify `src/features/vendors/utils/vendorsApi.js`.
- Modify `src/features/vendors/utils/vendorsApi.test.js`.
- Create `src/features/shops/api/shops.keys.js`.
- Create `src/features/shops/api/shops.queries.js`.
- Create `src/features/shops/api/shops.mutations.js`.
- Create `src/features/shops/utils/shopsApi.js`.
- Create `src/features/shops/utils/shopsApi.test.js`.
- Create `src/features/shops/pages/ShopsPage.jsx`.
- Modify `src/routes/index.jsx`.
- Modify `src/constants/routes.js` only if the route constant exists but is not wired.

---

### Task 1: BE Read-Model Minimum Before FE

**Files:**

- Modify BE `src/modules/vendorSubmission/validators/vendorSubmission.validator.js`
- Modify BE `src/modules/vendorSubmission/repositories/vendorSubmission.repository.js`
- Modify BE `src/modules/vendorSubmission/dtos/vendorSubmission.dto.js`
- Modify BE `src/modules/shipment/validators/shipment.validator.js`
- Modify BE `src/modules/shipment/repositories/shipment.repository.js`
- Modify BE `src/modules/shipment/dtos/shipment.dto.js`
- Test BE service/repository tests closest to these modules

**Interfaces:**

- Produces vendor submission query support: `id`, `externalOrderId`, `vendorExternalOrderId`.
- Produces shipment query support: `id`, `externalOrderId`, `vendorExternalOrderId`, `trackingNumber`.
- Produces list DTO display fields so FE does not fan out detail requests.

- [ ] Add vendor submission filters for `id`, `externalOrderId`, `vendorExternalOrderId`.
- [ ] Expose list DTO display fields: `externalOrderId`, `listingTitle`, `sku`, `vendorName`, `vendorProductName`, `costCenterCode`.
- [ ] Add shipment filters for `id`, `externalOrderId`, `vendorExternalOrderId`, `trackingNumber`.
- [ ] Expose shipment list DTO display fields: `externalOrderId`, `vendorExternalOrderId`, `trackingNumber`, `carrier`, `shopId`.
- [ ] Run BE focused tests:

```bash
npx jest src/test/vendorSubmission --runInBand
npx jest src/test/shipment --runInBand
npm run test:architecture -- --runInBand
```

Expected: all pass.

---

### Task 2: Vendor Submissions Operator Page

**Files:**

- Create `src/features/vendor-submissions/api/vendorSubmissions.keys.js`
- Create `src/features/vendor-submissions/api/vendorSubmissions.queries.js`
- Create `src/features/vendor-submissions/api/vendorSubmissions.mutations.js`
- Create `src/features/vendor-submissions/utils/vendorSubmissionsApi.js`
- Create `src/features/vendor-submissions/utils/vendorSubmissionsApi.test.js`
- Create `src/features/vendor-submissions/pages/VendorSubmissionsPage.jsx`
- Create `src/features/vendor-submissions/pages/vendorSubmissionsPageComposition.test.js`
- Modify `src/routes/index.jsx`

**Interfaces:**

- Consumes `ENDPOINTS.VENDOR_SUBMISSIONS`.
- Produces route `/portal/vendor-submissions`.

- [ ] Add query keys for `list`, `summary`, `detail`, and `payloadPreview`.
- [ ] Add adapter functions for list params: `id`, `externalOrderId`, `vendorExternalOrderId`, `status`, `shopId`, `vendorId`, `dateFrom`, `dateTo`, `page`, `limit`.
- [ ] Add mutations: `createFromProductionTask`, `recheckProductionTask`, `recheckReady`, `submitToVendor`, `markSubmitted`, `markFailed`, `retry`, `cancel`.
- [ ] Add tests for query param mapping and mutation payloads.
- [ ] Build page with `OperationsPageShell`: compact header, status tabs, search toolbar, table, pagination.
- [ ] Table columns: `Submission ID`, `Order ID`, `Status`, `Vendor`, `Cost Center`, `Provider`, `Vendor Order ID`, `Updated`, `Actions`.
- [ ] Row click opens detail drawer.
- [ ] Drawer sections: payload summary, payload preview, status history, raw submitted response.
- [ ] Action gates:
  - `READY`: `Submit to vendor`, `Mark submitted`, `Cancel`
  - `FAILED`: `Retry`, `Cancel`
  - `SUBMITTED`: `Create shipment`
  - `CANCELLED`: read-only
- [ ] Invalidate vendor submission, shipment, production/scale queries after mutations.
- [ ] Replace current route element from `PodWorkbenchPage moduleId="logistics"` to `VendorSubmissionsPage`.
- [ ] Run FE checks:

```bash
node --test src/features/vendor-submissions/utils/vendorSubmissionsApi.test.js
node --test src/features/vendor-submissions/pages/vendorSubmissionsPageComposition.test.js
npm run lint
npm run build
```

Expected: all pass.

---

### Task 3: Shipments Operator Page

**Files:**

- Create `src/features/shipments/api/shipments.keys.js`
- Create `src/features/shipments/api/shipments.queries.js`
- Create `src/features/shipments/api/shipments.mutations.js`
- Create `src/features/shipments/utils/shipmentsApi.js`
- Create `src/features/shipments/utils/shipmentsApi.test.js`
- Replace `src/features/shipments/pages/ShippingPage.jsx`
- Create `src/features/shipments/pages/shippingPageComposition.test.js`

**Interfaces:**

- Consumes `ENDPOINTS.SHIPMENTS`.
- Keeps route `/portal/fulfillment/shipping`.

- [ ] Add query keys for `list`, `summary`, `detail`, `webhookLogs`.
- [ ] Add adapter functions for list params: `id`, `externalOrderId`, `vendorExternalOrderId`, `trackingNumber`, `status`, `carrier`, `shopId`, `dateFrom`, `dateTo`, `page`, `limit`.
- [ ] Add mutations: `createFromVendorSubmission`, `updateTracking`, `updateStatus`, `recheckVendorTracking`, `recheckSubmittedVendorTracking`.
- [ ] Add tests for query params and update tracking payload: `{ carrier, trackingNumber, trackingUrl, note }`.
- [ ] Build page with two tabs: `Shipments` and `Webhook Logs`.
- [ ] Shipment table columns: `Shipment ID`, `Order ID`, `Status`, `Carrier`, `Tracking`, `Vendor Order ID`, `Updated`, `Actions`.
- [ ] Row click opens detail drawer.
- [ ] Drawer actions:
  - `TRACKING_PENDING`: `Recheck tracking`, `Update tracking`
  - `SHIPPED`: `Mark delivered`, `Mark exception`
  - `DELIVERED/CANCELLED`: read-only
- [ ] Add batch action `Recheck submitted tracking` in toolbar with provider/shop filters.
- [ ] Webhook Logs tab reads `GET /api/shipments/vendor-webhooks/logs` with filters.
- [ ] Invalidate shipment, vendor submission, order/workbench queries after tracking/status changes.
- [ ] Run FE checks:

```bash
node --test src/features/shipments/utils/shipmentsApi.test.js
node --test src/features/shipments/pages/shippingPageComposition.test.js
npm run lint
npm run build
```

Expected: all pass.

---

### Task 4: Vendor UI Polish

**Files:**

- Modify `src/features/vendors/pages/VendorListPage.jsx`
- Modify `src/features/vendors/pages/VendorProductsPage.jsx`
- Modify `src/features/vendors/utils/vendorsApi.js`
- Modify `src/features/vendors/utils/vendorsApi.test.js`

**Interfaces:**

- Consumes existing `ENDPOINTS.VENDORS`.
- Keeps routes `/portal/vendors` and `/portal/vendors/products-cost`.

- [ ] Move both vendor pages onto `OperationsPageShell`.
- [ ] Keep current dialogs and drawers.
- [ ] Add ID/code-friendly filters:
  - Vendor list: `search`, `code`, `status`, `fulfillmentType`, `providerKey`
  - Vendor products: `search`, `vendorId`, `productTypeGroupId`, `code`, `externalProductId`, `status`
  - Cost centers drawer: `q`, `code`, `sku`, `standardSize`, `standardColor`, `status`
- [ ] Add table columns that expose IDs/codes visibly instead of hiding them in detail.
- [ ] Keep create/edit forms as dialogs; no new route.
- [ ] Run FE checks:

```bash
node --test src/features/vendors/utils/vendorsApi.test.js
npm run lint
npm run build
```

Expected: all pass.

---

### Task 5: Shop Admin Page

**Files:**

- Create `src/features/shops/api/shops.keys.js`
- Create `src/features/shops/api/shops.queries.js`
- Create `src/features/shops/api/shops.mutations.js`
- Create `src/features/shops/utils/shopsApi.js`
- Create `src/features/shops/utils/shopsApi.test.js`
- Create `src/features/shops/pages/ShopsPage.jsx`
- Modify `src/routes/index.jsx`

**Interfaces:**

- Consumes `ENDPOINTS.SHOPS`.
- Produces route `/portal/settings/shops-stores`.

- [ ] Add query keys for list/detail.
- [ ] Add mutations for create shop and update status.
- [ ] Add adapter params: `id`, `search`, `status`, `page`, `limit`.
- [ ] Build page with `OperationsPageShell`.
- [ ] Table columns: `Shop ID`, `Name`, `Currency`, `Status`, `Updated`, `Actions`.
- [ ] Add create shop dialog with `name`, `currency`, `status`.
- [ ] Add status action only; do not add marketplace/account credentials.
- [ ] Wire route `/portal/settings/shops-stores` with `SHOPS:READ`.
- [ ] Run FE checks:

```bash
node --test src/features/shops/utils/shopsApi.test.js
npm run lint
npm run build
```

Expected: all pass.

---

## Manual Smoke

- [ ] Login with permissions: `VENDOR_SUBMISSIONS:READ`, `VENDOR_SUBMISSIONS:WRITE`, `SHIPMENTS:READ`, `SHIPMENTS:WRITE`, `VENDORS:READ`, `VENDORS:WRITE`, `SHOPS:READ`.
- [ ] Open `/portal/vendor-submissions`; search by order id and vendor order id.
- [ ] Open a ready submission, preview payload, submit to vendor with dry run first.
- [ ] Mark or receive a submitted vendor order id.
- [ ] Create shipment from submitted vendor submission.
- [ ] Open `/portal/fulfillment/shipping`; search by order id, vendor order id, tracking number.
- [ ] Recheck tracking, update tracking, mark delivered.
- [ ] Verify order/workbench status refreshes after shipment changes.
- [ ] Open `/portal/vendors`; create/update vendor.
- [ ] Open `/portal/vendors/products-cost`; create/update vendor product and cost center.
- [ ] Open `/portal/settings/shops-stores`; create shop and change status.

## Recommended Execution Order

1. Task 1: BE read-model filters.
2. Task 2: Vendor submissions UI.
3. Task 3: Shipments UI.
4. Task 4: Vendor polish.
5. Task 5: Shop admin.

This keeps the POD flow usable after each task and avoids building setup screens before the submission/shipping bottleneck is visible.
