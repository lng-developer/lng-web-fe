# Report Executive Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive, 30-day executive overview without page-level horizontal overflow.

**Architecture:** Keep report API contracts unchanged. Aggregate finance rows into display periods in the Report feature, render a lightweight responsive trend, and constrain every grid child with `min-width: 0`.

**Tech Stack:** React, TypeScript, Ant Design, TanStack Query, Day.js, SCSS modules, Vitest.

## Global Constraints

- No new dependency.
- Keep currencies separate.
- Preserve permission and scope behavior.

---

### Task 1: Lock the dashboard behavior

**Files:**

- Modify: `src/test/portal/reports/pages/ReportWorkspacePage.test.tsx`

- [x] Add assertions for the latest-30-day default query and bounded trend labels.
- [x] Run the focused test and verify it fails for the missing behavior.

### Task 2: Build the responsive overview

**Files:**

- Create: `src/features/portal/reports/pages/ReportTrendChart.tsx`
- Modify: `src/features/portal/reports/pages/ReportWorkspacePage.tsx`
- Modify: `src/features/portal/reports/pages/ReportWorkspacePage.module.scss`

- [x] Initialize the date range to the latest 30 days.
- [x] Aggregate rows daily up to 60 days and weekly above 60 days.
- [x] Replace the wide bar chart with a responsive trend and executive insight grid.
- [x] Add `min-width: 0` containment to page, grid, cards, and chart.
- [x] Run focused tests and verify they pass.

### Task 3: Verify the runtime

**Files:**

- Test: `src/test/portal/reports/pages/ReportWorkspacePage.test.tsx`

- [x] Run lint, typecheck, focused tests, and production build.
- [x] Open `/portal/reports` and verify document width equals viewport width with no console errors.
