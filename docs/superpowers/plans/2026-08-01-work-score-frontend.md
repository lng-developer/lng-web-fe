# Work Score Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permission-aware Work Score workspace for Design and Scale points after the backend Work Score contract is verified.

**Architecture:** One typed API layer and query-key family feed a route-level workbench. The backend owns scoring and scope; FE renders summary/list/detail and sends versioned per-file override/void mutations.

**Tech Stack:** React, TypeScript, Ant Design, TanStack Query, React Router, Vitest, Testing Library.

## Global Constraints

- Do not begin until the backend Work Score route, authorization, migration, and recovery suites pass.
- Use the shared API client, route boundary, DataTable, FilterBar, DateRangePicker, StatusTag, DetailDrawer, and feedback utilities.
- Do not compute points, infer Shop scope, concatenate Media URLs, or hardcode role names.
- Actions depend on backend permissions and remain protected by backend authorization.
- No new frontend dependency.
- Create one frontend implementation commit only after all frontend checks pass.

---

### Task 1: Typed Work Score API and query keys

**Files:**

- Create: `src/features/portal/work-scores/api/workScoreApi.ts`
- Create: `src/features/portal/work-scores/api/workScoreKeys.ts`
- Create: `src/test/portal/work-scores/api/workScoreApi.test.ts`

**Interfaces:**

- Produces `WorkScoreListParams`, `WorkScoreListItem`, `WorkScoreDetail`, `WorkScoreSummary`, `listWorkScores`, `getWorkScoreSummary`, `getWorkScore`, `overrideWorkScore`, and `voidWorkScore`.
- Mutation payloads include `expectedVersion`.

- [ ] Write a failing API test asserting exact paths, compacted query parameters, override body, and void body.
- [ ] Run `npm run test:unit -- src/test/portal/work-scores/api/workScoreApi.test.ts`; expect missing-module failure.
- [ ] Implement types matching the approved backend DTO and use only the shared `apiClient` plus the existing unwrap/compact pattern.
- [ ] Add keys `all/list/summary/detail` and rerun the focused unit test; expect pass.

### Task 2: Permission-guarded route and navigation

**Files:**

- Modify: `src/app/router/router.tsx`
- Modify: `src/app/layout/appNavigation.ts`
- Create: `src/test/app/router/PortalWorkScoreRoute.test.tsx`
- Modify navigation state tests where required

**Interfaces:**

- Adds `/portal/work-scores`.
- Route accepts `WORK_SCORES:READ`, `WORK_SCORES:ADJUST`, or `DESIGN:WORK`.
- Sidebar item is derived from permissions, not roles.

- [ ] Write a failing route test for each allowed permission and denial without them.
- [ ] Write a failing navigation test showing the item only when an allowed permission exists.
- [ ] Run both focused UI tests; expect route/item missing failures.
- [ ] Add the lazy route and one Portal Operations navigation item.
- [ ] Re-run focused tests; expect pass.

### Task 3: Summary, filters, and score table

**Files:**

- Create: `src/features/portal/work-scores/pages/WorkScoreWorkbenchPage.tsx`
- Create: `src/features/portal/work-scores/pages/WorkScoreWorkbenchPage.module.scss` only for layout not expressible with existing utilities
- Create: `src/test/portal/work-scores/pages/WorkScoreWorkbenchPage.test.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes list/summary APIs and Work Score query keys.
- Columns: source, file/slot, listing/order context, worker, base/final points, status, scored time, actions.
- Filters: search, source type, Shop, worker, task type, status, date range.

- [ ] Write failing component tests for Design and Scale rows, summary values, Vietnamese/English labels, filter request shapes, pagination reset, own-score response rendering, and missing download URL.
- [ ] Run the focused page test; expect missing component failure.
- [ ] Implement one dense operational page using existing shared controls. Map source/status to existing colored status tags and use only returned download URLs.
- [ ] Re-run component and locale tests; expect pass.

### Task 4: Detail history and versioned adjustments

**Files:**

- Create: `src/features/portal/work-scores/pages/WorkScoreDetailDrawer.tsx`
- Create: `src/features/portal/work-scores/pages/WorkScoreAdjustmentModal.tsx`
- Modify: `src/features/portal/work-scores/pages/WorkScoreWorkbenchPage.tsx`
- Extend: `src/test/portal/work-scores/pages/WorkScoreWorkbenchPage.test.tsx`

**Interfaces:**

- Detail drawer renders source/rule snapshots and ordered immutable adjustments.
- Override submits `{ points, scoreLevel?, reason, expectedVersion }`.
- Void submits `{ reason, expectedVersion }`.

- [ ] Add failing tests for action permission, icon/modal isolation, required reason, non-negative finite points, history ordering, voided-score action removal, retained form data after failure, and `409` refresh behavior.
- [ ] Run focused component tests; expect missing drawer/modal behavior.
- [ ] Implement the drawer and one adjustment modal with override/void modes. On success invalidate list, summary, and detail. On conflict refresh detail and keep the reason visible.
- [ ] Re-run focused tests; expect pass.

### Task 5: Frontend release gates and one commit

- [ ] Run `npm run test:unit`.
- [ ] Run `npm run test:ui`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check` and inspect staged paths.
- [ ] Stage only Work Score FE, router, navigation, locale, test, and plan files.
- [ ] Create one commit: `feat(work-score): add scoring workspace`.
