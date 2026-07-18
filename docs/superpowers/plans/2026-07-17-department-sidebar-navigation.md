# Department Sidebar Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the sidebar into department workspaces with a narrow icon rail and workflow-specific navigation, without creating duplicate pages.

**Architecture:** Keep the existing data-driven navigation in `src/layouts/sidebarNavigation.js`. Replace the current top tab strip with a vertical workspace rail in `src/layouts/AppSidebar.jsx`. Channel-specific entries such as Amazon/Etsy are route presets using query strings on existing pages, not new routes.

**Tech Stack:** React 19, React Router 7, MUI 9, existing i18n JSON, Node test runner.

## Global Constraints

- Do not add dependencies.
- Do not create new route pages for Amazon/Etsy variants.
- Do not expose unmounted routes in sidebar.
- Permission filtering remains based on backend permissions via `filterNavigationByUser`.
- Keep worktree changes narrow: sidebar navigation, sidebar component, i18n labels, and sidebar tests only.
- Leave existing dirty feature/page files untouched.

---

## File Structure

- Modify `src/layouts/sidebarNavigation.js`
  - Owns workspace ids, workspace metadata, mounted-route filtering, and navigation tree.
  - Adds query-aware nav item fields: `search` and optional `activeSearch`.
- Modify `src/layouts/AppSidebar.jsx`
  - Renders two-column sidebar: vertical icon rail plus workflow panel.
  - Uses current `useLocation()` pathname and search for active state.
- Modify `src/layouts/sidebarNavigation.test.js`
  - Verifies workspace grouping, mounted-route filtering, permission filtering, and query active helpers.
- Modify `src/i18n/locales/en/common.json`
  - Adds workspace, group, and preset labels.
- Modify `src/i18n/locales/vi/common.json`
  - Adds the same labels in Vietnamese.

---

### Task 1: Navigation Data Model And Workspace Tree

**Files:**

- Modify: `src/layouts/sidebarNavigation.js`
- Test: `src/layouts/sidebarNavigation.test.js`

**Interfaces:**

- Consumes: `ROUTES` constants and `hasAnyPermission(user, permissions)`.
- Produces:
  - `SIDEBAR_WORKSPACES: Array<{ id, labelKey, icon, defaultOpen? }>`
  - `SIDEBAR_WORKSPACE_NAVIGATION: Record<string, Array<SidebarItem>>`
  - `getSidebarWorkspaceForLocation(pathname: string): string`
  - `getNavItemTo(item): string | { pathname: string, search: string }`
  - `isNavItemActive(item, location): boolean`

- [ ] **Step 1: Write failing tests for workspace grouping**

Add tests to `src/layouts/sidebarNavigation.test.js`:

```js
import {
  getNavItemTo,
  getSidebarWorkspaceForLocation,
  isNavItemActive,
  SIDEBAR_WORKSPACE_NAVIGATION,
  SIDEBAR_WORKSPACES,
} from './sidebarNavigation.js'

it('groups sidebar by department workspaces', () => {
  assert.deepEqual(
    SIDEBAR_WORKSPACES.map((workspace) => workspace.id),
    ['orders', 'production', 'design', 'vendor', 'reports', 'admin'],
  )
})

it('keeps order workflow in the orders workspace', () => {
  assert.deepEqual(collectLeafIds(SIDEBAR_WORKSPACE_NAVIGATION.orders), [
    'order-list',
    'orders-amazon',
    'orders-etsy',
    'listings',
    'mapping-workbench',
  ])
})

it('keeps production workflow in the production workspace', () => {
  assert.deepEqual(collectLeafIds(SIDEBAR_WORKSPACE_NAVIGATION.production), [
    'scale',
    'scale-amazon',
    'scale-etsy',
    'qc',
    'qc-amazon',
    'qc-etsy',
  ])
})

it('keeps design workflow in the design workspace', () => {
  assert.deepEqual(collectLeafIds(SIDEBAR_WORKSPACE_NAVIGATION.design), ['design-task-list'])
})
```

- [ ] **Step 2: Write failing tests for query presets and active state**

Add:

