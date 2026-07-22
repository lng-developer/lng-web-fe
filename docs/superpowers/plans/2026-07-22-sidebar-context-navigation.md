# Sidebar Context Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the workspace-rail sidebar with a Stitch-inspired, functional `Portal | HR` context sidebar that filters navigation by mounted route and backend-provided permissions.

**Architecture:** Keep `sidebarNavigation.js` as the navigation and permission source of truth. It will expose context-specific navigation and a pure first-accessible-leaf resolver. `AppSidebar` will derive context from the URL, render the single-column visual shell, and use the resolver to navigate when a context tab is selected. No backend contract or route changes are required.

**Tech Stack:** React, React Router, MUI, react-i18next, Zustand, Node built-in test runner.

## Global Constraints

- Reuse current MUI and project components; add no dependencies.
- Keep `SIDEBAR_WIDTH` at `248` and retain the existing mobile drawer/`onNavigate` close flow.
- `Portal` contains Dashboard and all existing non-HR workspace navigation, including Settings/Admin.
- `HR` contains only mounted `ROUTES.HR_TIME_*` leaves; do not hardcode role names.
- Filter every context through existing `filterNavigationByUser`; hide a context with no accessible mounted leaf.
- Derive active context only from the current URL; switching context must navigate to an accessible route, never merely swap visible menu state.
- Preserve `getNavItemTo`, active query matching, active ancestor expansion, API behavior, RBAC permission rules, and existing route paths.
- Use TDD: observe each added regression assertion fail before production code changes.
- Leave `.superpowers/` untracked.

---

## File structure

- `src/layouts/sidebarNavigation.js`: defines Portal/HR context metadata, separates HR navigation, resolves URL context and accessible landing leaves.
- `src/layouts/sidebarNavigation.test.js`: proves context partitioning, permission filtering, landing selection, and URL context resolution.
- `src/layouts/AppSidebar.jsx`: owns the single-column presentation and context-switch navigation handler.
- `src/layouts/appSidebarComposition.test.js`: proves sidebar composition, accessible context controls, and removal of the workspace rail.
- `src/i18n/locales/en/common.json`: adds English `nav.contexts.portal` and `nav.contexts.hr` labels.
- `src/i18n/locales/vi/common.json`: adds Vietnamese counterparts using the same key shape.

## Task 1: Add pure Portal/HR navigation contexts

**Files:**

- Modify: `src/layouts/sidebarNavigation.js`
- Modify: `src/layouts/sidebarNavigation.test.js`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`

**Interfaces:**

- Produces `SIDEBAR_CONTEXT_IDS`, `SIDEBAR_CONTEXTS`, `PORTAL_NAVIGATION`, `HR_NAVIGATION`, `getSidebarContextForLocation(pathname)`, and `getFirstNavigableItem(navigation)`.
- Consumes existing `SIDEBAR_HOME_ITEM`, `SIDEBAR_WORKSPACE_NAVIGATION`, `filterNavigationByUser`, mounted route guard, and `getNavItemTo`.
- `getFirstNavigableItem` returns the first depth-first leaf with a `path`, or `null`.

- [ ] **Step 1: Add failing context contracts**

Add to `sidebarNavigation.test.js` imports and assertions:

```js
import {
  HR_NAVIGATION,
  PORTAL_NAVIGATION,
  SIDEBAR_CONTEXT_IDS,
  filterNavigationByUser,
  getFirstNavigableItem,
  getSidebarContextForLocation,
} from './sidebarNavigation.js'

it('separates HR leaves from Portal navigation', () => {
  assert.equal(collectLeafIds(PORTAL_NAVIGATION).includes('hr-schedule'), false)
  assert.deepEqual(
    collectLeafIds(filterNavigationByUser(HR_NAVIGATION, { permissions: ['HR_SCHEDULE:READ'] })),
    ['hr-schedule'],
  )
})

it('derives the navigation context from mounted route families', () => {
  assert.equal(getSidebarContextForLocation(ROUTES.PORTAL_ORDER_LIST), SIDEBAR_CONTEXT_IDS.PORTAL)
  assert.equal(getSidebarContextForLocation(ROUTES.HR_TIME_SCHEDULE), SIDEBAR_CONTEXT_IDS.HR)
})

it('finds the first accessible leaf depth-first', () => {
  const navigation = filterNavigationByUser(HR_NAVIGATION, { permissions: ['HR_SCHEDULE:READ'] })
  assert.equal(getFirstNavigableItem(navigation)?.id, 'hr-schedule')
  assert.equal(getFirstNavigableItem([]), null)
})
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
node --test src/layouts/sidebarNavigation.test.js
```

Expected: FAIL because context exports and helpers do not exist and HR still resides in the workspace navigation collection.

- [ ] **Step 3: Add context metadata and partition the existing configuration**

In `sidebarNavigation.js`, introduce stable IDs and labels:

```js
export const SIDEBAR_CONTEXT_IDS = {
  PORTAL: 'portal',
  HR: 'hr',
}

