# Vendor submissions and shipping header alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Vendor Submissions and Shipping headers match the current dense operations-page hierarchy.

**Architecture:** Keep each page's existing shell, data state, and toolbar. Replace only generic header composition and relocate the existing refresh behavior into the toolbar.

**Tech Stack:** React, MUI, Tailwind utility classes, node:test.

## Global Constraints

- Header must use the same `min-h-[54px]`, `Typography variant="h5"`, and `text-xl font-bold text-ink-strong` pattern as QC/Scale.
- Keep existing subtitle copy, data queries, tabs, filters, and lifecycle actions.
- Refresh stays functional but appears as a compact, labelled icon in the toolbar.
- Do not add dependencies or shared abstractions.

---

### Task 1: Align Vendor Submissions and Shipping headers

**Files:**

- Modify: `src/features/vendor-submissions/pages/VendorSubmissionsPage.jsx`
- Modify: `src/features/vendor-submissions/pages/vendorSubmissionsPageComposition.test.js`
- Modify: `src/features/shipments/pages/ShippingPage.jsx`
- Modify: `src/features/shipments/pages/shippingPageComposition.test.js`

- [ ] **Step 1: Write failing composition tests**

Assert that both pages no longer render `OperationsHeader`, use the shared dense header class and typography, and expose their existing refresh through a toolbar IconButton.

- [ ] **Step 2: Run RED verification**

Run: `node --test src/features/vendor-submissions/pages/vendorSubmissionsPageComposition.test.js src/features/shipments/pages/shippingPageComposition.test.js`

Expected: FAIL because both pages still use `OperationsHeader` and header-level refresh buttons.

- [ ] **Step 3: Implement the minimal header and toolbar changes**

Replace each header with the approved direct layout; retain title/subtitle. Move the existing refresh callback into a labelled toolbar IconButton without changing the query it refetches.

- [ ] **Step 4: Verify GREEN and build**

Run: `node --test src/features/vendor-submissions/pages/vendorSubmissionsPageComposition.test.js src/features/shipments/pages/shippingPageComposition.test.js; npm run lint; npm run build`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```powershell
git add docs/superpowers/specs/2026-07-23-vendor-shipping-header-alignment-design.md docs/superpowers/plans/2026-07-23-vendor-shipping-header-alignment.md src/features/vendor-submissions/pages src/features/shipments/pages
git commit -m "feat(operations): align vendor and shipping headers"
```
