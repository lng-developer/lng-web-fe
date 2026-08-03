# Finance Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a scoped operational Finance workspace backed by authoritative global, department, team, own, and shop access rules.

**Architecture:** Add one Finance scope resolver at the backend service boundary, extend snapshot summaries with safe presentation data, and build one lazy React route with three internal tabs. Reuse existing API client, TanStack Query, Ant Design, shared filters/tables/modals/toasts, permissions, and i18n.

**Tech Stack:** Node.js, Express, MongoDB, Mongoose, Joi, Jest, React, TypeScript, Ant Design, TanStack Query, React Router, Vitest.

## Global Constraints

- Backend scope is authoritative; never filter global finance data in the frontend.
- Never authorize by hardcoded role name.
- All users may see full financial breakdown only inside their effective scope.
- Imports require global `FINANCE:WRITE`.
- Keep Report analytics separate.
- Do not add dependencies or intermediate commits.
- Finish with exactly one `feat(finance): add scoped operations workspace` commit per changed repository.

---

### Task 1: Authoritative Finance scope resolver

**Files:** create `src/modules/finance/services/financeAccess.service.js`; modify snapshot/import services, validator, repository; test under `src/test/finance`.

- [ ] Write focused tests for global, department, team, own, shop, mixed-union, and rejected explicit filters.
- [ ] Implement `resolveFinanceReadFilter(query, authContext)` and `assertFinanceWriteAccess(snapshot, authContext)` using existing auth scopes.
- [ ] Apply the resolver to snapshot list/detail/summary/recalculation.
- [ ] Restrict import list/read/write/reprocess to global Finance access.
- [ ] Run `npx jest src/test/finance --runInBand` and architecture contracts.

### Task 2: Safe summary and scoped filter data

**Files:** modify finance repository/service/controller/DTO/routes and tests.

- [ ] Add currency-separated operational summary for the current scope.
- [ ] Return a safe scope descriptor and filter option labels without exposing ObjectIDs as UI copy.
- [ ] Add date, seller, team, department, and missing-cost filters supported by indexes.
- [ ] Keep existing snapshot response compatibility.
- [ ] Run focused Finance tests.

### Task 3: Frontend API and presentation model

**Files:** create `src/features/portal/finance/api/*`, `model/*`; create tests in `src/test/portal/finance`.

- [ ] Add typed list, summary, detail, recalculate, import, batch, and reprocess calls using the shared API client.
- [ ] Add stable query keys and pure currency/status/margin presentation helpers.
- [ ] Verify empty params are omitted and mutations use exact routes.

### Task 4: Finance workspace UI

**Files:** create Finance page/components/styles and UI tests.

- [ ] Build Overview metrics and Needs attention queue.
- [ ] Build Order profitability table and centered breakdown modal.
- [ ] Build global-only Imports and reconciliation tab with upload modal and batch diagnostics.
- [ ] Keep write actions hidden without effective permission and retain modal state on errors.
- [ ] Run focused UI tests.

### Task 5: Route, navigation, i18n, and delivery

**Files:** modify router, navigation, EN/VI locales, navigation/route tests.

- [ ] Add lazy `/portal/finance` route and one Portal Operations sidebar item.
- [ ] Add complete EN/VI copy and permission-aware navigation.
- [ ] Run FE focused tests, typecheck, lint, and build; run BE Finance and architecture tests.
- [ ] Create one final commit per repository, fast-forward merge into `refactor/fe-foundation`, rerun focused gates, then remove worktrees and merged branches. Do not push.
