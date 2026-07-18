# Design Module Operations Layout Sync Plan

> Goal: refactor `src/features/design-tasks` so the Design Tasks workflow uses the same Operations layout language as Orders and Listings, while preserving the current BE-backed design task lifecycle.

## Audit Summary

The module is already partially migrated:

- `DesignTasksPage.jsx` uses `OperationsPageShell`, `OperationsToolbar`, `OperationsTable`, `OperationsTabs`, `OperationsPagination`, and `StatusBadge`.
- API coverage is already BE-backed through `designTasks.queries.js`, `designTasks.mutations.js`, and `designTasksApi.js`.
- Existing utilities cover detail mapping, submit, approve, reject, assign, cancel, PSD candidates, bulk PSD create, assignees, workload, and status action gates.
- `endpoints.contract.test.js` already guards the important design endpoints.

The remaining layout debt is local to the FE module:

- `TaskTable` still owns inline column definitions inside `DesignTasksPage.jsx`, unlike Orders where table structure is separated into a column config file.
- The table hardcodes layout values such as `minWidth="1350px"` instead of centralizing them in module layout config.
- `DesignFilters` has a custom grid that does not yet match the compact Operations toolbar rhythm used by the refactored Orders page.
- `TaskTypeTabs.jsx`, `TaskTypeTabs.test.js`, and `taskTypeTabsConfig.js` are now legacy surface area if no imports remain; `DesignTasksPage.jsx` uses `TaskTypeTabsInline` directly with `OperationsTabs`.
- Dialogs for task action, create task, and bulk PSD create use independent MUI chrome. They should look consistent, but should not be over-abstracted unless the duplication stays obvious after cleanup.
- There is no Design Tasks page composition test equivalent to `ordersPageComposition.test.js`.

## Constraints

- Do not add dependencies.
- Do not change BE endpoints, payload contracts, or invalidation behavior.
- Do not reintroduce mock-driven Design Tasks UI.
- Do not add a new route; keep the current Design Tasks page as the workflow owner.
- Keep the UI dense and operational, not a landing page or marketing layout.
- Work around the existing dirty worktree and do not revert unrelated Orders or Operations layout changes.

## Task 1: Add Design Page Composition Guards

Create `src/features/design-tasks/utils/designTasksPageComposition.test.js`.

Test the page source for the layout contract:

- Uses `OperationsPageShell`.
- Uses `OperationsToolbar`.
- Uses `OperationsTable`.
- Uses `OperationsTabs`.
- Uses `OperationsPagination`.
- Imports Design table columns from a local config file.
- Does not define `const columns = [` inside `DesignTasksPage.jsx`.
- Keeps task lifecycle actions wired through existing mutations instead of mock helpers.

Run first and confirm it fails on the inline column definition.

```powershell
node --test src\features\design-tasks\utils\designTasksPageComposition.test.js
```

## Task 2: Extract Table Columns and Layout Constants

Add one small config file:

- `src/features/design-tasks/components/designTaskTableColumns.js`

Move the inline column definitions from `TaskTable` into this file.

The config should export:

- `DESIGN_TASK_TABLE_MIN_WIDTH`
- `createDesignTaskColumns({ canReview, getActions, onOpenDetail, onOpenAction })`

Keep renderers close to the existing behavior:

- Task cell: type badge, priority, listing summary.
- Status cell: `StatusBadge`.
- Assignment cell: assignee/designer.
- Workload/timing cell: current compact labels.
- Actions cell: existing `IconActionButton` behavior.

Update `TaskTable` to consume the column config and pass it into `OperationsTable`.

Do not change API data mapping in this task.

## Task 3: Normalize Header, Tabs, and Toolbar Rhythm

Keep the current page hierarchy:

```jsx
<OperationsPageShell header={...}>
  <SummaryStrip />
  <TaskTypeTabsInline />
  <DesignFilters />
  <TaskTable />
  <OperationsPagination />
</OperationsPageShell>
```

Tighten only the layout:

- Keep `OperationsHeader` as the page header.
- Keep the task type and status tabs using `OperationsTabs`.
- Make `DesignFilters` read like the Orders toolbar: search first, primary filters next, compact actions at the end.
- Keep advanced/secondary filters collapsible behind the existing "More filters" control.
- Remove ad hoc spacing that fights the shared Operations components.
- Ensure toolbar controls do not wrap into uneven heights at desktop widths.

Add composition assertions for the expected `OperationsToolbar` and `More filters` structure.

## Task 4: Remove Legacy Task Type Tabs Surface

Confirm with `rg` that these are not imported anywhere:

- `src/features/design-tasks/components/TaskTypeTabs.jsx`
- `src/features/design-tasks/components/TaskTypeTabs.test.js`
- `src/features/design-tasks/components/taskTypeTabsConfig.js`

If unused, delete them.

Keep `TaskTypeTabsInline` in `DesignTasksPage.jsx` unless it grows enough to justify a real component again.

## Task 5: Standardize Dialog Chrome Without Broad Abstraction

Review the three dialogs in `DesignTasksPage.jsx`:

- `DesignActionDialog`
- `CreateTaskDialog`
- `BulkPsdCreateDialog`

Apply the smallest useful cleanup:

- Same title spacing.
- Same action row alignment.
- Same primary/secondary button sizing.
- Same error/loading placement.
- Same max width rhythm where appropriate.

Only create a `DesignTaskDialogShell` component if it removes real repeated code after the first pass. Avoid a generic modal framework.

Preserve all current lifecycle gates:

- `ASSIGNED`: start.
- `IN_PROGRESS` or `REJECTED`: submit.
- `SUBMITTED`: approve/reject.
- Existing assign/cancel/bulk PSD create actions stay BE-backed.

## Task 6: Verify API Contracts Still Hold

Run the narrow contract tests:

```powershell
node --test src\features\design-tasks\utils\designTasksApi.test.js
node --test src\features\design-tasks\utils\designTasksPageComposition.test.js
node --test src\services\endpoints.contract.test.js
```

If the refactor touches shared Operations components, also run:

```powershell
node --test src\components\operations\operationsLayout.test.js
node --test src\components\operations\operationsTableComposition.test.js
```

## Task 7: Visual Check in Chrome

Use the logged-in Chrome session only for layout verification. Do not inspect or extract tokens.

Manual checks:

- Open the Design Tasks page.
- Confirm header, tabs, toolbar, table, pagination align with Orders.
- Confirm no horizontal body overflow at desktop width.
- Confirm actions still open detail/action dialogs.
- Confirm create task and bulk PSD create dialogs still fit without awkward spacing.

Useful console checks:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

## Final Verification

Run:

```powershell
npm run lint
npm run build
```

Expected result:

- Design module visually follows the shared Operations layout.
- Design task lifecycle behavior remains unchanged.
- API and endpoint contract tests still pass.
- Legacy unused tabs files are removed if confirmed unused.

## Out of Scope

- No BE changes.
- No new Design route.
- No new mock data layer.
- No redesign of the Design workflow itself.
- No assignment, cancel, or bulk PSD behavior changes beyond preserving the existing UI in the unified layout.
