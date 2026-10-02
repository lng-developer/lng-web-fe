# HR Self and Team Scopes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the existing HR UI changes so Personal is self-only and Team management is limited to eligible backend team scopes.

**Architecture:** Retain the current HR page hierarchy and centralize selected-team derivation in existing HR hooks. Personal pages never borrow team query state; Team pages use the same selected team for workspace, attendance, requests, schedule and members.

**Tech Stack:** React, TypeScript, TanStack Query, Ant Design, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-03-rbac-workflow-ui-design.md`

## Global Constraints

- Preserve all existing dirty HR changes; do not replace or reset them.
- Treat absent eligible team scope as no team access, never as an unrestricted query.
- Keep API calls through `hrTimeApi` and existing hooks.

## Review Focus

- Personal attendance/request/schedule calls never contain `teamId`.
- A leader with one team gets that team automatically.
- A leader with multiple teams must select one before team data loads.
- A user with no HR team scope has no Team navigation and no team query.
- Changing the team resets pagination/selection and refetches each team surface.

---

### Task 1: Central team-scope derivation and query keys

**Files:**

- Modify: `src/features/hr/hrViews.ts`
- Modify: `src/features/hr/hrNavigation.ts`
- Modify: `src/features/hr/api/hrKeys.ts`
- Modify: `src/features/hr/hooks/useHrQueries.ts`
- Test: `src/test/hr/hrViews.test.ts`
- Test: `src/test/hr/hrNavigation.test.ts`

**Interfaces:**

- Produces: one selected-team input for HR team query hooks and navigation visibility.
- Consumes: `CurrentAccount.scopes` and backend HR permission strings.

- [ ] **Step 1: Write failing scope tests**

Cover no eligible scope, one eligible team, and multiple eligible teams; assert Personal links remain available independently.

- [ ] **Step 2: Run scope tests to verify they fail**

Run: `npm run test:unit -- src/test/hr/hrViews.test.ts src/test/hr/hrNavigation.test.ts`
Expected: FAIL for missing explicit-selection/no-query behavior.

- [ ] **Step 3: Implement the minimal shared derivation**

Derive eligible team IDs only from team scopes carrying HR read permissions; include the selected team in team query keys and return disabled query inputs until selection is valid.

- [ ] **Step 4: Run scope tests to verify they pass**

Run: `npm run test:unit -- src/test/hr/hrViews.test.ts src/test/hr/hrNavigation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "fix(hr): centralize frontend team scope selection"`

### Task 2: Complete personal/team surfaces

**Files:**

- Modify: `src/features/hr/pages/Attendance/useAttendance.tsx`
- Modify: `src/features/hr/pages/TimeRequests/useTimeRequest.tsx`
- Modify: `src/features/hr/ScheduleCalendar/useScheduleCalendar.tsx`
- Modify: `src/features/hr/pages/HrModulePage.tsx`
- Modify: `src/features/hr/pages/HrActionPage.tsx`
- Test: `src/test/hr/pages/AttendancePage.test.tsx`
- Test: `src/test/hr/pages/TimeRequests/timeRequestAccess.test.ts`
- Test: `src/test/hr/schedule/useScheduleCalendar.test.ts`

**Interfaces:**

- Consumes: Task 1 selected-team hook/query inputs.
- Produces: self-only Personal requests and consistent selected-team Team requests.

- [ ] **Step 1: Write failing surface tests**

Assert personal params omit `teamId`; assert team attendance, requests and schedule include the same selected team; assert no selected team disables team fetches.

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `npm run test:ui -- src/test/hr/pages/AttendancePage.test.tsx src/test/hr/pages/TimeRequests/timeRequestAccess.test.ts src/test/hr/schedule/useScheduleCalendar.test.ts`
Expected: FAIL on one or more cross-surface parameter mismatches.

- [ ] **Step 3: Complete the current dirty HR implementation**

Pass the shared selected team only into Team workspace hooks, reset page/filter UI on team change, and keep Personal branches isolated from team inputs.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm run test:ui -- src/test/hr/pages/AttendancePage.test.tsx src/test/hr/pages/TimeRequests/timeRequestAccess.test.ts src/test/hr/schedule/useScheduleCalendar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "fix(hr): enforce personal and team UI query scopes"`
