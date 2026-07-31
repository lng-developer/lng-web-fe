# Dual-core Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat application sidebar with a persistent core rail and a permission-filtered contextual sidebar for the currently implemented HR and System cores.

**Architecture:** Keep permission and route selection in pure helpers, render a narrow `AppRail` beside the existing `AppSidebar`, and store only validated base navigation targets for each core. Portal and Home remain absent until real routes exist; adding their first route only requires adding a core definition and contextual groups.

**Tech Stack:** React 19, TypeScript, React Router, Ant Design, react-i18next, Vitest, Testing Library, CSS modules.

## Global Constraints

- Use backend-provided global and scoped permissions, never role names.
- Do not add dependencies.
- Do not create placeholder or dead Portal routes.
- Keep `Foundation` directly addressable for development but omit it from production navigation.
- Preserve one global header.
- Desktop is the only target in this phase.
- Tests remain under `src/test`.
- Do not create intermediate commits while the HR/frontend worktree is still being refined.

---

### Task 1: Build the permission-filtered core navigation model

**Files:**

- Create: `src/app/layout/appNavigation.ts`
- Test: `src/test/app/layout/appNavigation.test.ts`

**Interfaces:**

- Consumes: `CurrentAccount`, `getHrNavigation(permissions)`, and existing backend permission codes.
- Produces: `AppCoreKey`, `NavigationGroup`, `getAvailableCores(account)`, `getContextNavigation(core, account)`, `getCoreForPath(pathname)`, and `getDefaultWorkspacePath(account)`.

- [ ] **Step 1: Write failing navigation-model tests**

Cover these exact cases:

```ts
expect(getAvailableCores(staffAccount).map(({ key }) => key)).toEqual(['hr'])
expect(getAvailableCores(systemAdmin).map(({ key }) => key)).toEqual(['system'])
expect(getAvailableCores(managerAndAdmin).map(({ key }) => key)).toEqual(['hr', 'system'])
expect(getCoreForPath('/organization')).toBe('hr')
expect(getCoreForPath('/auth/accounts/123')).toBe('system')
expect(getContextNavigation('hr', staffAccount).map(({ key }) => key)).toEqual(['personal'])
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npx vitest run src/test/app/layout/appNavigation.test.ts --pool=threads --maxWorkers=1
```

Expected: FAIL because `appNavigation.ts` does not exist.

- [ ] **Step 3: Implement the smallest pure navigation model**

Use these types:

```ts
export type AppCoreKey = 'hr' | 'system'

export type NavigationItem = {
  key: string
  path: string
  labelKey: string
}

export type NavigationGroup = {
  key: string
  labelKey: string
  items: NavigationItem[]
}
```

Flatten `account.permissions` with all `account.scopes[].permissions` once. Reuse `getHrNavigation` for personal, team, HR operations, and payroll groups. Add `/organization` to HR operations only when department or team read/write permission exists. System contains `/auth/accounts` and `/auth/access-control` only when `AUTH:READ` or `AUTH:WRITE` exists. Omit empty groups and cores.

- [ ] **Step 4: Re-run the focused test and verify GREEN**

Run the Step 2 command. Expected: PASS.

---

### Task 2: Remember the last valid route for each core

**Files:**

- Create: `src/app/layout/coreRouteMemory.ts`
- Test: `src/test/app/layout/coreRouteMemory.test.ts`

**Interfaces:**

- Consumes: `AppCoreKey` and the current core's `NavigationGroup[]`.
- Produces: `rememberCoreRoute(core, pathname, groups)` and `getRememberedCoreRoute(core, groups)`.

- [ ] **Step 1: Write failing route-memory tests**

```ts
rememberCoreRoute('hr', '/hr/me/attendance', hrGroups)
expect(getRememberedCoreRoute('hr', hrGroups)).toBe('/hr/me/attendance')

localStorage.setItem('lng:last-route:hr', '/hr/operations/employees')
expect(getRememberedCoreRoute('hr', personalOnlyGroups)).toBe('/hr/me')

rememberCoreRoute('system', '/auth/accounts/account-id', systemGroups)
expect(localStorage.getItem('lng:last-route:system')).toBe('/auth/accounts')
```

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
npx vitest run src/test/app/layout/coreRouteMemory.test.ts --pool=threads --maxWorkers=1
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement validated base-route storage**

Find the longest navigation item path that equals the pathname or prefixes it at a `/` boundary. Store only that navigation path, never query strings or record identifiers. On read, return the stored path if it still exists in the current navigation groups; otherwise return the first available item path.

- [ ] **Step 4: Re-run the focused test and verify GREEN**

