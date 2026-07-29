# Attendance Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/hr/attendance` a monthly employee-by-day workbench that surfaces actionable attendance exceptions without changing the HR API or permission model.

**Architecture:** Reuse the existing bounded `GET /api/hr/attendance/month-matrix` query and `MonthlyStaffMatrix` renderer. The page continues to own URL filters, query pagination, detail drawer, and adjustment mutation; the matrix owns only the visual monthly grid and sends selected cells back to the existing adjustment flow.

**Tech Stack:** React 19, MUI, Tailwind, TanStack Query, Node test runner.

## Global Constraints

- Keep `teamId`, `departmentId`, `shiftId`, `q`, `exceptionsOnly`, page, and limit server-side.
- Do not add a client-side status filter: the month-matrix API validator does not accept `status`.
- Do not infer permission from roles; only open adjustment when `cell.capabilities.adjust` is true.
- Keep mobile behavior as horizontal matrix scrolling; add no dependencies.

---

### Task 1: Wire the attendance page to the existing monthly matrix

**Files:**

- Modify: `src/features/hr-time/pages/AttendanceDeskPage.jsx`
- Modify: `src/features/hr-time/hrTimeOperationsComposition.test.js`

**Interfaces:**

- Consumes: `useAttendanceMonthMatrixQuery({ year, month, teamId, departmentId, shiftId, q, exceptionsOnly, page, limit })`.
- Produces: `<MonthlyStaffMatrix year month rows onCellOpen />` with the existing `AttendanceStaffDetailDrawer` retained.

- [ ] **Step 1: Write the failing composition test**

```js
assert.match(attendance, /MonthlyStaffMatrix/)
assert.doesNotMatch(attendance, /AttendanceStaffList/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/hr-time/hrTimeOperationsComposition.test.js`

- [ ] **Step 3: Replace the aggregate employee list with `MonthlyStaffMatrix`**

```jsx
<MonthlyStaffMatrix
  year={year}
  month={month}
  rows={matrix.data?.items || []}
  onCellOpen={(cell) => {
    if (canAdjust(cell)) setAdjusting(cell)
  }}
/>
```

- [ ] **Step 4: Run the composition test to verify it passes**

Run: `node --test src/features/hr-time/hrTimeOperationsComposition.test.js`

### Task 2: Make the matrix scan-friendly

**Files:**

- Modify: `src/features/hr-time/components/MonthlyStaffMatrix.jsx`
- Modify: `src/features/hr-time/utils/monthMatrix.test.js`

**Interfaces:**

- Consumes: `buildMonthColumns(year, month)` and matrix rows from Task 1.
- Produces: weekday-aware headers, employee context, total exception count, and selectable day cells.

- [ ] **Step 1: Write a failing unit test for weekday-aware columns**

```js
assert.equal(buildMonthColumns(2026, 7)[0].weekday, 'Wed')
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run: `node --test src/features/hr-time/utils/monthMatrix.test.js`

- [ ] **Step 3: Add `weekday` to `buildMonthColumns` and render it above each day label**

```js
weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
```

- [ ] **Step 4: Run focused tests and lint**

Run: `node --test src/features/hr-time/utils/monthMatrix.test.js src/features/hr-time/hrTimeOperationsComposition.test.js && npx eslint src/features/hr-time`

### Task 3: Verify production build

**Files:**

- Verify only: attendance page and matrix files above.

- [ ] **Step 1: Run full source lint and production build**

Run: `npx eslint src && npm run build`

- [ ] **Step 2: Confirm clean diff scope and report commit state**

Run: `git status --short && git diff --check`
