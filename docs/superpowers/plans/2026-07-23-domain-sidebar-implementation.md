# Domain Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved enterprise domain sidebar to Portal without changing routes, backend contracts, or HR context behavior.

**Architecture:** `sidebarNavigation.js` remains the single navigation model and permission-filtering boundary. Portal changes from workspace-composed sections to the approved domain hierarchy; `AppSidebar` renders the filtered Portal tree directly while continuing to derive Portal/HR from route families.

**Tech Stack:** React 19, MUI, React Router, i18next, Node built-in tests, ESLint, Vite.

## Global Constraints

- Keep every leaf on a currently mounted route and preserve its existing required backend permission(s).
- Do not add dependencies, routes, hardcoded role checks, or marketplace-specific sidebar leaves.
- Keep Portal | HR context switching and permission-driven group removal working.
- Reuse `ROUTES`, `hasAnyPermission`, MUI, and locale files; do not change destination-page behavior.
- Leave ignored `.stitch/` and `.superpowers/` artifacts out of commits.

---

### Task 1: Replace the Portal navigation model with domain hierarchy

**Files:**

- Modify: `src/layouts/sidebarNavigation.js`
- Modify: `src/layouts/sidebarNavigation.test.js`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes: `ROUTES`, `hasAnyPermission`, existing `filterNavigationByUser`, `getFirstNavigableItem`, `isNavItemActive`.
- Produces: `PORTAL_NAVIGATION` beginning with `SIDEBAR_HOME_ITEM`; no `SIDEBAR_WORKSPACES`, `SIDEBAR_WORKSPACE_IDS`, `SIDEBAR_WORKSPACE_NAVIGATION`, or `getSidebarWorkspaceForLocation` export.

- [ ] **Step 1: Write failing navigation assertions**

Update `sidebarNavigation.test.js` to expect the Portal top-level IDs `dashboard`, `commerce-group`, `fulfillment-group`, `design-workspace-group`, `supply-data-group`, `insights-group`, and `system-group`. Assert the portal leaves are `orders-all`, `listings`, `product-types`, `internal-templates`, `shops-stores`, `scale-production`, `quality-control`, `vendor-submissions`, `shipping`, `design-task-list`, `vendor-list`, `products-cost`, `mapping-workbench`, `reports`, `api-coverage`, `audit-log`, and `users-roles`. Assert `orders-all` navigates to `/portal/orders`, has no `channel` query, and is inactive when `channel` is set.

- [ ] **Step 2: Run the focused test to verify failure**

Run: `node --test src/layouts/sidebarNavigation.test.js`

Expected: FAIL because the old workspace hierarchy and marketplace leaf IDs still exist.

- [ ] **Step 3: Implement the minimal domain tree**

In `sidebarNavigation.js`, replace workspace metadata and `SIDEBAR_WORKSPACE_NAVIGATION` with `PORTAL_NAVIGATION`. Use `SIDEBAR_HOME_ITEM` first, then:

```js
{ id: 'commerce-group', type: 'group', labelKey: 'nav.groups.commerce', icon: 'orders', children: [
  { id: 'orders-all', type: 'item', labelKey: 'nav.items.allOrders', path: ROUTES.PORTAL_ORDER_LIST, ...withoutSearch(['channel']), requiredPermissions: ['ORDERS:READ'] },
  { id: 'catalog-group', type: 'group', labelKey: 'nav.groups.catalog', children: [/* listings and existing view presets */] },
  { id: 'shops-stores', type: 'item', path: ROUTES.PORTAL_SHOPS_STORES, requiredPermissions: ['SHOPS:READ'] },
] }
```

Implement the remaining approved groups with their existing routes and permission arrays: Fulfillment (`PRODUCTION:READ` / `DESIGN:REVIEW`, `VENDOR_SUBMISSIONS:READ`, `SHIPMENTS:READ`), Design Workspace (existing design permission list), Supply & Data (`VENDORS:READ`, `MAPPING:READ`), Insights (`REPORTS:READ`, `MANAGE_SYSTEM`, `AUDIT:READ`), and System (`AUTH:READ`). Make `scale-production`, `quality-control`, and `reports` direct base-route items without marketplace query strings. Keep `HR_NAVIGATION`, context helpers, role-filtering helpers, mounted-route filtering, and traversal helpers unchanged except for deleting workspace-only code.