Run the Step 2 command. Expected: PASS.

---

### Task 3: Add the core rail and convert the sidebar to contextual navigation

**Files:**

- Create: `src/app/layout/AppRail.tsx`
- Modify: `src/app/layout/AppSidebar.tsx`
- Modify: `src/app/layout/AppShell.module.scss`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Test: `src/test/app/layout/AppRail.test.tsx`
- Test: `src/test/app/layout/AppSidebar.test.tsx`
- Test: `src/test/shared/i18n/locales.test.ts`

**Interfaces:**

- `AppRail` receives `cores`, `activeCore`, and `onCoreChange`.
- `AppSidebar` receives `groups`, `selectedKey`, `collapsed`, and `onCollapsedChange`; it no longer derives permissions itself.

- [ ] **Step 1: Add failing rail and contextual-sidebar tests**

Prove that:

```ts
expect(screen.getByRole('link', { name: 'HR' })).toBeVisible()
expect(screen.queryByRole('link', { name: 'Portal' })).not.toBeInTheDocument()
expect(screen.getByText('Personal')).toBeVisible()
expect(screen.queryByText('Team management')).not.toBeInTheDocument()
```

Add a manager case showing both Personal and Team management, plus an admin case showing System navigation.

- [ ] **Step 2: Run component and locale tests and verify RED**

```powershell
npx vitest run src/test/app/layout/AppRail.test.tsx src/test/app/layout/AppSidebar.test.tsx src/test/shared/i18n/locales.test.ts --pool=threads --maxWorkers=1
```

Expected: FAIL because the rail and contextual props do not exist.

- [ ] **Step 3: Implement the rail and contextual sidebar**

Use existing Ant Design icons and `Menu`; do not add an icon package. Keep the rail 68px wide and the sidebar 220px wide. The current collapse action hides only the contextual sidebar. Use CSS transitions for width, background, and selected state; disable them in the existing reduced-motion media query.

Add VN/EN keys for core names and group labels. Keep visible labels short enough to remain on one line at desktop width.

- [ ] **Step 4: Re-run component and locale tests and verify GREEN**

Run the Step 2 command. Expected: PASS.

---

### Task 4: Integrate navigation, route memory, and default routing into AppShell

**Files:**

- Modify: `src/app/layout/AppShell.tsx`
- Modify: `src/app/layout/sidebarRouteState.ts`
- Modify: `src/app/router/router.tsx`
- Create: `src/app/router/WorkspaceIndexRedirect.tsx`
- Test: `src/test/app/layout/AppShell.test.tsx`
- Test: `src/test/app/layout/sidebarRouteState.test.ts`
- Test: `src/test/app/router/WorkspaceIndexRedirect.test.tsx`

**Interfaces:**

- `AppShell` gets available cores and contextual groups from `appNavigation.ts`.
- Rail changes call `getRememberedCoreRoute` and navigate to a validated route.
- Successful location changes call `rememberCoreRoute` for the active core.
- `WorkspaceIndexRedirect` reads the parent loader account and redirects to `getDefaultWorkspacePath(account)`.

- [ ] **Step 1: Add failing shell integration tests**

Test these behaviors without importing business pages:

```ts
// Staff starts at HR because it is the first permitted core.
expect(location.pathname).toBe('/hr/me')

// Manager switches away and back to HR.
expect(navigate).toHaveBeenCalledWith('/hr/team')

// Revoked remembered route falls back safely.
expect(navigate).toHaveBeenCalledWith('/hr/me')
```

Extend `sidebarRouteState` coverage for nested HR, organization, account detail, and access-control routes.

- [ ] **Step 2: Run focused shell tests and verify RED**

```powershell
npx vitest run src/test/app/layout/AppShell.test.tsx src/test/app/layout/sidebarRouteState.test.ts src/test/app/router/WorkspaceIndexRedirect.test.tsx --pool=threads --maxWorkers=1
```

- [ ] **Step 3: Implement shell composition and default redirect**

Give the protected parent route the id `workspace`. Replace the root index redirect to `/foundation` with `WorkspaceIndexRedirect`. Keep `/foundation` registered for direct development access. Render `AppRail` and contextual `AppSidebar` before the main layout. Keep the current header and account controls unchanged.

- [ ] **Step 4: Re-run focused shell tests and verify GREEN**

Run the Step 2 command. Expected: PASS.

---

### Task 5: Regression and production verification

**Files:**

- No new files.

- [ ] Run all navigation-focused tests:

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

- [ ] Verify `git diff --check` and leave the worktree uncommitted for continued module work.
