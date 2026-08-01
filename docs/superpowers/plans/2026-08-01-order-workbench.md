# Order Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a single inline Order Workbench where sellers see orders inferred from their SKU employee codes and operational users see all order state and actions without navigating to a detail page.

**Architecture:** The backend persists distinct seller account IDs on each order as `assignedStaffIds`, recalculates them after every import, and enforces seller visibility server-side. The frontend consumes the existing rich `/api/orders/workbench` read model, keeps every inline order panel visible, and writes through existing Order mutation endpoints; no new detail route or dependency is introduced.

**Tech Stack:** Node.js, Express, MongoDB/Mongoose, Jest, React 19, TypeScript, Ant Design, TanStack Query, react-i18next, Vitest.

## Global Constraints

- SKU `J2501-DM-2394-3` resolves employee code `J2501` through the HR public port.
- An order containing SKUs for multiple employees is visible to every resolved employee.
- Backend authorization, not a frontend query parameter, controls seller visibility.
- Use the existing workbench endpoint and existing dependencies.
- Do not create an Order detail page, drawer, or separate expanded-detail workflow.
- Keep every order panel expanded and expose writes only to `ORDERS:WRITE` users.
- Keep tests under `src/test`, never beside production TSX files.

---

### Task 1: Persist SKU-derived staff assignments

**Files:**

- Modify: `lng-web-be/src/modules/order/models/order.model.js`
- Modify: `lng-web-be/src/modules/order/services/orderImport.service.js`
- Modify: `lng-web-be/src/modules/order/repositories/order.repository.js`
- Modify: `lng-web-be/src/modules/order/services/orderAssignment.service.js`
- Modify: `lng-web-be/src/modules/order/validators/order.validator.js`
- Test: `lng-web-be/src/test/order/services/orderImport.service.test.js`
- Test: `lng-web-be/src/test/order/services/orderAssignment.service.test.js`

**Interfaces:**

- Consumes: `hrPublic.listEmployeeProfilesByEmployeeCodes(employeeCodes)`.
- Produces: `Order.assignedStaffIds: ObjectId[]` and `orderRepository.updateAssignedStaffIds(orderId, ids)`.

- [ ] Write failing tests proving one SKU assigns one account, multiple SKU prefixes assign distinct accounts, unresolved prefixes are ignored, and re-import removes stale assignments.
- [ ] Run the two Jest files and confirm failures mention missing `assignedStaffIds` behavior.
- [ ] Move the existing SKU-prefix parser into the smallest shared Order helper and resolve profiles once per imported order.
- [ ] Replace the singular model/repository/validator assignment contract with the array contract and preserve replacement-order assignment copying.
- [ ] Run the two Jest files and the full `src/test/order` suite.

### Task 2: Enforce seller visibility and expose assignments

**Files:**

- Modify: `lng-web-be/src/modules/order/services/orderAccess.service.js`
- Modify: `lng-web-be/src/modules/order/services/orderQuery.service.js`
- Modify: `lng-web-be/src/modules/order/repositories/order.repository.js`
- Modify: `lng-web-be/src/modules/order/dtos/order.dto.js`
- Test: `lng-web-be/src/test/order/services/orderQuery.service.test.js`
- Test: `lng-web-be/src/test/order/routes/index.test.js`

**Interfaces:**

- Consumes: `authContext.accountId`, global/scoped `ORDERS:READ`, and `Order.assignedStaffIds`.
- Produces: seller-scoped `/api/orders/workbench`, `/api/orders/summary`, and order reads; DTO field `assignedStaffIds`.

- [ ] Write failing tests proving global readers retain shop-wide access while a seller sees only orders whose array contains their account ID.
- [ ] Run the focused tests and verify the seller isolation assertions fail.
- [ ] Add one access decision that returns shop scope plus optional account constraint; apply it consistently to list, summary, and direct reads.
- [ ] Remove the client-controlled singular assignment filter and return assignment arrays in list/workbench DTOs.
- [ ] Run focused tests and the full Order suite.

### Task 3: Add the typed frontend Order API

**Files:**

- Create: `src/features/portal/orders/api/orderApi.ts`
- Create: `src/features/portal/orders/api/orderKeys.ts`
- Test: `src/test/portal/orders/api/orderApi.test.ts`

**Interfaces:**

- Consumes: `GET /api/orders/workbench` and `GET /api/orders/summary`.
- Produces: `listOrderWorkbench(params)`, `getOrderSummary(params)`, and stable `orderKeys`.

- [ ] Write failing API tests for omitted empty filters, normalized pagination, and response unwrapping.
- [ ] Run only the API test and verify it fails because the module is absent.
- [ ] Implement the minimum types and API functions using the shared `apiClient`.
- [ ] Run the API test until green.

### Task 4: Build the inline workbench

**Files:**

- Create: `src/features/portal/orders/pages/OrderWorkbenchPage.tsx`
- Create: `src/features/portal/orders/pages/OrderWorkbenchPage.module.scss`
- Create: `src/features/portal/orders/pages/OrderInlinePanel.tsx`
- Create: `src/features/portal/orders/pages/orderPresentation.ts`
- Test: `src/test/portal/orders/pages/orderPresentation.test.ts`
- Test: `src/test/portal/orders/pages/OrderWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes: typed workbench rows from Task 3.
- Produces: status tabs, debounced search and filters, paginated order rows, and one inline-expanded operational panel.

- [ ] Write failing presentation tests for status colors, missing-data labels, seller labels, and workflow action availability.
- [ ] Write focused component tests proving every inline panel is visible without row interaction and Product titles are omitted.
- [ ] Implement the dense header row and inline item sections for assets, SKU/seller/team, customization, quantity, mapping/cost, production, tracking, and notes.
- [ ] Add inline address update/validation and workflow-driven item mutations using the existing Order endpoints.
- [ ] Memoize row/panel components and use stable query parameters.
- [ ] Add loading, empty, page-error, and action-error states with the existing shared components.
- [ ] Run only the two Order UI test files.

### Task 5: Route, navigation, permission, and i18n integration

**Files:**

- Modify: `src/app/router/router.tsx`
- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Modify: `src/shared/i18n/locales/en/common.json`
- Test: `src/test/app/router/PortalOrderRoute.test.tsx`
- Test: `src/test/hr/pages/StaffWorkspacePage.test.tsx`

**Interfaces:**

- Consumes: backend-provided `ORDERS:READ` permission.
- Produces: lazy `/portal/orders` route and permission-gated Portal navigation item.

- [ ] Write a failing route contract test for lazy route registration and permission gating.
- [ ] Add the Orders navigation entry and lazy route without importing the page into the app smoke test.
- [ ] Add all visible Order copy in Vietnamese and English.
- [ ] Run the route test, Portal test group, FE lint/typecheck/build, and BE full Order tests.