- [ ] **Step 4: Add translation labels**

Add `commerce`, `catalog`, `designWorkspace`, `supplyData`, `insights`, and `system` under `nav.groups`; add `scaleProduction` and `qualityControl` under `nav.items` in both locale files. Reuse existing `allOrders`, `reports`, `productsCost`, and `usersRoles` labels.

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test src/layouts/sidebarNavigation.test.js`

Expected: PASS. Commit only the four files with `feat(sidebar): apply domain navigation taxonomy`.

### Task 2: Render the Portal domain tree directly

**Files:**

- Modify: `src/layouts/AppSidebar.jsx`
- Modify: `src/layouts/appSidebarComposition.test.js`

**Interfaces:**

- Consumes: `PORTAL_NAVIGATION`, `HR_NAVIGATION`, `filterNavigationByUser`, `getFirstNavigableItem`, and the context helpers from Task 1.
- Produces: the existing single-column sidebar with Portal navigation rendered from the domain tree and no workspace composition code.

- [ ] **Step 1: Write a failing composition assertion**

Change `appSidebarComposition.test.js` to assert `AppSidebar.jsx` imports `PORTAL_NAVIGATION`, uses `filterNavigationByUser(PORTAL_NAVIGATION, user)`, and does not reference `SIDEBAR_WORKSPACES`, `SIDEBAR_HOME_ITEM`, or `portalNavigation` workspace composition.

- [ ] **Step 2: Run the focused test to verify failure**

Run: `node --test src/layouts/appSidebarComposition.test.js`

Expected: FAIL because the component currently flattens `SIDEBAR_WORKSPACES` and renders the dashboard separately.

- [ ] **Step 3: Implement direct Portal rendering**

Replace workspace imports and the `SIDEBAR_WORKSPACES.flatMap` construction with:

```js
const portalNavigation = filterNavigationByUser(PORTAL_NAVIGATION, user)
const contextNavigation = activeContext === SIDEBAR_CONTEXT_IDS.HR ? hrNavigation : portalNavigation
```

Use `portalNavigation` for Portal visibility and context landing. Remove the special dashboard `renderLeafItem` block because Dashboard is now the first Portal navigation item. Do not alter context tab semantics, group expansion behavior, focus styles, width, or footer.

- [ ] **Step 4: Run focused tests and commit**

Run: `node --test src/layouts/sidebarNavigation.test.js src/layouts/appSidebarComposition.test.js`

Expected: PASS. Commit only `src/layouts/AppSidebar.jsx` and `src/layouts/appSidebarComposition.test.js` with `feat(sidebar): render portal domain navigation`.

### Task 3: Verify the integrated sidebar

**Files:**

- Verify: `src/layouts/sidebarNavigation.js`
- Verify: `src/layouts/AppSidebar.jsx`

- [ ] **Step 1: Check whitespace and task diff**

Run: `git diff --check HEAD~2..HEAD`

Expected: no output.

- [ ] **Step 2: Run project checks**

Run: `npm run lint` and `npm run build`.

Expected: both commands exit 0.

- [ ] **Step 3: Run focused regression tests**

Run: `node --test src/layouts/sidebarNavigation.test.js src/layouts/appSidebarComposition.test.js`

Expected: all focused tests pass.

- [ ] **Step 4: Record verification result**

Do not stage `.stitch/` or `.superpowers/`. Report the exact branch commits and any unrelated baseline suite failure separately from these checks.

## Self-Review

- The plan maps every approved Portal group to Task 1 and renders it in Task 2.
- It preserves both route/permission contracts and the Portal/HR switch.
- It intentionally uses the already-mounted API Coverage and Audit Log pages beneath Monitoring rather than inventing a page.
- No placeholders or API changes are required.