export const SIDEBAR_CONTEXTS = [
  { id: SIDEBAR_CONTEXT_IDS.PORTAL, labelKey: 'nav.contexts.portal' },
  { id: SIDEBAR_CONTEXT_IDS.HR, labelKey: 'nav.contexts.hr' },
]
```

Move the existing `hr-time-group` definition out of the current workspace navigation value into `HR_NAVIGATION`. Define Portal navigation only from existing workspaces:

```js
export const PORTAL_NAVIGATION = Object.values(SIDEBAR_WORKSPACE_NAVIGATION).flat()
export const SIDEBAR_NAVIGATION = [...PORTAL_NAVIGATION, ...HR_NAVIGATION]
```

Add the pure helpers after `hasActivePath`:

```js
const HR_ROUTE_PATHS = new Set([
  ROUTES.HR_TIME_MY_TIME,
  ROUTES.HR_TIME_REQUEST_INBOX,
  ROUTES.HR_TIME_ATTENDANCE,
  ROUTES.HR_TIME_SCHEDULE,
  ROUTES.HR_TIME_EMPLOYEES,
])

export function getSidebarContextForLocation(pathname) {
  return HR_ROUTE_PATHS.has(pathname) ? SIDEBAR_CONTEXT_IDS.HR : SIDEBAR_CONTEXT_IDS.PORTAL
}

export function getFirstNavigableItem(navigation) {
  for (const item of navigation) {
    if (item.type === 'section') {
      const nestedItem = getFirstNavigableItem(item.items)
      if (nestedItem) return nestedItem
      continue
    }
    if (item.path) return item
    const nestedItem = getFirstNavigableItem(item.children ?? [])
    if (nestedItem) return nestedItem
  }
  return null
}
```

Keep mounted-route and backend permission filtering unchanged.

- [ ] **Step 4: Add localized context labels**

Add the same nested key shape to both locale files:

```json
"contexts": {
  "label": "Navigation context",
  "portal": "Portal",
  "hr": "HR"
}
```

For Vietnamese, use `"label": "Ngữ cảnh điều hướng"` and keep product context labels as `Portal` and `HR` to match the approved references.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
node --test src/layouts/sidebarNavigation.test.js
```

Expected: PASS with existing role/permission tests still passing.

- [ ] **Step 6: Commit context model**

```powershell
git add -- src/layouts/sidebarNavigation.js src/layouts/sidebarNavigation.test.js src/i18n/locales/en/common.json src/i18n/locales/vi/common.json
git diff --cached --check
git commit -m "feat(sidebar): add Portal and HR contexts"
```

## Task 2: Render the functional single-column sidebar

**Files:**

- Modify: `src/layouts/AppSidebar.jsx`
- Modify: `src/layouts/appSidebarComposition.test.js`

**Interfaces:**

- Consumes `SIDEBAR_CONTEXTS`, `SIDEBAR_CONTEXT_IDS`, `PORTAL_NAVIGATION`, `HR_NAVIGATION`, `getSidebarContextForLocation`, `getFirstNavigableItem`, `filterNavigationByUser`, and `getNavItemTo`.
- Uses `useNavigate` to transition to `getNavItemTo(getFirstNavigableItem(filteredContextNavigation))`.
- Keeps public component signature `AppSidebar({ onNavigate, open })` and exported `SIDEBAR_WIDTH` unchanged.

- [ ] **Step 1: Add failing sidebar composition checks**

Replace/add assertions in `appSidebarComposition.test.js`:

```js
test('sidebar uses route-derived Portal and HR context controls without a workspace rail', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes("from 'react-router-dom'"), true)
  assert.match(source, /useNavigate/)
  assert.match(source, /getSidebarContextForLocation\(location\.pathname\)/)
  assert.match(source, /SIDEBAR_CONTEXTS\.filter/)
  assert.match(source, /aria-pressed=\{activeContext === context\.id\}/)
  assert.match(source, /getFirstNavigableItem\(contextNavigation\)/)
  assert.equal(source.includes('renderWorkspaceRail'), false)
  assert.equal(source.includes('workspaceButtonSx'), false)
})
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
node --test src/layouts/appSidebarComposition.test.js
```

Expected: FAIL because the current sidebar renders `renderWorkspaceRail` and has no context navigation handler.

- [ ] **Step 3: Replace rail state with context-derived navigation**

Update imports:

```js
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
```

Import the new navigation helpers. Derive current context and visible menu from the route and filtered user navigation:

