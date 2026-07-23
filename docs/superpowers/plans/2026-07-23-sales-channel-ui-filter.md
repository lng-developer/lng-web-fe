# Sales-channel UI filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an All/Amazon/Etsy selector to Orders, Scale, and QC that uses backend `salesChannelCode` filtering.

**Architecture:** Each page owns its existing URL state and MUI control. Query builders map only recognised Amazon/Etsy selections to `salesChannelCode`; the default All selection omits it so the backend returns every channel. Existing channel deep links stay compatible.

**Tech Stack:** React, MUI, React Router location state, TanStack Query, node:test.

## Global Constraints

- Do not add dependencies or a new cross-feature abstraction.
- `All` must omit `channel` from URLs and `salesChannelCode` from API requests.
- `Amazon` maps to `salesChannelCode=AMAZON`; `Etsy` maps to `salesChannelCode=ETSY`.
- Filter changes reset pagination to page 1 and update list plus summary queries.
- Preserve existing Amazon/Etsy deep links and the active visual style of each operations toolbar.

---

### Task 1: Wire sales-channel state, queries, and toolbar controls

**Files:**

- Modify: `src/features/orders/components/OrdersControls.jsx`
- Modify: `src/features/scale/pages/ScalePage.jsx`
- Modify: `src/features/scale/utils/scaleApi.js`
- Modify: `src/features/qc/pages/QcPage.jsx`
- Modify: `src/features/qc/utils/qcApi.js`
- Modify: `src/features/scale/utils/scaleApi.test.js`
- Modify: `src/features/qc/utils/qcApi.test.js`
- Modify: `src/features/qc/pages/qcPageComposition.test.js`
- Modify: `src/features/scale/pages/scalePageComposition.test.js`

**Interfaces:**

- Consumes: `buildOrderListQuery`, `buildProductionTaskQuery`, `buildQcTaskQuery`, plus their summary-query counterparts.
- Produces: URL-backed `channel` UI state and optional backend `salesChannelCode` filters across all three queues.

- [ ] **Step 1: Write failing query and composition tests**

Add assertions that Scale/QC interpret a missing channel as `all`, retain Amazon/Etsy URL parsing, omit `salesChannelCode` for `all`, and render a channel Select. Update the obsolete tests that assert Scale/QC have no platform filter.

- [ ] **Step 2: Run the focused tests to verify RED**

Run: `node --test src/features/scale/utils/scaleApi.test.js src/features/qc/utils/qcApi.test.js src/features/scale/pages/scalePageComposition.test.js src/features/qc/pages/qcPageComposition.test.js`

Expected: FAIL because current Scale/QC default to Amazon and no toolbar selector is rendered.

- [ ] **Step 3: Implement the minimum URL and query mapping**

Use `all`, `amazon`, and `etsy` as UI values. Let `channel=amazon|etsy` map to backend `AMAZON|ETSY`; do not construct `salesChannelCode=ALL`. In Scale, replace the `activeSubTab`-driven channel choice with URL-backed channel state, leave Etsy-only presentation active only for `etsy`, and preserve pagination parameters when channel changes.

- [ ] **Step 4: Render the controls in existing toolbars**

Add the Orders selector using the already-defined channel options. Add matching compact controls in Scale and QC with existing `Select`/`FilterSelect` components, reset page on change, and persist the URL state. Keep the current spacing and responsive toolbar grids.

- [ ] **Step 5: Run focused tests to verify GREEN**

Run: `node --test src/features/orders/utils/ordersApi.test.js src/features/orders/utils/ordersFilters.test.js src/features/scale/utils/scaleApi.test.js src/features/qc/utils/qcApi.test.js src/features/scale/pages/scalePageComposition.test.js src/features/qc/pages/qcPageComposition.test.js`

Expected: PASS.

- [ ] **Step 6: Run lint and build**

Run: `npm run lint; npm run build`

Expected: both commands exit 0; the existing Vite chunk-size warning may remain.

- [ ] **Step 7: Commit**

```powershell
git add docs/superpowers/specs/2026-07-23-sales-channel-ui-filter-design.md docs/superpowers/plans/2026-07-23-sales-channel-ui-filter.md src/features/orders/components/OrdersControls.jsx src/features/scale src/features/qc
git commit -m "feat(filters): add sales channel queue filters"
```
