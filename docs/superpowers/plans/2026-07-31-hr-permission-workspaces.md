# HR Permission Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver personal, team, HR operations, and payroll workspaces selected by backend permissions and scope.

**Architecture:** Keep `/hr` as the single route. A pure workspace resolver controls navigation; each workspace owns its data queries and only the backend decides scope visibility. Existing HR operation pages are reused inside an operations container.

**Tech Stack:** React 19, TypeScript, Ant Design, TanStack Query, react-i18next, Express, Joi, MongoDB.

## Global Constraints

- No role-name checks in frontend navigation.
- All visible copy uses VN/EN i18n keys.
- Tests remain under `src/test`.
- No new dependency.
- No intermediate commits while the feature is being refined.

---

### Task 1: Permission workspace resolver

**Files:**

- Modify: `src/features/hr/hrViews.ts`
- Test: `src/test/hr/hrViews.test.ts`

- [ ] Add failing cases for self, team, operations, and payroll visibility plus default ordering.
- [ ] Run `npx vitest run src/test/hr/hrViews.test.ts` and verify failure.
- [ ] Implement `getHrWorkspaces(permissions)` with permission bundles and no role checks.
- [ ] Re-run the focused test and verify pass.

### Task 2: Personal self-service data and UI

**Files:**

- Modify: backend HR attendance validator, controller, service, and routes for `GET /api/hr/schedule/me`.
- Modify: `src/features/hr/api/hrTimeApi.ts`
- Create: `src/features/hr/pages/StaffWorkspacePage.tsx`
- Test: backend HR routes/service and `src/test/hr/api/hrTimeApi.test.ts`

- [ ] Add failing contract tests proving `/schedule/me` returns only the authenticated profile's resolved dates.
- [ ] Implement the endpoint with `resolveWorkContext`, a validated maximum 31-day range, and `HR_ATTENDANCE:WRITE` access.
- [ ] Add FE contract test and API wrapper.
- [ ] Build the grouped personal workspace from profile, schedule, attendance, balances, requests, payroll, and announcements that the account can read.
- [ ] Verify focused BE and FE tests.

### Task 3: Scoped manager workspace

**Files:**

- Create: `src/features/hr/pages/TeamWorkspacePage.tsx`
- Test: `src/test/hr/pages/TeamWorkspacePage.test.tsx`

- [ ] Add a failing render test for grouped team metrics, attendance, approval queues, and member directory.
- [ ] Implement queries through existing scoped employee, attendance, leave, overtime, and schedule endpoints.
- [ ] Keep approval actions capability/permission gated and use existing feedback toast.
- [ ] Re-run focused tests.

### Task 4: Route composition and translations

**Files:**

- Modify: `src/features/hr/pages/HrModulePage.tsx`
- Create: `src/features/hr/pages/HrOperationsWorkspacePage.tsx`
- Modify: `src/shared/i18n/locales/{vi,en}/common.json`
- Modify: `src/app/layout/AppSidebar.tsx`
- Test: `src/test/hr/hrViews.test.ts`, `src/test/app/layout/AppSidebar.test.tsx`, locale parity test.

- [ ] Add failing navigation and locale-key tests.
- [ ] Compose workspace tabs and nested operation sections with lazy imports.
- [ ] Default to self, then team, then operations, then payroll according to granted permission.
- [ ] Run focused tests, lint, `npx tsc -b --pretty false`, and `npm run build`.

### Task 5: Focused HR action routes

**Files:**

- Modify: `src/app/router/router.tsx`
- Modify: `src/features/hr/pages/HrModulePage.tsx`
- Modify: `src/features/hr/pages/StaffWorkspacePage.tsx`
- Modify: `src/features/hr/pages/TeamWorkspacePage.tsx`
- Create: `src/features/hr/pages/HrActionPage.tsx`
- Test: `src/test/hr/hrRoutes.test.tsx`, existing HR page tests.

- [ ] Add failing route-map tests for personal, team, operations, and payroll action URLs.
- [ ] Add nested lazy HR routes without duplicating existing page implementations.
- [ ] Make workspace metrics and queues link directly to their focused action route.
- [ ] Gate every route and action with backend permission codes, never role names.
- [ ] Preserve one aggregate request on each dashboard; focused pages load only their own resource.
- [ ] Run focused tests, HR regression tests, lint, typecheck, and production build.

### Task 6: Collapse redundant workspace navigation

**Files:**

- Modify: `src/features/hr/pages/HrModulePage.tsx`
- Test: `src/test/hr/pages/HrModulePage.test.tsx`

- [ ] Add a failing render test proving the workspace tab bar is hidden when only one workspace is available.
- [ ] Render workspace tabs only when `workspaces.length > 1`; keep focused action tabs unchanged.
- [ ] Run `npx vitest run src/test/hr/pages/HrModulePage.test.tsx` and `npm run lint`.