```js
const navigate = useNavigate()
const activeContext = getSidebarContextForLocation(location.pathname)
const portalNavigation = SIDEBAR_WORKSPACES.flatMap((workspace) => {
  const items = filterNavigationByUser(SIDEBAR_WORKSPACE_NAVIGATION[workspace.id] ?? [], user)
  return items.length
    ? [{ id: `${workspace.id}-section`, type: 'section', labelKey: workspace.labelKey, items }]
    : []
})
const hrNavigation = filterNavigationByUser(HR_NAVIGATION, user)
const contextNavigation = activeContext === SIDEBAR_CONTEXT_IDS.HR ? hrNavigation : portalNavigation
const visibleContexts = SIDEBAR_CONTEXTS.filter((context) =>
  getFirstNavigableItem(
    context.id === SIDEBAR_CONTEXT_IDS.HR ? hrNavigation : [SIDEBAR_HOME_ITEM, ...portalNavigation],
  ),
)
```

Add a context handler that changes route rather than storing a manual selected context:

```js
const handleContextChange = (contextId) => {
  const navigation =
    contextId === SIDEBAR_CONTEXT_IDS.HR ? hrNavigation : [SIDEBAR_HOME_ITEM, ...portalNavigation]
  const landingItem = getFirstNavigableItem(navigation)
  if (!landingItem) return

  navigate(getNavItemTo(landingItem))
  onNavigate?.()
}
```

Keep current open-item state, but key it by `activeContext` rather than manual workspace selection. Existing active-path logic continues to force active ancestors open.

- [ ] **Step 4: Render the approved compact shell**

Delete `WORKSPACE_ICONS`, `workspaceButtonSx`, and `renderWorkspaceRail`. Render one `aside` column containing:

```jsx
<Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
  <Typography variant="subtitle2" fontWeight={700} noWrap>
    {t('app.brandName')}
  </Typography>
  <Typography variant="caption" color="text.secondary" noWrap>
    {userName || t('auth.userFallback')}
  </Typography>
  <Box
    role="group"
    aria-label={t('nav.contexts.label')}
    sx={{ bgcolor: 'action.hover', borderRadius: 1, display: 'flex', gap: 0.5, mt: 1.25, p: 0.5 }}
  >
    {visibleContexts.map((context) => {
      const selected = activeContext === context.id
      return (
        <ButtonBase
          key={context.id}
          aria-pressed={selected}
          onClick={() => handleContextChange(context.id)}
          sx={contextButtonSx({ selected })}
        >
          {t(context.labelKey)}
        </ButtonBase>
      )
    })}
  </Box>
</Box>
```

Use the existing `navButtonSx` active bar and `renderItems` for the list. For Portal render `SIDEBAR_HOME_ITEM` followed by `portalNavigation`; for HR render `hrNavigation`. Keep 38px rows, 24px icon column, white surface, divider, hidden scrollbar, and current mobile drawer behavior.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
node --test src/layouts/appSidebarComposition.test.js src/layouts/sidebarNavigation.test.js
npx eslint src/layouts/AppSidebar.jsx src/layouts/sidebarNavigation.js
```

Expected: both test files and lint PASS.

- [ ] **Step 6: Commit visual and route behavior**

```powershell
git add -- src/layouts/AppSidebar.jsx src/layouts/appSidebarComposition.test.js
git diff --cached --check
git commit -m "feat(sidebar): switch Portal and HR navigation"
```

## Task 3: Verify the sidebar change end-to-end

**Files:**

- Modify: no source unless verification finds a sidebar regression.

**Interfaces:**

- Consumes the completed context model and sidebar renderer.
- Produces fresh test, lint, build, diff-scope, and known-failure evidence.

- [ ] **Step 1: Run focused layout tests**

```powershell
node --test src/layouts/sidebarNavigation.test.js src/layouts/appSidebarComposition.test.js src/layouts/MainLayout.test.js
```

Expected: zero failures. If `MainLayout.test.js` does not exist, omit it and state that no layout behavior test file exists.

- [ ] **Step 2: Run source checks**

```powershell
npx eslint src/layouts/AppSidebar.jsx src/layouts/sidebarNavigation.js
npm run build
node --test "src/**/*.test.js"
```

Expected: lint and build exit `0`. The full suite must add no failure; report the existing endpoint-registry failure for the four `/api/reports/*` routes exactly if it remains.

- [ ] **Step 3: Review final scope**

```powershell
git status --short
git diff --check develop...HEAD
git diff --name-only develop...HEAD
```

Expected: scope is sidebar navigation, labels, focused tests, spec, and plan; `.superpowers/` remains untracked.

- [ ] **Step 4: Commit only if a verification-driven source fix was required**

If no source change was needed, do not create a verification-only commit. If a source fix was necessary, use a focused `fix(sidebar): ...` commit after its own failing regression test.

## Plan self-review

- Task 1 covers data partition, URL classification, permission filtering, and localization.
- Task 2 covers the approved Stitch-inspired shell and real route navigation.
- Task 3 covers all required verification and scope checks.
- No task adds dependencies, routes, roles, or a third context.
