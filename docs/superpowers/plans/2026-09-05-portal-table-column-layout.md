# Portal Table Column Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compact predictable table columns across audited portal pages while preserving one flexible content column.

**Architecture:** Reuse Ant Design's native `tableLayout` prop through `CoreDataTable`. Each audited page opts into fixed layout and owns its explicit column widths; no global CSS rule changes the behavior of unrelated tables.

**Tech Stack:** React 19, TypeScript, Ant Design 6, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-05-portal-table-column-layout-design.md`

## Global Constraints

- No dependency additions or global fixed table-layout behavior.
- Preserve data flow, pagination, sorting, selection and existing specialized layouts.
- Use explicit widths only for predictable short columns.

---

### Task 1: Expose the native table layout prop

**Files:**

- Modify: `src/test/shared/ui/sharedUi.test.tsx`
- Modify: `src/app/common/CoreDataTable.tsx`

**Interfaces:**

- Produces: `CoreDataTableProps` accepts `TableProps<RecordType>['tableLayout']` and forwards it to Ant Design `Table`.

- [ ] **Step 1: Write the failing test**

```tsx
;<CoreDataTable
  columns={[{ dataIndex: 'name', title: 'Name' }]}
  dataSource={[{ key: 'order-1', name: 'Order 1' }]}
  tableLayout="fixed"
/>
expect(screen.getByRole('table')).toHaveStyle({ tableLayout: 'fixed' })
```

- [ ] **Step 2: Verify the test fails**

Run: `npm run test:ui -- --run src/test/shared/ui/sharedUi.test.tsx`

Expected: TypeScript rejects `tableLayout` because it is not in `CoreDataTableProps`.

- [ ] **Step 3: Add the native prop to the Pick list**

```ts
| 'tableLayout'
```

- [ ] **Step 4: Verify the test passes**

Run: `npm run test:ui -- --run src/test/shared/ui/sharedUi.test.tsx`

Expected: the table's inline layout style is `fixed`.

### Task 2: Apply compact layouts to audit targets

**Files:**

- Modify: `src/features/portal/reports/pages/ReportWorkspacePage.tsx`
- Modify: `src/features/portal/customers/pages/CustomerWorkspacePage.tsx`
- Modify: `src/features/portal/finance/pages/FinanceWorkspacePage.tsx`
- Modify: `src/features/portal/integrations/pages/ImportJobPanel.tsx`
- Modify: `src/features/portal/integrations/pages/IntegrationImportsWorkbench.tsx`
- Modify: `src/features/portal/customization/pages/CustomizationReviewPage.tsx`
- Modify: `src/features/portal/design/pages/PsdFileWorkspacePage.tsx`
- Modify: `src/features/portal/vendor-submissions/pages/VendorSubmissionWorkbenchPage.tsx`
- Modify: `src/features/portal/shipments/pages/ShipmentWorkbenchPage.tsx`

**Interfaces:**

- Consumes: `CoreDataTable` accepts `tableLayout="fixed"`.
- Produces: audit target tables reserve widths for status, action, counts, dates and IDs while one text column stays flexible.

- [ ] **Step 1: Add fixed table layout to each audited `CoreDataTable` call**

```tsx
<CoreDataTable tableLayout="fixed" columns={columns} ... />
```

- [ ] **Step 2: Assign widths only to fixed-size columns**

```ts
{ title: t('...status'), dataIndex: 'status', width: 120 }
{ title: t('...actions'), key: 'actions', width: 104 }
```

- [ ] **Step 3: Add `scroll={{ x: number }}` only where the total declared width cannot fit**

```tsx
<CoreDataTable tableLayout="fixed" scroll={{ x: 960 }} ... />
```

- [ ] **Step 4: Run affected UI suites**

Run: `npm run test:ui -- --run src/test/shared/ui/sharedUi.test.tsx src/test/portal/customization/pages/CustomizationReviewPage.test.tsx src/test/portal/design/pages/PsdFileWorkspacePage.test.tsx src/test/portal/vendors/pages/VendorMigrationTabPage.test.tsx`

Expected: all targeted tests pass.

### Task 3: Verify the delivered scope

**Files:**

- Verify only: files changed in Tasks 1-2.

**Interfaces:**

- Consumes: all changes from Tasks 1-2.
- Produces: evidence that the targeted layout work compiles and has no whitespace errors.

- [ ] **Step 1: Inspect the diff for unrelated changes**

Run: `git diff --check -- src/app/common/CoreDataTable.tsx src/features/portal`

Expected: no whitespace errors in this scope.

- [ ] **Step 2: Build the application**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.
