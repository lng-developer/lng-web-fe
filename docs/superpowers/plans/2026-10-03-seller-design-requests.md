# Seller Design Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the seller-to-designer PSD request workflow in Orders and a focused Design Requests screen.

**Architecture:** Add typed design-request API helpers and query keys alongside the existing design task API. Orders consume the new PSD request response; a dedicated route delegates request visibility and authorization to the backend while showing only controls that match the account's permissions.

**Tech Stack:** React, TypeScript, TanStack Query, Ant Design, react-i18next, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-03-rbac-workflow-ui-design.md`

## Global Constraints

- Reuse existing portal navigation, table and feedback primitives.
- Use `DESIGN:REQUEST_READ`, `DESIGN:REQUEST_ASSIGN`, and `DESIGN:REQUEST_WORK`; never role names.
- Add matching English and Vietnamese locale keys for all new copy.

## Review Focus

- A seller action is idempotent and displays the returned request state.
- A designer cannot see an unassigned or another designer's request in the UI.
- A Design Leader can assign only through the backend assignee list and refreshes after mutation.
- Terminal requests never show a status transition action.
- A `403` removes stale request selection and refetches the request list.

---

### Task 1: Typed API and order PSD request adaptation

**Files:**

- Modify: `src/features/portal/design/api/designApi.ts`
- Modify: `src/features/portal/design/api/designKeys.ts`
- Modify: `src/features/portal/orders/api/orderApi.ts`
- Modify: `src/features/portal/orders/hooks/useOrderActionsMutation.ts`
- Test: `src/test/portal/design/api/designApi.test.ts`
- Test: `src/test/portal/orders/api/orderApi.test.ts`

**Interfaces:**

- Produces: `DesignRequest`, `listDesignRequests()`, `assignDesignRequest(id, accountId)`, `updateDesignRequestStatus(id, status)`, and request query keys.
- Consumes: `POST /api/orders/items/:orderItemId/request-psd`, `GET /api/design/requests`, `PATCH /api/design/requests/:id/assign`, `PATCH /api/design/requests/:id/status`.

- [ ] **Step 1: Write failing API contract tests**

Assert exact paths, request bodies and typed response unwrap for order PSD request plus list, assign and status request APIs.

- [ ] **Step 2: Run the API tests to verify they fail**

Run: `npm run test:unit -- src/test/portal/design/api/designApi.test.ts src/test/portal/orders/api/orderApi.test.ts`
Expected: FAIL because design-request helpers do not exist.

- [ ] **Step 3: Implement the typed adapters and query keys**

Add only the new request interfaces/methods and invalidate the existing order/design roots after the seller mutation.

- [ ] **Step 4: Run the API tests to verify they pass**

Run: `npm run test:unit -- src/test/portal/design/api/designApi.test.ts src/test/portal/orders/api/orderApi.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(design): add design request API contracts"`

### Task 2: Design Requests screen and navigation

**Files:**

- Create: `src/features/portal/design/pages/DesignRequestsPage.tsx`
- Modify: `src/features/portal/design/api/designApi.ts`
- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Test: `src/test/portal/design/pages/DesignRequestsPage.test.tsx`
- Test: `src/test/app/layout/appNavigation.test.ts`

**Interfaces:**

- Consumes: Task 1 request API and query keys, current route account, portal table and feedback toast.
- Produces: `/portal/design/requests` visible only for `DESIGN:REQUEST_READ` / assign / work permission holders.

- [ ] **Step 1: Write failing navigation and screen tests**

Assert a leader sees all rows plus Assign, an assigned designer sees only returned rows plus status action, and an account without request permissions sees no navigation item.

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm run test:ui -- src/test/portal/design/pages/DesignRequestsPage.test.tsx src/test/app/layout/appNavigation.test.ts`
Expected: FAIL because route/page/navigation are absent.

- [ ] **Step 3: Implement the focused screen**

Render request/order/listing snapshot/status columns; expose assign only for `DESIGN:REQUEST_ASSIGN`, transition only for `DESIGN:REQUEST_WORK`, invalidate request keys after success, and use the existing forbidden recovery pattern.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm run test:ui -- src/test/portal/design/pages/DesignRequestsPage.test.tsx src/test/app/layout/appNavigation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(design): add request assignment workspace"`