```js
it('uses query presets without creating new routes', () => {
  assert.deepEqual(getNavItemTo(findItem(SIDEBAR_WORKSPACE_NAVIGATION.orders, 'orders-amazon')), {
    pathname: '/portal/orders',
    search: '?channel=amazon',
  })
  assert.deepEqual(getNavItemTo(findItem(SIDEBAR_WORKSPACE_NAVIGATION.production, 'scale-etsy')), {
    pathname: '/portal/fulfillment/scale',
    search: '?channel=etsy',
  })
})

it('matches active query presets exactly when activeSearch is set', () => {
  const amazonOrders = findItem(SIDEBAR_WORKSPACE_NAVIGATION.orders, 'orders-amazon')
  const etsyOrders = findItem(SIDEBAR_WORKSPACE_NAVIGATION.orders, 'orders-etsy')

  assert.equal(
    isNavItemActive(amazonOrders, { pathname: '/portal/orders', search: '?channel=amazon' }),
    true,
  )
  assert.equal(
    isNavItemActive(etsyOrders, { pathname: '/portal/orders', search: '?channel=amazon' }),
    false,
  )
})
```

- [ ] **Step 3: Run test to verify failure**

Run:

```bash
node --test src/layouts/sidebarNavigation.test.js
```

Expected: fail because new exports do not exist.

- [ ] **Step 4: Implement minimal navigation model**

In `src/layouts/sidebarNavigation.js`, replace the current `SIDEBAR_TABS`/portal-centric tree with workspace exports while keeping backwards-compatible aliases only if current imports still need them:

