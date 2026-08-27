# Primary Workbenches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the decision speed and visual clarity of the Operations Dashboard and Order Workbench without changing contracts or workflow scope.

**Architecture:** Keep route ownership and query hooks unchanged. Improve composition in the existing pages with their shared UI primitives and co-located SCSS; use URL/query state and page-local UI state only where the page already does so.

**Tech Stack:** React 19, Ant Design 6, TanStack Query 5, React Router 7, SCSS modules, i18next, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-27-primary-workbenches-design.md`

## Global Constraints

- No new dependency, API endpoint, permission, or query-key contract.
- Use existing shared UI and i18n keys; add matching English and Vietnamese keys for all new copy.
- Preserve keyboard interaction, visible focus, reduced motion, loading/error/empty states, and route guards.
- Tests live under `src/test/foundation/` and `src/test/portal/orders/`.

---

### Task 1: Operations Dashboard queue-first hierarchy

**Files:**

- Modify: `src/features/foundation/OperationsDashboardPage.tsx`
- Modify: `src/features/foundation/OperationsDashboardLists.tsx`
- Modify: `src/features/foundation/FoundationPage.module.scss`
- Create: `src/test/foundation/OperationsDashboardPage.test.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes: the existing `useOperationsDashboard` result and existing dashboard list/chart props.
- Produces: an action-oriented dashboard where the first visible content is actionable queue status.

- [ ] **Step 1: Write the failing dashboard test**

```tsx
it('shows the action queue before analytic charts', () => {
  render(<OperationsDashboardPage />)
  expect(screen.getByRole('heading', { name: /action queue/i })).toBeVisible()
})
```

- [ ] **Step 2: Run the test and verify the failure**

Run: `npm.cmd exec -- vitest run src/test/foundation/OperationsDashboardPage.test.tsx --project ui --maxWorkers=1`

- [ ] **Step 3: Implement the minimum queue-first composition**

Move only existing queue/list content ahead of charts, reuse `MetricCard`, `SectionCard`, `FeedbackAlert`, and existing dashboard data. Add no query and no new derived server state.

- [ ] **Step 4: Add matching i18n keys and responsive SCSS**

Use existing English/Vietnamese locale files and a one-column layout below the current narrow breakpoint.

- [ ] **Step 5: Run the focused test, lint, and build**

Run: `npm.cmd exec -- vitest run src/test/foundation/OperationsDashboardPage.test.tsx --project ui --maxWorkers=1`, `npm run lint`, `npm run build`.

### Task 2: Order Workbench scan-and-act layout

**Files:**

- Modify: `src/features/portal/orders/pages/OrderWorkbenchPage.tsx`
- Modify: `src/features/portal/orders/pages/OrderWorkbenchPage.module.scss`
- Modify: `src/features/portal/orders/pages/OrderWorkbenchFilterBar.tsx`
- Test: `src/test/portal/orders/pages/OrderWorkbenchPage.test.tsx`
- Test: `src/test/portal/orders/pages/OrderWorkbenchStyles.source.test.ts`

**Interfaces:**

- Consumes: existing orders API hooks, URL filters, `OrderInlinePanel`, and row actions.
- Produces: filters, selected queue state, and next actions that remain visible without duplicating order data.

- [ ] **Step 1: Write a failing focused behavior test**

```tsx
it('keeps the selected queue count and filter actions visible while results render', async () => {
  render(<OrderWorkbenchPage />)
  expect(await screen.findByRole('region', { name: /order filters/i })).toBeVisible()
})
```

- [ ] **Step 2: Run the test and verify the failure**

Run: `npm.cmd exec -- vitest run src/test/portal/orders/pages/OrderWorkbenchPage.test.tsx --project ui --maxWorkers=1`

- [ ] **Step 3: Implement the minimum composition change**

Reuse the current filter bar, table, inline panel, status tags, and query hooks. Keep the active filters and selected-order action context visible; do not introduce a second table, drawer, or fetch path.

- [ ] **Step 4: Verify narrow-width layout**

Add only the SCSS rules needed to stack controls and keep table overflow inside its existing container.

- [ ] **Step 5: Run focused tests, lint, and build**

Run: `npm.cmd exec -- vitest run src/test/portal/orders/pages/OrderWorkbenchPage.test.tsx --project ui --maxWorkers=1`, `npm run lint`, `npm run build`.
