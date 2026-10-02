# Production Scale and QC RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the production workbench with separate Scale Worker, Scale Leader and QC Reviewer permissions.

**Architecture:** Keep one workbench and let the server remain the access authority. Replace legacy design-permission UI predicates with scoped production predicates, so each action and queue control mirrors its corresponding backend route.

**Tech Stack:** React, TypeScript, TanStack Query, Ant Design, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-03-rbac-workflow-ui-design.md`

## Global Constraints

- Reuse shared API, permission and feedback helpers; add no dependencies.
- Do not hard-code role names; use backend-provided permissions and scopes.
- A `403` must refresh production query keys and clear stale selections.

## Review Focus

- A Scale Worker must not see an upload action for another worker's task.
- A Scale Leader must not receive any QC decision control.
- A QC Reviewer must not receive Scale assignment or upload control.
- `PRODUCTION:WRITE` must retain current administrator behavior.
- A forbidden mutation must not leave selected rows or cached controls actionable.

---

### Task 1: Production permission predicates

**Files:**

- Modify: `src/features/portal/production/pages/ProductionWorkbenchPage.tsx`
- Test: `src/test/portal/production/pages/ProductionWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes: `CurrentAccount`, `canUseScopedPermission(account, permission, scope)`.
- Produces: predicates for scale work, scale assignment and QC review used by rows and toolbar actions.

- [ ] **Step 1: Write failing predicate/render tests**

Assert Scale Worker uses `csAssigneeId === account.id`, Scale Leader requires `PRODUCTION:SCALE_ASSIGN`, QC requires `PRODUCTION:QC_REVIEW`, and `PRODUCTION:WRITE` retains all three capabilities.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm run test:ui -- src/test/portal/production/pages/ProductionWorkbenchPage.test.tsx`
Expected: FAIL because the page still checks `assignedDesignUserId` and `DESIGN:REVIEW`.

- [ ] **Step 3: Replace legacy predicates in `ProductionWorkbenchPage`**

Use `PRODUCTION:SCALE_WORK` for an assigned `csAssigneeId`, `PRODUCTION:SCALE_ASSIGN` for assignment, and `PRODUCTION:QC_REVIEW` for QC; preserve `PRODUCTION:WRITE` as the administrator override.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm run test:ui -- src/test/portal/production/pages/ProductionWorkbenchPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(rbac): align production scale and qc controls"`

### Task 2: Stale authorization recovery

**Files:**

- Modify: `src/features/portal/production/pages/ProductionWorkbenchPage.tsx`
- Test: `src/test/portal/production/pages/ProductionWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes: production query keys and existing feedback toast.
- Produces: one shared forbidden-error branch for production mutations.

- [ ] **Step 1: Write a failing forbidden-mutation test**

Make an assign, upload or QC mutation reject with a `403`; assert production lists/summaries are invalidated and selected rows are cleared.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm run test:ui -- src/test/portal/production/pages/ProductionWorkbenchPage.test.tsx`
Expected: FAIL because existing mutation errors only display a toast.

- [ ] **Step 3: Add the minimal shared error handler**

Recognize `403`, clear `selectedRowKeys` and decision state, then call the existing `refresh`; retain the current error toast for every failure.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm run test:ui -- src/test/portal/production/pages/ProductionWorkbenchPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "fix(production): refresh stale forbidden workbench state"`