```js
export const SIDEBAR_WORKSPACE_IDS = {
  ORDERS: 'orders',
  PRODUCTION: 'production',
  DESIGN: 'design',
  VENDOR: 'vendor',
  REPORTS: 'reports',
  ADMIN: 'admin',
}

export const SIDEBAR_WORKSPACES = [
  { id: SIDEBAR_WORKSPACE_IDS.ORDERS, labelKey: 'nav.workspaces.orders', icon: 'orders' },
  {
    id: SIDEBAR_WORKSPACE_IDS.PRODUCTION,
    labelKey: 'nav.workspaces.production',
    icon: 'production',
  },
  { id: SIDEBAR_WORKSPACE_IDS.DESIGN, labelKey: 'nav.workspaces.design', icon: 'design' },
  { id: SIDEBAR_WORKSPACE_IDS.VENDOR, labelKey: 'nav.workspaces.vendor', icon: 'vendor' },
  { id: SIDEBAR_WORKSPACE_IDS.REPORTS, labelKey: 'nav.workspaces.reports', icon: 'reports' },
  { id: SIDEBAR_WORKSPACE_IDS.ADMIN, labelKey: 'nav.workspaces.admin', icon: 'admin' },
]

function withSearch(pathname, search) {
  return { pathname, search, activeSearch: search }
}

export const SIDEBAR_WORKSPACE_NAVIGATION = {
  [SIDEBAR_WORKSPACE_IDS.ORDERS]: [
    {
      id: 'orders-group',
      type: 'group',
      labelKey: 'nav.groups.orders',
      defaultOpen: true,
      children: [
        {
          id: 'order-list',
          type: 'item',
          labelKey: 'nav.items.allOrders',
          path: ROUTES.PORTAL_ORDER_LIST,
          requiredPermissions: ['ORDERS:READ'],
        },
        {
          id: 'orders-amazon',
          type: 'item',
          labelKey: 'nav.items.amazonOrders',
          path: ROUTES.PORTAL_ORDER_LIST,
          ...withSearch(ROUTES.PORTAL_ORDER_LIST, '?channel=amazon'),
          requiredPermissions: ['ORDERS:READ'],
        },
        {
          id: 'orders-etsy',
          type: 'item',
          labelKey: 'nav.items.etsyOrders',
          path: ROUTES.PORTAL_ORDER_LIST,
          ...withSearch(ROUTES.PORTAL_ORDER_LIST, '?channel=etsy'),
          requiredPermissions: ['ORDERS:READ'],
        },
        {
          id: 'listings',
          type: 'item',
          labelKey: 'nav.items.listings',
          path: ROUTES.PORTAL_LISTINGS,
          requiredPermissions: ['CATALOG:READ'],
        },
        {
          id: 'mapping-workbench',
          type: 'item',
          labelKey: 'nav.items.mappingWorkbench',
          path: ROUTES.PORTAL_MAPPING_WORKBENCH,
          requiredPermissions: ['MAPPING:READ'],
        },
      ],
    },
  ],
  [SIDEBAR_WORKSPACE_IDS.PRODUCTION]: [
    {
      id: 'scale-group',
      type: 'group',
      labelKey: 'nav.groups.scale',
      defaultOpen: true,
      children: [
        {
          id: 'scale',
          type: 'item',
          labelKey: 'nav.items.scale',
          path: ROUTES.PORTAL_SCALE,
          requiredPermissions: ['PRODUCTION:READ'],
        },
        {
          id: 'scale-amazon',
          type: 'item',
          labelKey: 'nav.items.amazonScale',
          path: ROUTES.PORTAL_SCALE,
          ...withSearch(ROUTES.PORTAL_SCALE, '?channel=amazon'),
          requiredPermissions: ['PRODUCTION:READ'],
        },
        {
          id: 'scale-etsy',
          type: 'item',
          labelKey: 'nav.items.etsyScale',
          path: ROUTES.PORTAL_SCALE,
          ...withSearch(ROUTES.PORTAL_SCALE, '?channel=etsy'),
          requiredPermissions: ['PRODUCTION:READ'],
        },
      ],
    },
    {
      id: 'qc-group',
      type: 'group',
      labelKey: 'nav.groups.qc',
      defaultOpen: true,
      children: [
        {
          id: 'qc',
          type: 'item',
          labelKey: 'nav.items.qc',
          path: ROUTES.PORTAL_QC,
          requiredPermissions: ['PRODUCTION:READ', 'DESIGN:REVIEW'],
        },
        {
          id: 'qc-amazon',
          type: 'item',
          labelKey: 'nav.items.amazonQc',
          path: ROUTES.PORTAL_QC,
          ...withSearch(ROUTES.PORTAL_QC, '?channel=amazon'),
          requiredPermissions: ['PRODUCTION:READ', 'DESIGN:REVIEW'],
        },
        {
          id: 'qc-etsy',
          type: 'item',
          labelKey: 'nav.items.etsyQc',
          path: ROUTES.PORTAL_QC,
          ...withSearch(ROUTES.PORTAL_QC, '?channel=etsy'),
          requiredPermissions: ['PRODUCTION:READ', 'DESIGN:REVIEW'],
        },
      ],
    },
  ],
  [SIDEBAR_WORKSPACE_IDS.DESIGN]: [
    {
      id: 'design-task-list',
      type: 'item',
      labelKey: 'nav.items.psdTasks',
      path: ROUTES.PORTAL_DESIGN_TASKS,
      requiredPermissions: [
        'DESIGN:READ',
        'DESIGN:WRITE',
        'DESIGN:WORK',
        'DESIGN:REVIEW',
        'DESIGN_TASKS:READ',
      ],
    },
  ],
  [SIDEBAR_WORKSPACE_IDS.VENDOR]: [
    {
      id: 'vendor-list',
      type: 'item',
      labelKey: 'nav.items.vendorList',
      path: ROUTES.PORTAL_VENDOR_LIST,
      requiredPermissions: ['VENDORS:READ'],
    },
    {
      id: 'products-cost',
      type: 'item',
      labelKey: 'nav.items.productsCost',
      path: ROUTES.PORTAL_PRODUCTS_COST,
      requiredPermissions: ['VENDORS:READ'],
    },
    {
      id: 'vendor-submissions',
      type: 'item',
      labelKey: 'nav.items.vendorSubmissions',
      path: ROUTES.PORTAL_VENDOR_SUBMISSIONS,
      requiredPermissions: ['VENDOR_SUBMISSIONS:READ'],
    },
    {
      id: 'shipping',
      type: 'item',
      labelKey: 'nav.items.shipping',
      path: ROUTES.PORTAL_SHIPPING,
      requiredPermissions: ['SHIPMENTS:READ'],
    },
  ],
  [SIDEBAR_WORKSPACE_IDS.REPORTS]: [
    {
      id: 'finance-summary',
      type: 'item',
      labelKey: 'nav.items.summary',
      path: ROUTES.PORTAL_FINANCE_SUMMARY,
      requiredPermissions: ['FINANCE:READ'],
    },
    {
      id: 'reports',
      type: 'item',
      labelKey: 'nav.items.reports',
      path: ROUTES.PORTAL_REPORTS,
      requiredPermissions: ['REPORTS:READ'],
    },
  ],
  [SIDEBAR_WORKSPACE_IDS.ADMIN]: [
    {
      id: 'shops-stores',
      type: 'item',
      labelKey: 'nav.items.shopsStores',
      path: ROUTES.PORTAL_SHOPS_STORES,
      requiredPermissions: ['SHOPS:READ'],
    },
    {
      id: 'users-roles',
      type: 'item',
      labelKey: 'nav.items.usersRoles',
      path: ROUTES.PORTAL_USERS_ROLES,
      requiredPermissions: ['AUTH:READ'],
    },
    {
      id: 'api-coverage',
      type: 'item',
      labelKey: 'nav.items.apiCoverage',
      path: ROUTES.PORTAL_API_COVERAGE,
      requiredPermissions: ['MANAGE_SYSTEM'],
    },
    {
      id: 'audit-log',
      type: 'item',
      labelKey: 'nav.items.auditLog',
      path: ROUTES.PORTAL_AUDIT_LOG,
      requiredPermissions: ['AUDIT:READ'],
    },
  ],
}
```

