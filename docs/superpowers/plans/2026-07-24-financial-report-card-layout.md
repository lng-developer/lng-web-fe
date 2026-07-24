# Financial Report Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Daily, Seller, and Team reports the Ads-style KPI cards, chart cards, and titled table cards.

**Architecture:** Keep existing query rows and currency separation. Add only two presentational components: shared KPI cards and a dimension-ranked gross-profit chart for Seller/Team.

**Tech Stack:** React, native SVG, Tailwind utilities, existing OperationsTable.

## Global Constraints

- No API, URL, filter, or backend changes.
- Do not combine currencies.
- Add no dependency.

---

### Task 1: Reusable financial visuals

**Files:**

- Create: `src/features/reports/components/FinancialMetricCards.jsx`
- Create: `src/features/reports/components/DimensionProfitChart.jsx`
- Test: `src/features/reports/components/financialReportVisualsComposition.test.js`

- [x] Write a failing source-composition test requiring five-card KPI layout and a dimension profit chart.
- [x] Implement the two components with Ads-style card chrome and native SVG.
- [x] Run `node --test src/features/reports/components/financialReportVisualsComposition.test.js`.

### Task 2: Compose Daily, Seller, and Team cards

**Files:**

- Modify: `src/features/reports/pages/ReportsPage.jsx`
- Modify: `src/features/reports/pages/reportsPageComposition.test.js`

- [x] Write a failing composition test for KPI cards, seller/team charts, and titled table cards.
- [x] Render metrics and charts by currency; wrap each table in a titled card.
- [x] Run focused report tests, ESLint on modified files, and `npm run build`.

### Task 3: Compact dimension charts and API-backed tab filters

**Files:**

- Modify: `src/features/reports/pages/ReportsPage.jsx`
- Modify: `src/features/reports/components/DimensionProfitChart.jsx`
- Modify: `C:/lng_system/lng-web/lng-web-be/src/modules/report/validators/report.validator.js`
- Modify: `C:/lng_system/lng-web/lng-web-be/src/modules/finance/repositories/financeSnapshot.repository.js`

- [x] Write failing FE/BE tests for seller/team filters and compact charts.
- [x] Accept `sellerEmployeeCode` and `teamId` in the report contract, send them from the active tab, and use compact chart layout.
- [x] Run focused FE/BE tests, ESLint, backend syntax checks, and frontend build.
