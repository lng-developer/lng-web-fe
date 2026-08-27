# Integration Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organize integrations into Imports, Amazon Extension, and Finance data workbenches while loading workbench-specific data only when selected.

**Architecture:** Keep the existing route, API adapters, query keys, and shared `UiTabs`. Make the primary tab selection page-local UI state; use it only to scope existing query execution and the upload action. Move Automation into a nested Extension tab without changing its schedule contract.

**Tech Stack:** React 19, Ant Design 6, TanStack Query 5, i18next, Vitest.

**Spec:** User-approved Integration workbench audit in this task.

## Global Constraints

- No new dependency, endpoint, permission, or query-key contract.
- Preserve existing upload, extension-token, command, schedule, and finance workflows.
- Keep user-facing copy in existing English and Vietnamese i18n files.
- Verify with the focused Integration UI test, lint, and build.

---

### Task 1: Scope workbench data and actions

**Files:**

- Modify: `src/features/portal/integrations/pages/IntegrationWorkbenchPage.tsx`
- Test: `src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes: existing `integrationKeys`, query functions, `UiTabs`, and URL-backed import filters.
- Produces: three top-level workbenches where Imports owns upload, Extension owns Automation, and inactive workbenches do not fetch.

- [x] **Step 1: Write the failing behavior test**

```tsx
expect(listExtensionManagementAgents).not.toHaveBeenCalled()
expect(screen.queryByRole('tab', { name: 'Automation' })).not.toBeInTheDocument()
```

- [x] **Step 2: Run the focused test and verify failure**

Run: `npm.cmd exec -- vitest run src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx --project ui --maxWorkers=1 --testNamePattern=automation`

Expected: failure because Extension data fetches while Imports is active.

- [x] **Step 3: Implement the smallest workbench-state change**

Add local active-tab state. Gate existing jobs, Extension, and Finance queries by the matching workbench. Put the existing `automationTab` inside the Extension child tabs and show `Upload report` only for Imports.

- [x] **Step 4: Run focused behavior tests**

Run: `npm.cmd exec -- vitest run src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx --project ui --maxWorkers=1 --testNamePattern=automation`

Expected: PASS.

- [ ] **Step 5: Run quality checks**

Run: `npm.cmd run lint` and `npm.cmd run build`. Build passed; lint remains blocked by existing errors outside this workbench.