Add helpers:

```js
export function getNavItemTo(item) {
  return item.search ? { pathname: item.path, search: item.search } : item.path
}

export function isNavItemActive(item, location) {
  if (!item.path) {
    return false
  }

  const currentPath = location.pathname
  const pathActive =
    item.path === '/'
      ? currentPath === item.path
      : currentPath === item.path || currentPath.startsWith(`${item.path}/`)

  if (!pathActive) {
    return false
  }

  return item.activeSearch ? location.search === item.activeSearch : true
}

export function getSidebarWorkspaceForLocation(pathname) {
  const match = SIDEBAR_WORKSPACES.find((workspace) =>
    (SIDEBAR_WORKSPACE_NAVIGATION[workspace.id] ?? []).some((item) =>
      hasActivePath(item, pathname),
    ),
  )

  return match?.id ?? SIDEBAR_WORKSPACE_IDS.ORDERS
}
```

- [ ] **Step 5: Run test to verify pass**

Run:

```bash
node --test src/layouts/sidebarNavigation.test.js
```

Expected: pass.

---

### Task 2: Two-Column Sidebar UI

**Files:**

- Modify: `src/layouts/AppSidebar.jsx`
- Test: `src/layouts/sidebarNavigation.test.js`

**Interfaces:**

- Consumes:
  - `SIDEBAR_WORKSPACES`
  - `SIDEBAR_WORKSPACE_NAVIGATION`
  - `getSidebarWorkspaceForLocation`
  - `getNavItemTo`
  - `isNavItemActive`
- Produces: same `AppSidebar({ open, onNavigate })` public component API.

- [ ] **Step 1: Add icon imports**

Use already-installed MUI icons only:

```js
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import AutoAwesomeMosaicOutlinedIcon from '@mui/icons-material/AutoAwesomeMosaicOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
```

- [ ] **Step 2: Replace tab strip with workspace rail**

Use this shape in `AppSidebar.jsx`:

```jsx
const WORKSPACE_ICONS = {
  orders: HomeOutlinedIcon,
  production: FactCheckOutlinedIcon,
  design: PaletteOutlinedIcon,
  vendor: StorefrontOutlinedIcon,
  reports: AssignmentOutlinedIcon,
  admin: SettingsOutlinedIcon,
}
```

Render rail:

```jsx
<Box
  component="nav"
  aria-label={t('nav.workspacesLabel')}
  sx={(theme) => ({
    borderRight: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 0.75,
    p: 1,
    width: 44,
  })}
>
  {SIDEBAR_WORKSPACES.map((workspace) => {
    const Icon = WORKSPACE_ICONS[workspace.id] ?? AutoAwesomeMosaicOutlinedIcon
    const active = activeWorkspace === workspace.id

    return (
      <ButtonBase
        key={workspace.id}
        type="button"
        title={t(workspace.labelKey)}
        aria-label={t(workspace.labelKey)}
        aria-pressed={active}
        onClick={() => setSelectedWorkspace(workspace.id)}
        sx={workspaceButtonSx({ active })}
      >
        <Icon fontSize="small" />
      </ButtonBase>
    )
  })}
</Box>
```

- [ ] **Step 3: Render workflow panel next to rail**

Keep current recursive renderer but feed it only the selected workspace navigation:

```jsx
const location = useLocation()
const pathWorkspace = getSidebarWorkspaceForLocation(location.pathname)
const [selectedWorkspace, setSelectedWorkspace] = useState(pathWorkspace)
const activeWorkspace = pathWorkspace || selectedWorkspace
const activeWorkspaceNavigation = SIDEBAR_WORKSPACE_NAVIGATION[activeWorkspace] ?? []
const navigation = filterNavigationByUser(activeWorkspaceNavigation, user)
```

Use query-aware active state in leaf items:

```jsx
function renderLeafItem({ item, location, t, depth, onNavigate }) {
  const active = isNavItemActive(item, location)

  return (
    <ListItemButton
      key={item.id}
      component={NavLink}
      to={getNavItemTo(item)}
      onClick={onNavigate}
      sx={navButtonSx({ active, depth, withActiveBorder: depth === 'root' })}
    >
      <NavIcon icon={item.icon} active={active} />
      <ListItemText primary={t(item.labelKey)} />
    </ListItemButton>
  )
}
```

- [ ] **Step 4: Keep footer user block in panel**

Move the user block to the bottom of the right panel, not the icon rail:

