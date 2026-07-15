# Scale Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Scale's fixed page buttons with complete server-side pagination using the UI Kit's MUI Pagination and a page-size selector.

**Architecture:** Keep `page` and `pageSize` in `ScalePage`, send both through the existing Production query mapper, and isolate visible-range calculation in a pure helper. MUI owns page windows and navigation states while the page owns filter resets and invalid-page correction.

**Tech Stack:** React 19, MUI 9, Tailwind CSS 4, TanStack Query 5, react-i18next, Node test runner

---

### Task 1: Pagination range helper

**Files:**

- Create: `src/features/scale/utils/scalePagination.js`
- Create: `src/features/scale/utils/scalePagination.test.js`

- [ ] **Step 1: Write failing range tests**

Test `getPaginationRange({ page, pageSize, total })` for empty data (`0-0`), first page (`1-10`), middle page (`11-20`), and partial last page (`21-23`).

- [ ] **Step 2: Verify the tests fail**

Run: `node --test src/features/scale/utils/scalePagination.test.js`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the helper**

Normalize page, page size, and total to positive safe values. Return `{ from: 0, to: 0 }` for zero results; otherwise calculate an inclusive range capped by total.

- [ ] **Step 4: Verify the tests pass**

Run: `node --test src/features/scale/utils/scalePagination.test.js`

Expected: four tests pass with zero failures.

### Task 2: UI Kit pagination integration

**Files:**

- Modify: `src/features/scale/constants/scaleConstants.js`
- Modify: `src/features/scale/pages/ScalePage.jsx`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`

- [ ] **Step 1: Add supported page sizes**

Export `SCALE_PAGE_SIZE_OPTIONS = [10, 20, 50]` beside the existing default page size.

- [ ] **Step 2: Replace fixed page buttons**

Import MUI `Pagination`, render the calculated range, render Pagination with `count`, `page`, and `onChange`, then render a small Select for page size. Remove the custom page-number window and previous button icon.

- [ ] **Step 3: Connect server-side state**

Add `pageSize` state, send it as the existing query `pageSize`, reset page and expanded detail when page size changes, and preserve page-size choice across filters and sub-tabs.

- [ ] **Step 4: Correct invalid pages**

After a successful, settled query, if current page exceeds the new total page count, move to the last valid page and collapse expanded detail. Do not clamp while a new page is loading.

- [ ] **Step 5: Add responsive and translated labels**

Allow the filter/pagination toolbar to wrap. Add range, rows-per-page, and option-value labels to both locale files.

### Task 3: Verification

**Files:**

- Test: `src/features/scale/utils/scalePagination.test.js`
- Test: `src/features/scale/utils/scaleApi.test.js`

- [ ] **Step 1: Run focused tests**

Run: `node --test src/features/scale/utils/scalePagination.test.js src/features/scale/utils/scaleApi.test.js`

Expected: all pagination and Production query tests pass.

- [ ] **Step 2: Run static checks**

Run: `npm run lint`

Run: `npm run build`

Run: `git diff --check`

Expected: all commands exit with code 0; the existing chunk-size warning may remain.

- [ ] **Step 3: Smoke-test Scale route**

Request: `http://localhost:5173/portal/fulfillment/scale`

Expected: HTTP 200.
