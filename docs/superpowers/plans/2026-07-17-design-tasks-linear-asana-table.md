# Design Tasks Linear Asana Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/portal/design/tasks` feel like a Linear + Asana operational table: clean scope selector, compact filters, readable rows, quick actions, and no unnecessary visual noise.

**Architecture:** Keep the existing route and API layer. Refactor only the Design Tasks page UI into small local components inside `DesignTasksPage.jsx` first; extract later only if the file becomes hard to maintain. Reuse existing MUI, Tailwind tokens, `DateRangePicker`, TanStack Query hooks, and `getDesignTaskActions`.

**Tech Stack:** React, MUI, Tailwind utility tokens, TanStack Query, Zustand auth store, existing design task hooks.

## Global Constraints

- Do not add dependencies.
- Do not change backend contracts.
- Keep all task API calls behind existing hooks and endpoint constants.
- Keep role behavior permission-based, not role-name-based.
- Do not show raw ids as primary table labels.
- Keep the page dense and operational; no marketing/landing layout.
- Preserve current query params for scope, filters, sort, page, and page size.

---

## File Structure

- Modify: `src/features/design-tasks/pages/DesignTasksPage.jsx`
  - Owns page layout, filters, table, row actions, create/action dialogs.
- Modify: `src/features/design-tasks/utils/designTasksApi.js`
  - Only if row display mapping lacks a field needed for clean table labels.
- Modify: `src/features/design-tasks/utils/designTasksApi.test.js`
  - Add/adjust mapper or action visibility tests only when utility behavior changes.

---

### Task 1: Replace Filter Surface With Linear-Style Toolbar

**Files:**

- Modify: `src/features/design-tasks/pages/DesignTasksPage.jsx`

**Interfaces:**

- Consumes: `filters`, `setFilters`, `activeWorkMode`, `setWorkMode`, `DateRangePicker`.
- Produces: `DesignFilters` rendering a single compact toolbar plus optional `More filters` popover/panel.

- [ ] **Step 1: Keep main toolbar fields only**

Main toolbar must render:

- Search
- Scope (`My queue`, `All tasks`, `Review queue`)
- Task type
- Status
- Schedule date range
- More filters
- Refresh

Implementation shape:

```jsx
<section className="rounded-xl border border-border bg-surface p-3 shadow-sm">
  <div className="grid items-end gap-3 xl:grid-cols-[minmax(280px,1fr)_150px_170px_170px_minmax(260px,340px)_auto_auto]">
    {/* search, scope, type, status, date range, more, refresh */}
  </div>
</section>
```

- [ ] **Step 2: Move secondary controls under More filters**

Secondary controls:

- Shop
- Designer
- Priority
- PSD status
- Sort by
- Sort order
- Rows

Use existing local state:

```jsx
const [moreOpen, setMoreOpen] = useState(false)
```

Panel shape:

```jsx
{
  moreOpen ? (
    <div className="mt-3 grid gap-3 rounded-lg border border-border bg-surface-subtle p-3 md:grid-cols-2 xl:grid-cols-6">
      {/* secondary filters */}
    </div>
  ) : null
}
```

- [ ] **Step 3: Show active filter count**

Count only filters that narrow results:

```jsx
const secondaryFilterCount = [
  filters.shopId !== 'all',
  showAssigneeFilter && filters.assignedDesignerId !== 'all',
  filters.priority !== 'all',
  filters.psdStatus !== 'all',
].filter(Boolean).length
```

Button label:

```jsx
More filters{secondaryFilterCount ? ` (${secondaryFilterCount})` : ''}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run lint
```

Expected: pass.

---

### Task 2: Make The Table Read Like Linear, Not A Form

**Files:**

- Modify: `src/features/design-tasks/pages/DesignTasksPage.jsx`

**Interfaces:**

- Consumes: `tasks`, `getDesignTaskActions(task, currentUser)`.
- Produces: Cleaner `TaskTable` row layout.

- [ ] **Step 1: Tighten table columns**

Use these columns:

- Task
- Type
- Status
- Priority
- Owner
- Shop
- File
- Updated
- Actions

Column widths:

```jsx
<colgroup>
  <col className="w-[300px]" />
  <col className="w-[135px]" />
  <col className="w-[130px]" />
  <col className="w-[115px]" />
  {showAssignedColumn ? <col className="w-[170px]" /> : null}
  <col className="w-[140px]" />
  <col className="w-[150px]" />
  <col className="w-[120px]" />
  <col className="w-[190px]" />
</colgroup>
```