```jsx
<Box sx={{ display: 'flex', minHeight: 0 }}>
  {renderWorkspaceRail()}
  <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0 }}>
    <Box sx={{ px: 2, py: 1.5 }}>
      <Typography variant="subtitle2" fontWeight={700} noWrap>
        {t('app.brandName')}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap>
        {userName || t('auth.userFallback')}
      </Typography>
    </Box>
    <List disablePadding sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
      {renderItems(navigation)}
    </List>
    {renderUserFooter()}
  </Box>
</Box>
```

- [ ] **Step 5: Run sidebar tests and lint**

Run:

```bash
node --test src/layouts/sidebarNavigation.test.js
npm run lint
```

Expected: both pass.

---

### Task 3: Labels And Mounted Route Safety

**Files:**

- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`
- Test: `src/layouts/sidebarNavigation.test.js`

**Interfaces:**

- Consumes: label keys from `sidebarNavigation.js`.
- Produces: no missing i18n labels for sidebar workspaces and items.

- [ ] **Step 1: Add English labels**

In `nav`, add:

```json
"workspacesLabel": "Department workspaces",
"workspaces": {
  "orders": "Orders",
  "production": "Production",
  "design": "Design",
  "vendor": "Vendor",
  "reports": "Reports",
  "admin": "Admin"
}
```

In `nav.groups`, add:

```json
"scale": "Scale",
"qc": "QC"
```

In `nav.items`, add:

```json
"allOrders": "All Orders",
"amazonOrders": "Amazon Orders",
"etsyOrders": "Etsy Orders",
"amazonScale": "Amazon Scale",
"etsyScale": "Etsy Scale",
"amazonQc": "Amazon QC",
"etsyQc": "Etsy QC",
"psdTasks": "PSD Tasks"
```

- [ ] **Step 2: Add Vietnamese labels**

In `nav`, add:

```json
"workspacesLabel": "Khu vực vận hành",
"workspaces": {
  "orders": "Orders",
  "production": "Production",
  "design": "Design",
  "vendor": "Vendor",
  "reports": "Reports",
  "admin": "Admin"
}
```

In `nav.groups`, add:

```json
"scale": "Scale",
"qc": "QC"
```

In `nav.items`, add:

```json
"allOrders": "Tất cả đơn",
"amazonOrders": "Amazon Orders",
"etsyOrders": "Etsy Orders",
"amazonScale": "Amazon Scale",
"etsyScale": "Etsy Scale",
"amazonQc": "Amazon QC",
"etsyQc": "Etsy QC",
"psdTasks": "PSD Tasks"
```

- [ ] **Step 3: Keep hidden future items out**

Do not add these until corresponding pages exist:

```txt
Idea Tasks
PNG Tasks
Embroidery Listings
Points Dashboard
Token Vendor
Manage Clients
Config Auto
Log Manager
Tracking Etsy
Message Etsy
Check Tracking
Working Results
```

- [ ] **Step 4: Run tests**

Run:

```bash
node --test src/layouts/sidebarNavigation.test.js
npm run lint
```

Expected: pass.

---

### Task 4: Final Verification

**Files:**

- Verify only.

**Interfaces:**

- Consumes: completed Tasks 1-3.
- Produces: checked implementation ready for manual browser smoke.

- [ ] **Step 1: Run focused tests**

```bash
node --test src/layouts/sidebarNavigation.test.js src/features/auth/utils/currentUser.test.js
```

Expected: pass.

- [ ] **Step 2: Run full lint**

```bash
npm run lint
```

Expected: pass.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: build succeeds. Existing Vite chunk-size warning is acceptable if unchanged.

- [ ] **Step 4: Manual smoke**

Start FE:

```bash
npm run dev
```

Check:

```txt
1. Sidebar opens with narrow icon rail and workflow panel.
2. Clicking Orders icon shows order/listing/mapping workflow only.
3. Clicking Production icon shows Scale and QC groups.
4. Clicking Design icon shows PSD Tasks.
5. Clicking Vendor icon shows Vendors, Vendor Products, Vendor Submissions, Shipping.
6. Amazon/Etsy preset links navigate to the same mounted route with query string.
7. A user with only DESIGN:WORK sees Design workspace content only.
8. A user with MANAGE_SYSTEM sees Admin system tools.
```

---

## Self-Review

- Spec coverage: covers department/workspace split, two-column sidebar, query presets, permission filtering, and no new pages.
- Placeholder scan: no placeholder tasks are required; intentionally skipped future items are listed explicitly.
- Type consistency: `path`, `search`, and `activeSearch` are defined in Task 1 and consumed in Task 2.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-17-department-sidebar-navigation.md`.

Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution - execute tasks in this session using executing-plans, batch execution with checkpoints.
