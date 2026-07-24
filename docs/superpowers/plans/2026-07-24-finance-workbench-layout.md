# Finance Workbench Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Finance snapshots into the Reports-style KPI/chart/table layout and replace ID fields with search and dropdown filters.

**Architecture:** Reuse the existing snapshot endpoint. The new `search` UI field maps to the existing partial external-order search contract; shop, channel, marketplace, snapshot status, and cost status remain typed filters.

**Tech Stack:** React, MUI, native SVG, existing Finance query and Shop query hooks.

## Global Constraints

- No new dependency or backend endpoint.
- Preserve the existing `externalOrderId` worktree change and pagination.
- KPI and chart values remain separate per currency.

---

### Task 1: Finance visual composition

**Files:**

- Create: `src/features/finance/components/FinanceRevenueProfitChart.jsx`
- Test: `src/features/finance/components/financeRevenueProfitChartComposition.test.js`

- [x] Write a failing composition test for a Revenue vs Gross profit SVG chart.
- [x] Implement the compact card chart.
- [x] Run its node test.

### Task 2: Finance page refactor

**Files:**

- Modify: `src/features/finance/pages/FinancePage.jsx`
- Modify: `src/features/finance/pages/financePageComposition.test.js`

- [x] Write failing assertions for search, dropdowns, KPI cards, chart, and table card.
- [x] Replace ID controls with search and dropdown controls; move KPIs into content; render the chart and titled table card.
- [x] Run focused tests, ESLint, and production build.
