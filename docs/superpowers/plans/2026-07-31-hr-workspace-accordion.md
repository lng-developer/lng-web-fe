# HR Workspace Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the HR contextual sidebar manageable for employees with multiple workspaces by rendering a single-open accordion, choosing the correct first workspace by capability, and replacing duplicated Overview labels with context-specific copy.

**Architecture:** Keep the existing permission-filtered `NavigationGroup[]` model and route memory. Add pure helpers for group lookup and first-visit priority, then render groups as controlled Ant Design submenus. The current route remains the source of truth; no role names or new backend contract are introduced.

**Tech Stack:** React 19, TypeScript, React Router, Ant Design Menu, react-i18next, Vitest, Testing Library, CSS modules.

## Global Constraints

- Use backend permissions and scopes, never role names.
- Only one HR workspace submenu may be open at a time.
- Preserve the last valid route per core.
- Do not add dependencies.
- Tests remain under `src/test`.
- No Portal or backend implementation in this plan.
- No intermediate commits while the module is still being refined.

---

### Task 1: Resolve HR first-visit workspace by capability

**Files:**

- Modify: `src/app/layout/appNavigation.ts`
- Test: `src/test/app/layout/appNavigation.test.ts`
- Test: `src/test/app/router/WorkspaceIndexRedirect.test.tsx`

**Interfaces:**

- Consumes: existing `CurrentAccount`, effective global/scoped permissions, and `NavigationGroup[]`.
- Produces: `getDefaultWorkspacePath(account)` with capability priority and `getNavigationGroupForItem(groups, itemKey)`.

- [ ] **Step 1: Add failing default-workspace tests**

```ts
expect(getDefaultWorkspacePath(account(['HR_EMPLOYEES:READ', 'HR_ATTENDANCE:WRITE']))).toBe(
  '/hr/operations',
)
expect(getDefaultWorkspacePath(account(['HR_PAYROLL:READ', 'HR_ATTENDANCE:WRITE']))).toBe(
  '/hr/payroll',
)
expect(getDefaultWorkspacePath(account(['HR_ATTENDANCE:READ', 'HR_ATTENDANCE:WRITE']))).toBe(
  '/hr/team',
)
expect(getDefaultWorkspacePath(account(['HR_ATTENDANCE:WRITE']))).toBe('/hr/me')
expect(getNavigationGroupForItem(groups, 'team-approvals')).toBe('team')
```

Priority for a first visit without saved state is `operations`, `payroll`, `team`, then `personal`. System-only accounts continue to default to `/auth/accounts`.

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
npx vitest run src/test/app/layout/appNavigation.test.ts src/test/app/router/WorkspaceIndexRedirect.test.tsx --pool=threads --maxWorkers=1
```

- [ ] **Step 3: Implement minimal pure helpers**

Select the HR group's first item using the exact priority list above. Do not reorder rendered groups; the sidebar keeps Personal, Team management, HR operations, and Payroll in a predictable visual order.

- [ ] **Step 4: Re-run focused tests and verify GREEN**

Run the Step 2 command. Expected: PASS.

---

### Task 2: Render navigation groups as a single-open accordion

**Files:**

- Modify: `src/app/layout/AppSidebar.tsx`
- Modify: `src/app/layout/AppShell.module.scss`
- Test: `src/test/app/layout/AppSidebar.test.tsx`

**Interfaces:**

- `AppSidebar` continues to receive `groups`, `selectedKey`, `coreLabel`, and `collapsed`.
- It derives the active group with `getNavigationGroupForItem` and owns only the temporary expanded-group UI state.

- [ ] **Step 1: Add failing accordion behavior tests**

Render Personal, Team management, and HR operations groups with `selectedKey="team-approvals"`. Assert that Team management is expanded while Personal and HR operations children are hidden. Click HR operations and assert its children become visible while Team management children become hidden.

Use accessible submenu labels rather than Ant Design implementation class names.

- [ ] **Step 2: Run the focused component test and verify RED**

```powershell
npx vitest run src/test/app/layout/AppSidebar.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose
```

- [ ] **Step 3: Implement controlled single-open submenus**

Render each group as an Ant Design submenu with key `group:<groupKey>` to avoid collisions with route item keys. Initialize `openKeys` from the active item. On route changes, open the active item's group. On user expansion, keep only the most recently opened group key.

Keep submenu animation provided by Ant Design and the existing reduced-motion CSS behavior. Add compact spacing for group headers and remove the flat group-title styling assumption.

- [ ] **Step 4: Re-run the focused component test and verify GREEN**

Run the Step 2 command. Expected: PASS.

---

### Task 3: Make duplicate navigation labels context-specific

**Files:**

- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Test: `src/test/app/layout/appNavigation.test.ts`
- Test: `src/test/shared/i18n/locales.test.ts`

**Interfaces:**

- Personal root label: `shell.navigation.myDay`.
- Team root label: `shell.navigation.teamOverview`.
- HR operations root label: `shell.navigation.hrOverview`.

- [ ] **Step 1: Add failing label-key tests**

```ts
expect(personal.items[0].labelKey).toBe('shell.navigation.myDay')
expect(team.items[0].labelKey).toBe('shell.navigation.teamOverview')
expect(operations.items[0].labelKey).toBe('shell.navigation.hrOverview')
```

- [ ] **Step 2: Run navigation and locale tests and verify RED**

```powershell
npx vitest run src/test/app/layout/appNavigation.test.ts src/test/shared/i18n/locales.test.ts --pool=threads --maxWorkers=1
```

- [ ] **Step 3: Map only the three workspace-root labels**

Keep all focused action route labels unchanged. Add concise VN/EN translations:

```text
My day / Công việc của tôi
Team overview / Tổng quan đội
HR operations / Vận hành nhân sự
```

- [ ] **Step 4: Re-run navigation and locale tests and verify GREEN**

Run the Step 2 command. Expected: PASS.

---

### Task 4: Regression and production verification

**Files:**

- No new files.

- [ ] Run focused navigation regression:

```powershell
npx vitest run src/test/app/layout src/test/app/router src/test/hr/hrNavigation.test.ts src/test/hr/pages/HrModulePage.test.tsx src/test/shared/i18n/locales.test.ts --pool=threads --maxWorkers=1
```

- [ ] Run lint:

```powershell
npm run lint
```

- [ ] Run typecheck:

```powershell
npx tsc -b --pretty false
```

- [ ] Run production build:

```powershell
npm run build
```

- [ ] Run `git diff --check` and leave the worktree uncommitted.