- [ ] **Step 2: Rename Listing header to Task**

Header config:

```jsx
;[
  { label: 'Task' },
  { label: 'Type' },
  { label: 'Status', sortKey: 'status' },
  { label: 'Priority', sortKey: 'priority' },
  ...(showAssignedColumn ? [{ label: 'Owner' }] : []),
  { label: 'Shop' },
  { label: 'File' },
  { label: 'Updated', sortKey: 'updatedAt' },
  { label: 'Actions' },
]
```

- [ ] **Step 3: Make row action buttons quiet**

Default row actions should be icon-only, with tooltip. Avoid large outlined button groups in rows.

Current `RowAction` is enough:

```jsx
<IconButton size="small" disabled={disabled} onClick={onClick}>
  {children}
</IconButton>
```

Only change styling if buttons visually dominate rows:

```jsx
<IconButton size="small" className="h-8 w-8 text-ink-muted hover:text-ink-strong" />
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass; Vite chunk warning may remain.

---

### Task 3: Replace Summary Cards With A Compact Status Strip

**Files:**

- Modify: `src/features/design-tasks/pages/DesignTasksPage.jsx`

**Interfaces:**

- Consumes: `summaryQuery.data`.
- Produces: A compact horizontal status strip, not large cards.

- [ ] **Step 1: Replace `SummaryStrip` cards**

Use a compact strip:

```jsx
function SummaryStrip({ summary, workload, isLoading }) {
  const source = summary || workload || {}
  const items = [
    ['Total', source.total, 'info'],
    ['Unassigned', source.unassigned, 'warning'],
    ['In progress', source.inProgress, 'warning'],
    ['Submitted', source.submitted, 'info'],
    ['Rejected', source.rejected, 'danger'],
    ['Approved', source.approved, 'success'],
  ]

  if (isLoading) return <Skeleton variant="rectangular" height={42} className="rounded-lg" />

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      {items.map(([label, value, tone]) => (
        <Badge key={label} tone={tone}>
          {label}: {Number(value || 0)}
        </Badge>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Do not re-add Workload row**

Keep workload hidden unless BE returns useful per-designer data and the UI has a clear decision use case.

- [ ] **Step 3: Verify**

Run:

```bash
npm run lint
```

Expected: pass.

---

### Task 4: Add Saved-View Feel Without New Backend

**Files:**

- Modify: `src/features/design-tasks/pages/DesignTasksPage.jsx`

**Interfaces:**

- Consumes: `activeWorkMode`, `filters.statusTab`.
- Produces: User-friendly view labels in the toolbar.

- [ ] **Step 1: Rename scope select labels**

Use labels that explain job intent:

```jsx
;<MenuItem value="mine">My assigned work</MenuItem>
{
  canManageDesign ? <MenuItem value="all">All design tasks</MenuItem> : null
}
{
  canReviewDesign ? <MenuItem value="review">Needs review</MenuItem> : null
}
```

- [ ] **Step 2: Keep URL query behavior**

Do not change:

```jsx
if (activeWorkMode !== defaultWorkMode) next.set('mode', activeWorkMode)
```

- [ ] **Step 3: Verify F5 behavior manually**

Manual check:

- Open `/portal/design/tasks?mode=review&type=PSD_TEMPLATE`
- Refresh
- Expected: scope remains review, type remains PSD template.

---

### Task 5: Final Verification

**Files:**

- Test current touched files only.

- [ ] **Step 1: Run unit test**

```bash
node --test src\features\design-tasks\utils\designTasksApi.test.js
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: pass.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: pass. Existing Vite chunk-size warning is acceptable unless a new error appears.

- [ ] **Step 4: Manual UI check**

Open `/portal/design/tasks` and verify:

- The top UI has one compact status strip.
- There is no duplicate `Workload` row.
- Scope is inside the filter toolbar.
- More filters stays closed by default.
- Table headers support click sorting.
- Schedule range opens the existing calendar range picker.
- Row actions stay icon-only and do not dominate the table.

---

## Self-Review

- Spec coverage: Covers Linear + Asana direction through compact toolbar, saved-view scope, dense table, quiet row actions, compact status strip.
- Placeholder scan: No placeholder tasks.
- Type consistency: Reuses existing `filters`, `activeWorkMode`, `DateRangePicker`, `getDesignTaskActions`, and `SummaryStrip` names.
