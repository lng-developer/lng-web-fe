# Integration Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize Integrations around operational workflows without changing import APIs or persisted filter behavior.

**Architecture:** Keep Orders and Extension as top-level views. Replace the three sibling finance tabs with one Finance data tab containing Ads, Transactions, and Settlements sub-tabs, each retaining its current query, filters, permission state, and pagination.

**Tech Stack:** React, TypeScript, Ant Design, TanStack Query, Vitest.

**Spec:** User-approved Integration page assessment in this Codex task.

## Global Constraints

- Do not change backend routes, query contracts, or permissions.
- Keep direct status filters and date filters local to each finance dataset.
- Reuse `UiTabs`; add no dependency.

---

### Task 1: Finance information architecture

**Files:**
- Modify: `src/features/portal/integrations/pages/IntegrationWorkbenchPage.tsx`
- Test: `src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
fireEvent.click(await screen.findByRole('tab', { name: 'Finance data' }))
expect(await screen.findByRole('tab', { name: 'Ads' })).toBeVisible()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui --maxWorkers=1 src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx --testNamePattern "groups finance imports"`

- [ ] **Step 3: Write minimal implementation**

```tsx
const financeTab = <UiTabs items={[adsItem, transactionsItem, settlementsItem]} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project ui --maxWorkers=1 src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx --testNamePattern "groups finance imports"`

### Task 2: Preserve finance access behavior

**Files:**
- Modify: `src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx`

- [ ] **Step 1: Update existing finance-tab tests**

```tsx
fireEvent.click(await screen.findByRole('tab', { name: 'Finance data' }))
fireEvent.click(await screen.findByRole('tab', { name: 'Ads' }))
```

- [ ] **Step 2: Run focused UI test and typecheck**

Run: `npm run test:ui -- src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx`
Run: `npm run typecheck`
