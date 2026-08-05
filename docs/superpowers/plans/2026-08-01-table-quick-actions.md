# Table Quick Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permission-aware, state-aware quick actions to the Listings, Product Types, Internal Templates, and Design Queue tables without forcing users through row-detail navigation.

**Architecture:** Keep action selection inside each existing page because permissions, mutations, and drawer/modal state already live there. Reuse those handlers and dialogs; add no shared abstraction or dependency. Each action cell stops row propagation and is fixed to the right.

**Tech Stack:** React, TypeScript, Ant Design Table/Button/Dropdown, TanStack Query, Vitest, Testing Library.

## Global Constraints

- Preserve existing row-click detail behavior.
- Show only actions permitted by backend-provided permissions and valid for the row status.
- Use one visible primary action and an ellipsis menu for secondary actions.
- Keep rejection reason and confirmation requirements.
- Add no frontend dependency.
- Produce one implementation commit after all tasks and regression checks pass.

---

### Task 1: Catalog table quick actions

**Files:**

- Modify: `src/features/portal/catalog/pages/CatalogListingWorkbenchPage.tsx`
- Modify: `src/features/portal/catalog/pages/ProductTypeManagementPage.tsx`
- Modify: `src/features/portal/catalog/pages/InternalTemplateManagementPage.tsx`
- Test: `src/test/app/router/PortalCatalogRoute.test.tsx`

**Interfaces:**

- Consumes: existing `setSelectedId`, `setEditing`, approval and rejection handlers, and `canWrite()`/`canManage` checks.
- Produces: a right-fixed `Action` column in all three Catalog tables.

- [ ] **Step 1: Add failing UI assertions**

Render each writable Catalog view and assert that its valid quick action is visible. Click the action and assert the corresponding editor/dialog opens without also triggering the row-detail behavior. Render a read-only view and assert mutation actions are absent.

- [ ] **Step 2: Run the focused Catalog UI test**

Run: `npm run test:ui -- --run src/test/app/router/PortalCatalogRoute.test.tsx`

Expected: FAIL because the action cells do not exist.

- [ ] **Step 3: Implement minimal Catalog action cells**

Use Ant Design `Button`, `Dropdown`, and `MoreOutlined`. Every handler must call `event.stopPropagation()` before reusing the existing page handler. Configure the column with `key: 'actions'`, `title: t('common.actions')`, `fixed: 'right'`, and the smallest width that fits the primary action.

Listings expose `View` as the primary action; writable rows expose `Edit` and valid QC actions in the menu. Product Types and Internal Templates expose `Edit` only when `canManage` is true. Do not duplicate API calls or modal state.

- [ ] **Step 4: Re-run the focused Catalog UI test**

Run: `npm run test:ui -- --run src/test/app/router/PortalCatalogRoute.test.tsx`

Expected: PASS.

### Task 2: Design Queue lifecycle quick actions

**Files:**

- Modify: `src/features/portal/design/pages/DesignWorkbenchPage.tsx`
- Test: `src/test/app/router/PortalDesignRoute.test.tsx`

**Interfaces:**

- Consumes: existing `setSelectedId`, permission set, selected-task forms, and lifecycle mutation.
- Produces: state-derived primary and secondary actions in the Design Queue.

- [ ] **Step 1: Add failing permission and status assertions**

Cover at least an unassigned task for a `DESIGN:WRITE` user, an assigned task for `DESIGN:WORK`, a submitted task for `DESIGN:REVIEW`, and a read-only user. Assert that only valid actions appear and that clicking an action does not also fire row selection twice.

- [ ] **Step 2: Run the focused Design UI test**

Run: `npm run test:ui -- --run src/test/app/router/PortalDesignRoute.test.tsx`

Expected: FAIL because Design Queue has no action column.

- [ ] **Step 3: Implement state-derived Design actions**

Add a local function returning the valid action descriptors for a task:

- `UNASSIGNED` + `DESIGN:WRITE`: `Assign`.
- `ASSIGNED` + `DESIGN:WORK|DESIGN:WRITE`: `Start`.
- `IN_PROGRESS` + `DESIGN:WORK|DESIGN:WRITE`: `Submit`.
- `SUBMITTED` + `DESIGN:REVIEW|DESIGN:WRITE`: `Review`.
- Always allow `View` when the route is readable.

The lifecycle action opens the existing drawer and its existing form section; it must not submit a mutation before required assignee, files, approved asset, note, or rejection reason is available. Put `View` or any secondary valid action in the ellipsis menu and stop event propagation.

- [ ] **Step 4: Re-run the focused Design UI test**

Run: `npm run test:ui -- --run src/test/app/router/PortalDesignRoute.test.tsx`

Expected: PASS.

### Task 3: Localization, regression, and delivery

**Files:**

- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Modify only if required by assertions: the two route test files above.

**Interfaces:**

- Consumes: existing `portal.catalog` and `portal.design` translation namespaces.
- Produces: matching English and Vietnamese action labels.

- [ ] **Step 1: Add matching EN/VI labels**

Add labels for `Actions`, `View`, `Edit`, `Assign`, `Start`, `Submit`, `Review`, `Approve`, and `Reject` under the existing feature namespaces. Reuse an existing common key where one already exists.

- [ ] **Step 2: Run complete verification**

Run:

```powershell
npm run lint
npm run test:unit
npm run test:ui
npm run build
git diff --check
```

Expected: lint succeeds, all unit/UI tests pass, production build succeeds, and `git diff --check` prints no errors. The existing large-chunk build warning is non-blocking.

- [ ] **Step 3: Commit once**

```powershell
git add src/features/portal/catalog/pages src/features/portal/design/pages src/shared/i18n/locales src/test/app/router
git commit -m "feat(portal): add table quick actions"
```
