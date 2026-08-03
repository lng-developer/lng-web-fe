# Report Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a scoped Report backend contract and a three-tab Portal report workspace.

**Architecture:** Report resolves authorization once and passes safe query dimensions through existing public ports. The frontend lazy-loads one route, keeps shared filters at page level, and enables queries only for the active tab.

**Tech Stack:** Node.js, Express, Jest, React, TypeScript, Ant Design, TanStack Query, Vitest.

## Global Constraints

- Do not add dependencies.
- Never expose data outside the caller's global, department, team, own, or shop scope.
- Keep currencies separate.
- Keep tests under `src/test`, not beside production files.
- Commit once per repository after the complete module passes its gate.

---

### Task 1: Scoped backend report contract

**Files:**

- Modify: `src/modules/report/services/report.service.js`
- Modify: `src/modules/report/validators/report.validator.js`
- Modify: `src/modules/report/controllers/report.controller.js`
- Modify: `src/modules/report/routes/index.js`
- Modify: `src/modules/finance/public.js`
- Modify: `src/modules/finance/services/financeSnapshot.service.js`
- Test: `src/test/report/services/report.service.test.js`
- Test: `src/test/report/validators/report.validator.test.js`
- Test: `src/test/report/routes/index.test.js`

**Interfaces:**

- Produces: `GET /api/reports/filter-options` and scoped report queries using `accessOr` for finance dimensions.

- [ ] Write failing tests for department, team, own, unsupported source scopes, `departmentId`, and filter options.
- [ ] Run `npx jest src/test/report --runInBand` and confirm expected failures.
- [ ] Implement the smallest scope resolver and filter-options public port.
- [ ] Run the focused report tests until green.

### Task 2: Frontend report API and route

**Files:**

- Create: `src/features/portal/reports/api/reportApi.ts`
- Modify: `src/app/router/router.tsx`
- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/i18n/locales/en.ts`
- Modify: `src/i18n/locales/vi.ts`
- Test: `src/test/portal/reports/api/reportApi.test.ts`
- Test: `src/test/hr/pages/StaffWorkspacePage.test.tsx`

**Interfaces:**

- Produces: typed report loaders, `/portal/reports`, and permission-aware navigation.

- [ ] Write failing API and navigation tests.
- [ ] Run the focused Vitest files and confirm expected failures.
- [ ] Add loaders, lazy route, navigation entry, and translations.
- [ ] Run the focused tests until green.

### Task 3: Three-tab report workspace

**Files:**

- Create: `src/features/portal/reports/pages/ReportWorkspacePage.tsx`
- Create: `src/features/portal/reports/pages/ReportWorkspacePage.module.scss`
- Test: `src/test/portal/reports/pages/ReportWorkspacePage.test.tsx`

**Interfaces:**

- Consumes: report API loaders and shared `PageHeader`, `FilterBar`, `DateRangePicker`, `MetricCard`, `SectionCard`, and `DataTable`.
- Produces: executive, sales/finance, and operations tabs with active-tab-only fetching.

- [ ] Write a failing component test for currency separation, filters, and lazy tab queries.
- [ ] Run the focused page test and confirm expected failure.
- [ ] Implement the page with existing Ant Design and a native trend visualization.
- [ ] Run the focused page test until green.

### Task 4: Verification and delivery

**Files:**

- Verify all files above.

- [ ] Run BE report tests.
- [ ] Run FE report tests, lint, typecheck, and production build.
- [ ] Review both diffs for ObjectId display and scope leaks.
- [ ] Create one Report-module commit in BE and one in FE.
