# HR Operations Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver manager-first Attendance/Schedule workbenches and a payroll-result register with detail, adjustment controls, and export.

**Architecture:** Keep HR as a modular monolith. Add bounded, HR-owned read contracts where existing list endpoints cannot efficiently produce a month matrix or employee-result payroll register. FE composes those contracts through existing TanStack Query/API-client patterns and reuses Operations components, dialogs and capability-based actions.

**Tech Stack:** React, MUI, Tailwind utility styles, TanStack Query, Node/Express, MongoDB, node:test.

## Global Constraints

- Use backend-provided permissions/capabilities; never infer access from role names.
- Matrix/export responses must be filtered to the authenticated user’s authorized HR scope.
- Do not fan out browser requests per employee/day or calculate compensation client-side.
- Preserve attendance resolution precedence, payroll lifecycle, and existing leave/OT/adjustment actions.
- No new frontend dependencies; CSV export uses browser APIs.
- Keep staff calendar read-only for manager-only fields; use text plus color for every status.

---

### Task 1: Define bounded HR manager read contracts

**Files:**

- Modify: `C:/lng_system/lng-web/lng-web-be/src/modules/hr/routes/index.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/src/modules/hr/controllers/attendance.controller.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/src/modules/hr/controllers/payroll.controller.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/src/modules/hr/services/attendance.service.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/src/modules/hr/services/payroll.service.js`
- Modify: HR validators/DTOs/repositories used by those services
- Test: `C:/lng_system/lng-web/lng-web-be/src/test/hr/services/attendance*.test.js`
- Test: `C:/lng_system/lng-web/lng-web-be/src/test/hr/services/payroll*.test.js`

**Interfaces:**

- Produces `GET /api/hr/attendance/month-matrix?year&month&teamId&departmentId&shiftId&q&exceptionsOnly&page&limit`.
- Produces `GET /api/hr/payrolls/results?year&month&status&q&page&limit` and `GET /api/hr/payrolls/results/export` with the same filters.
- Each result item exposes server-authorized `capabilities`; matrix cells expose final status, work-day value, timestamps, leave/OT and planned-shift summary.

- [ ] **Step 1: Write failing authorization and shape tests**
      Assert an unauthorized request is 403, a scoped manager only receives authorized profiles/results, and a month response has `items`, `days`, `summary`, `pagination`.
- [ ] **Step 2: Run focused tests**
      Run: `npm test -- --testPathPattern=hr`
      Expected: new endpoint/shape tests fail because routes do not exist.
- [ ] **Step 3: Implement minimal controllers, validators and service queries**
      Reuse HR access assertions and repositories; aggregate only the requested month and page. Return payroll result components from persisted payroll data, never recompute salary in controller code.
- [ ] **Step 4: Add CSV streaming/serialization test**
      Assert header order, VND numeric values, CSV escaping and the same scoped filters as the register.
- [ ] **Step 5: Run focused HR suites and commit**
      Run: `npm test -- --testPathPattern=hr`
      Commit: `feat(hr): add manager operations read models`

### Task 2: Build shared month-matrix primitives

**Files:**

- Create: `src/features/hr-time/components/MonthlyStaffMatrix.jsx`
- Create: `src/features/hr-time/components/AttendanceDayCell.jsx`
- Create: `src/features/hr-time/utils/monthMatrix.js`
- Modify: `src/features/hr-time/api/hrTime.keys.js`
- Modify: `src/features/hr-time/api/hrTime.queries.js`
- Modify: `src/features/hr-time/utils/hrTimeApi.js`
- Test: `src/features/hr-time/utils/monthMatrix.test.js`

**Interfaces:**

- `buildMonthColumns(year, month) -> Array<{dateKey,label,isWeekend}>`.
- `mapMatrixRow(apiRow) -> { profile, cells, totals, capabilities }`.
- `MonthlyStaffMatrix({ rows, days, onCellOpen, loading })`.

- [ ] **Step 1: Write failing mapper tests**
      Assert 31-day months, weekend flags, absent cells and a leave/OT/check-in-out cell map to one primary status plus secondary text.
- [ ] **Step 2: Run mapper test**
      Run: `node --test src/features/hr-time/utils/monthMatrix.test.js`
      Expected: fail because helpers do not exist.
- [ ] **Step 3: Implement compact, accessible matrix primitives**
      Use a sticky employee column, month columns, text labels/tooltips and keyboard-operable cells. Do not mutate from a cell.
- [ ] **Step 4: Add query hook and mapping test**
      Add `useAttendanceMonthMatrixQuery(params)` through `apiClient` and the new endpoint constant; assert query key includes every filter.
- [ ] **Step 5: Run focused tests/lint and commit**
      Run: `node --test src/features/hr-time/**/*.test.js` then `npm run lint`
      Commit: `feat(hr): add monthly staff matrix primitives`

