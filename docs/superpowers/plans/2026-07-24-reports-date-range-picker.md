# Reports Date Range Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Reports' two native date inputs with the shared draft-and-apply `DateRangePicker`.

**Architecture:** Keep URL filters as `YYYY-MM-DD` strings. A small Reports utility converts those strings to the shared picker's `{ start, end }` Dayjs value and serializes Apply/Clear back once.

**Tech Stack:** React, React Router search params, Dayjs, MUI, shared DateRangePicker.

## Global Constraints

- Reuse `src/components/form/DateRangePicker.jsx`; add no dependency and no backend change.
- Draft calendar selections do not change filters until Apply; Clear removes both URL parameters.

---

### Task 1: Date range filter conversion

**Files:**

- Create: `src/features/reports/utils/reportDateRange.js`
- Test: `src/features/reports/utils/reportDateRange.test.js`

- [x] Write tests for valid strings, empty values, and serializing an applied range as `YYYY-MM-DD`.
- [x] Implement `toReportDateRange(filters)` and `fromReportDateRange(range)` using Dayjs.
- [x] Run `node --test src/features/reports/utils/reportDateRange.test.js`.

### Task 2: Reports picker integration

**Files:**

- Modify: `src/features/reports/pages/ReportsPage.jsx`
- Modify: `src/features/reports/pages/reportsPageComposition.test.js`

- [x] Add a failing composition assertion for `DateRangePicker` and removal of native `type="date"` inputs.
- [x] Render the shared picker full-width; Apply updates `dateFrom` and `dateTo` in one URL update, Clear removes both.
- [x] Run focused report tests, ESLint, and production build.
- [ ] Chrome-check Apply/Clear URL synchronization.
