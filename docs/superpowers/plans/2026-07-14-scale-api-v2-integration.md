# Scale API V2 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the Scale workspace to the enriched Production API contract for Amazon and Etsy, including correct counters, dedicated assignees, enriched task metadata, and exact slot asset actions.

**Architecture:** Keep the page backed by pure contract mappers in `scaleApi.js`, then expose independent TanStack Query hooks for list, summary, assignees, and shops. The page composes those resources and renders both sales channels through the same server-driven filtering and pagination flow. Mutations continue to invalidate the Scale query namespace, while each upload is bound to the selected `scaleContext.use.scaleSlots` item.

**Tech Stack:** React 19, TanStack Query 5, Axios, MUI 9, Tailwind CSS 4, node:test, i18next.

---

### Task 1: Lock The Production V2 Contract In Pure Tests

**Files:**

- Modify: `src/features/scale/utils/scaleApi.test.js`
- Modify: `src/features/scale/utils/scaleApi.js`
- Modify: `src/features/scale/constants/scaleConstants.js`

- [ ] **Step 1: Write failing query tests**

Add assertions that `buildProductionTaskQuery` sends `salesChannelCode`, maps CS Unassigned to `designAssignmentStatus=UNASSIGNED`, and that `buildProductionSummaryQuery` removes pagination and status filters while preserving channel/date/shop filters.

- [ ] **Step 2: Run the query tests and verify RED**

Run: `node --test src/features/scale/utils/scaleApi.test.js`

Expected: FAIL because channel and unassigned filters are not mapped yet.

- [ ] **Step 3: Implement the minimum query mapping**

Add `SCALE_CHANNELS`, extend `statusQuery`, include `salesChannelCode`, and preserve existing compact query behavior.

- [ ] **Step 4: Write failing DTO mapper tests**

Create a representative V2 task fixture with top-level `groupId`, `groupType`, `salesChannelCode`, `orderStatus`, `seller`, `orderOwner`, and `scaleContext.use.{listing,template,psdTemplate,scaleSlots}`. Assert that the mapped row and detail model retain exact `fileCheckId`, asset IDs, download URLs, blockers, and real user metadata.

- [ ] **Step 5: Run the DTO tests and verify RED**

Run: `node --test src/features/scale/utils/scaleApi.test.js`

Expected: FAIL because the mapper still reads removed `listing` and `fileChecks` fields.

- [ ] **Step 6: Implement V2 task and summary mapping**

Read all design assets from `scaleContext.use`, map status counters from `byAssignmentStatus`, `byScaleStatus`, and `byQcStatus`, expose `mapScaleAssignees`, and remove guessed upload-slot selection.

- [ ] **Step 7: Run the mapper tests and verify GREEN**

Run: `node --test src/features/scale/utils/scaleApi.test.js`

Expected: all Scale API mapper tests pass.

### Task 2: Split Query Resources And Cache Keys

**Files:**

- Modify: `src/services/endpoints.js`
- Modify: `src/features/scale/api/scale.keys.js`
- Modify: `src/features/scale/api/scale.queries.js`

- [ ] **Step 1: Register the assignee endpoint**

Add `ENDPOINTS.SCALE.ASSIGNEES = '/api/production/tasks/scale-assignees'`.

- [ ] **Step 2: Define independent query keys**

Expose stable keys for `tasks(query)`, `summary(query)`, `assignees(query)`, and `shops(query)` under `scaleKeys.all`.

- [ ] **Step 3: Split query hooks**

Implement `useScaleTasksQuery`, `useScaleSummaryQuery`, `useScaleAssigneesQuery`, and `useScaleShopsQuery`. Each hook calls only one endpoint and applies its corresponding mapper. Use TanStack Query `placeholderData` for list pagination instead of the obsolete boolean `keepPreviousData` option.

- [ ] **Step 4: Run lint on the API layer**

Run: `npx eslint src/features/scale/api src/features/scale/utils/scaleApi.js src/services/endpoints.js`

Expected: no lint errors.

### Task 3: Compose Amazon And Etsy Queues In The Page

**Files:**

- Modify: `src/features/scale/pages/ScalePage.jsx`
- Modify: `src/features/scale/constants/scaleConstants.js`

- [ ] **Step 1: Replace dual disabled queries with the shared channel query**

Derive `AMAZON` or `ETSY` from the active top tab, pass it into list and summary filters, and compose options from shops plus dedicated assignees. Keep status-tab changes immediate and reset pagination when channel or filters change.

- [ ] **Step 2: Enable supported Etsy controls**

Render the same server-driven list, date range, search, shop, Scale By, QC By, status, and pagination flow for Etsy. Remove vendor/order-status/scale-file controls because the backend does not support them.

- [ ] **Step 3: Enable CS Unassigned and correct counter sources**

Remove the disabled state and display `byAssignmentStatus.UNASSIGNED`, `byAssignmentStatus.ASSIGNED`, `byScaleStatus.SCALED`, and `byQcStatus.REJECTED` through the mapped summary.

- [ ] **Step 4: Bind row fields to enriched metadata**

Render real group, seller, owner, order status, assignee, QC user, and channel-aware shop data without introducing client-side pagination or filtering.

- [ ] **Step 5: Run focused lint**

Run: `npx eslint src/features/scale/pages/ScalePage.jsx src/features/scale/constants/scaleConstants.js`

Expected: no lint errors.

### Task 4: Render And Mutate Exact Scale Slots

**Files:**

- Modify: `src/features/scale/pages/ScalePage.jsx`
- Modify: `src/features/scale/api/scale.mutations.js`

- [ ] **Step 1: Render all V2 slots**

Replace placeholder mockups and the two-item slice with every mapped Scale slot. Show real input/output media where URLs exist, actual PSD/task/QC state, blockers, and customer image assets.

- [ ] **Step 2: Bind upload to the selected slot**

Change `handleUploadOutput` to accept `(task, slot, file)` and send that slot's `fileCheckId`. Disable only the active mutation target and slots that lack a usable input or are blocked by `canScale=false`.

- [ ] **Step 3: Bind downloads to real assets**

Use PSD and per-slot output asset IDs for authenticated blob downloads, preserving existing notification behavior.

- [ ] **Step 4: Verify mutation invalidation and pending states**

Confirm assign and upload mutations invalidate list/summary resources and do not block unrelated row controls.

### Task 5: Complete Bilingual States And Verification

**Files:**

- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`

- [ ] **Step 1: Update bilingual labels**

Remove the unavailable suffix from CS Unassigned, replace the Etsy phase-one message, and add labels for slot/blocker/upload-disabled states where the UI needs them.

- [ ] **Step 2: Run all focused tests**

Run: `node --test src/features/scale/utils/scaleApi.test.js src/features/scale/utils/scalePagination.test.js src/components/form/dateRangePresets.test.js`

Expected: all tests pass.

- [ ] **Step 3: Run project verification**

Run: `npm run lint`

Run: `npm run build`

Run: `git diff --check`

Expected: all commands exit successfully.

- [ ] **Step 4: Smoke-test the route**

Open `http://localhost:5173/portal/fulfillment/scale` and confirm the Vite route responds. API-dependent rows may require an authenticated browser session, but the route must compile without runtime render errors.
