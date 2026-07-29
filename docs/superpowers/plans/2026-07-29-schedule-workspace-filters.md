# Schedule Workspace Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/hr/schedule` permission-safe, add practical Assignment filters, and keep the Holiday list synchronized with its selected year.

**Architecture:** Keep query state in URLSearchParams and reuse existing TanStack Query hooks. Extend only the assignment list contract with effective-date overlap filters; Holiday already accepts date range filters. Employee selection uses the existing debounced `q` list query rather than a new API.

**Tech Stack:** React, MUI, TanStack Query, Express, Mongoose, Jest, Node test runner.

## Global Constraints

- Reuse existing components and API client; add no dependencies.
- Preserve authorization through backend permissions and existing helpers.
- Do not add delete endpoints for Shift, Location, Assignment, or Override.
- Keep URL state shareable and reset pagination whenever a filter changes.

---

### Task 1: Permission-safe Schedule tabs

**Files:**

- Modify: `src/features/hr-time/pages/SchedulePage.jsx`
- Test: `src/features/hr-time/hrTimeOperationsComposition.test.js`

**Consumes:** `canScheduleRead`, `canCalendarRead`, and `resolveScheduleTab`.

**Produces:** Visible tabs limited to authorized configuration and calendar workspaces; old or unauthorized tab URLs resolve to the first permitted tab.

- [ ] **Step 1: Write the failing test**

```js
assert.match(schedule, /const visibleTabs = tabs\.filter/)
assert.match(schedule, /items=\{visibleTabs\.map/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="permission-safe Schedule tabs" src/features/hr-time/hrTimeOperationsComposition.test.js`

Expected: fail because `visibleTabs` is absent.

- [ ] **Step 3: Write minimal implementation**

```js
const visibleTabs = tabs.filter((value) =>
  ['assignments', 'shifts', 'locations', 'overrides'].includes(value)
    ? canScheduleRead
    : canCalendarRead,
)
```

Pass `visibleTabs` to `OperationsTabs`; retain `resolveScheduleTab` for URL fallback.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --test-name-pattern="permission-safe Schedule tabs" src/features/hr-time/hrTimeOperationsComposition.test.js`

Expected: pass.

### Task 2: Assignment query date overlap contract

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\validators\schedule.validator.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\repositories\schedule.repository.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\test\hr\repositories\schedule.repository.test.js`

**Consumes:** Existing `listScheduleSchema` and `listAssignments` filters.

**Produces:** Optional `effectiveFrom` / `effectiveTo` parameters that return assignments overlapping the requested interval.

- [ ] **Step 1: Write the failing repository test**

```js
await repository.listAssignments({
  page: 1,
  limit: 20,
  effectiveFrom: '2026-07-01',
  effectiveTo: '2026-07-31',
})
expect(ShiftAssignment.find).toHaveBeenCalledWith({
  effectiveFrom: { $lte: '2026-07-31' },
  $or: [{ effectiveTo: null }, { effectiveTo: { $gte: '2026-07-01' } }],
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/test/hr/repositories/schedule.repository.test.js --runInBand`

Expected: filter lacks effective-date constraints.

- [ ] **Step 3: Write minimal implementation**

Add both date keys to `listScheduleSchema`. In `listAssignments`, compose date constraints with existing profile scope filters using `$and`, preserving `effectiveTo: null` handling. Validate `effectiveFrom <= effectiveTo` in the list schema custom rule.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/test/hr/repositories/schedule.repository.test.js src/test/hr/services/schedule.service.test.js --runInBand`

Expected: pass.

### Task 3: Assignment workbench filters and remote employee search

**Files:**

- Modify: `src/features/hr-time/pages/SchedulePage.jsx`
- Test: `src/features/hr-time/hrTimeOperationsComposition.test.js`

**Consumes:** Assignment params `profileId`, `shiftId`, `workLocationId`, `status`, `effectiveFrom`, `effectiveTo`; `useEmployeeProfilesQuery` with `q`.

**Produces:** URL-backed Assignment filters and an employee search input that only queries matching profiles.

- [ ] **Step 1: Write the failing test**

```js
assert.match(schedule, /effectiveFrom/)
assert.match(schedule, /effectiveTo/)
assert.match(schedule, /shiftId/)
assert.match(schedule, /workLocationId/)
assert.match(schedule, /employeeSearch/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="Assignment workbench filters" src/features/hr-time/hrTimeOperationsComposition.test.js`

Expected: fail because the filters and search state are absent.

- [ ] **Step 3: Write minimal implementation**

Use `Autocomplete` with server-backed employee options from `useEmployeeProfilesQuery({ page: 1, limit: 20, status: 'ACTIVE', q: employeeSearch })`, while retaining the separate directory query only where calendar/rotation dialogs need it. Add MUI selects for Shift, Location, Status and `DatePicker` controls for effective dates. Build the assignment query from URL state and reset page on every filter change.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --test-name-pattern="Assignment workbench filters" src/features/hr-time/hrTimeOperationsComposition.test.js`

Expected: pass.

### Task 4: Holiday list year synchronization

**Files:**

- Modify: `src/features/hr-time/pages/SchedulePage.jsx`
- Test: `src/features/hr-time/hrTimeOperationsComposition.test.js`

**Consumes:** Existing `useHolidaysQuery` date range contract.

**Produces:** Holiday list and summary scoped to the same selected year.

- [ ] **Step 1: Write the failing test**

```js
assert.match(schedule, /dateFrom: `\$\{holidayYear\}-01-01`/)
assert.match(schedule, /dateTo: `\$\{holidayYear\}-12-31`/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="Holiday list follows selected year" src/features/hr-time/hrTimeOperationsComposition.test.js`

Expected: fail because the current holiday list does not receive a date range.

- [ ] **Step 3: Write minimal implementation**

Derive a validated `holidayYear` from URL state and pass its January-to-December range into `useHolidaysQuery`, together with the existing permission scope params. Add a Year filter in the Holiday toolbar.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --test-name-pattern="Holiday list follows selected year" src/features/hr-time/hrTimeOperationsComposition.test.js`

Expected: pass.

### Task 5: Integrated verification

**Files:**

- Modify only files from Tasks 1–4.

- [ ] **Step 1: Run focused frontend tests**

Run: `node --test src/features/hr-time/hrTimeOperations.test.js src/features/hr-time/hrTimeOperationsComposition.test.js`

- [ ] **Step 2: Run frontend lint**

Run: `npx eslint src/features/hr-time/pages/SchedulePage.jsx src/features/hr-time/hrTimeOperationsComposition.test.js`

- [ ] **Step 3: Run backend checks**

Run: `npx jest src/test/hr/repositories/schedule.repository.test.js src/test/hr/services/schedule.service.test.js --runInBand`

- [ ] **Step 4: Check diff integrity**

Run: `git diff --check` in both repositories.