### Task 3: Upgrade Attendance and Schedule manager workbenches

**Files:**

- Modify: `src/features/hr-time/pages/AttendanceDeskPage.jsx`
- Modify: `src/features/hr-time/pages/SchedulePage.jsx`
- Create: `src/features/hr-time/components/HrOperationsSummaryCards.jsx`
- Create: `src/features/hr-time/components/StaffMonthlyCalendar.jsx`
- Modify: `src/features/hr-time/components/AttendanceAdjustmentDialog.jsx`
- Test: `src/features/hr-time/hrTimeOperationsComposition.test.js`

**Interfaces:**

- Attendance card click updates URL filters and refetches server-side.
- Matrix cell opens `AttendanceAdjustmentDialog` only when `cell.capabilities.adjust` is true.
- Staff calendar consumes only the current user’s attendance/leave/OT records.

- [ ] **Step 1: Write failing composition tests**
      Assert Attendance uses month-matrix query, summary cards set filters, Schedule selects manager matrix versus personal calendar, and no role-name check is introduced.
- [ ] **Step 2: Run composition tests**
      Run: `node --test src/features/hr-time/hrTimeOperationsComposition.test.js`
      Expected: fail on the missing components/query usage.
- [ ] **Step 3: Implement workbench layouts**
      Replace inline dense tables with header, compact action cards, fixed filter toolbar and the shared matrix. Keep schedule configuration tabs and permission gates intact.
- [ ] **Step 4: Implement staff calendar**
      Render Leave, OT, check-in/out and final state in each day; a day click opens read-only detail rather than an HR adjustment dialog.
- [ ] **Step 5: Run tests/lint/build and commit**
      Run: `node --test src/features/hr-time/*.test.js`; `npm run lint`; `npm run build`
      Commit: `feat(hr): redesign attendance and schedule workbenches`

### Task 4: Add payroll-result register, drawer and export

**Files:**

- Modify: `src/services/endpoints.js`
- Modify: `src/features/hr-payroll/api/hrPayroll.queries.js`
- Modify: `src/features/hr-payroll/utils/hrPayrollApi.js`
- Modify: `src/features/hr-payroll/pages/PayrollRunsPage.jsx`
- Modify: `src/features/hr-payroll/components/PayrollReviewDrawer.jsx`
- Create: `src/features/hr-payroll/utils/payrollCsv.js`
- Test: `src/features/hr-payroll/hrPayrollApi.test.js`
- Test: `src/features/hr-payroll/payrollCsv.test.js`
- Test: `src/features/hr-payroll/hrPayrollComposition.test.js`

**Interfaces:**

- `usePayrollResultsQuery(filters)` returns paginated employee results and summary.
- `buildPayrollCsv(rows)` returns escaped CSV with Employee, Team, Base salary, Allowances, OT, Deductions, Gross, Net, Status.
- Drawer receives a server result/detail, its capabilities and existing mutation callbacks.

- [ ] **Step 1: Write failing API/CSV tests**
      Assert query uses the result-register endpoint; CSV escapes a comma/quote in employee names and exports numeric components without formatted currency strings.
- [ ] **Step 2: Run focused tests**
      Run: `node --test src/features/hr-payroll/hrPayrollApi.test.js src/features/hr-payroll/payrollCsv.test.js`
      Expected: fail because result query/CSV builder do not exist.
- [ ] **Step 3: Implement register and export**
      Use current URL filters, Operations table and browser `Blob`/`URL.createObjectURL`; call server export when pagination means the current page is incomplete.
- [ ] **Step 4: Extend drawer and guarded actions**
      Show breakdown, calculation inputs and audit state. Render adjustment/finalize/mark-paid only from capabilities and lifecycle state; show pending, success and error feedback.
- [ ] **Step 5: Run tests/lint/build and commit**
      Run: `node --test src/features/hr-payroll/*.test.js`; `npm run lint`; `npm run build`
      Commit: `feat(hr): add payroll operations register`

### Task 5: End-to-end contract verification and browser acceptance

**Files:**

- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`
- Test: existing HR route/composition tests

- [ ] **Step 1: Add only missing copy**
      Add status labels, matrix legend, export errors and empty-state instructions in both locales; no hardcoded manager-only copy in components.
- [ ] **Step 2: Run FE and BE focused suites**
      Run FE `node --test src/features/hr-time/*.test.js src/features/hr-payroll/*.test.js`; run BE HR suites created in Task 1.
- [ ] **Step 3: Run production checks**
      Run: `npm run lint` and `npm run build` in FE; run backend syntax/tests for touched HR modules.
- [ ] **Step 4: Browser acceptance with an HR manager**
      Verify: authorized month matrix, summary-card filter, cell detail/adjustment, staff calendar privacy, payroll register filtering, CSV export and lifecycle action visibility.
- [ ] **Step 5: Commit and document evidence**
      Commit: `test(hr): verify operations workspace flows`
