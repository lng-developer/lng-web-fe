# Permission-Aware Operator UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin, designer, QC, fulfillment, and CS users see actions and navigation that match their actual backend permissions and current task context.

**Architecture:** Keep one route per module and one shared workflow UI. Add permission helpers once, then use route/menu/action metadata to hide unavailable surfaces instead of branching by role names. Design Tasks is the first implemented module because it already exposes the action mismatch clearly.

**Tech Stack:** React, React Router, MUI, Tailwind utilities, TanStack Query, Zustand auth store, Node test runner.

## Global Constraints

- No new dependencies.
- Do not create separate pages per role.
- Use backend-provided permissions, not role-name branching.
- Admin can see and do everything through `MANAGE_SYSTEM` or explicit permissions.
- Hide unavailable actions instead of rendering many disabled buttons.
- Keep raw ids out of primary UI labels.
- Preserve existing API contracts and mutation hooks.

---

## File Structure

- Modify `src/features/auth/utils/authz.js`: add reusable permission helpers.
- Modify `src/features/auth/utils/authz.test.js`: cover all helper behavior.
- Modify `src/layouts/sidebarNavigation.js`: add permission metadata and permission-based filtering.
- Modify `src/layouts/sidebarNavigation.test.js`: switch tests from old role filtering expectations to permission expectations.
- Modify `src/routes/index.jsx`: add `requiredPermissions` on protected module routes where route-level gating is safe.
- Modify `src/features/design-tasks/utils/designTasksApi.js`: make Design action availability accept user permissions plus task status.
- Modify `src/features/design-tasks/utils/designTasksApi.test.js`: cover designer, reviewer, manager/admin action sets.
- Modify `src/features/design-tasks/pages/DesignTasksPage.jsx`: apply work mode defaults, action filtering, and column filtering.

---

### Task 1: Add Permission Helpers

**Files:**

- Modify: `src/features/auth/utils/authz.js`
- Modify: `src/features/auth/utils/authz.test.js`

**Interfaces:**

- Produces: `hasAnyPermission(user, permissions)`, `hasAllPermissions(user, permissions)`, `canBypassPermissions(user)`
- Consumes: existing `getUserPermissionCodes(user)`

- [ ] **Step 1: Add failing tests**

Append to `src/features/auth/utils/authz.test.js`:

```js
import { canBypassPermissions, hasAllPermissions, hasAnyPermission } from './authz.js'

test('permission helpers support any all and manage-system bypass', () => {
  const user = {
    permissions: ['DESIGN_TASKS:READ', 'DESIGN_TASKS:SUBMIT'],
  }

  assert.equal(hasAnyPermission(user, ['DESIGN_TASKS:APPROVE', 'DESIGN_TASKS:SUBMIT']), true)
  assert.equal(hasAnyPermission(user, ['DESIGN_TASKS:APPROVE']), false)
  assert.equal(hasAllPermissions(user, ['DESIGN_TASKS:READ', 'DESIGN_TASKS:SUBMIT']), true)
  assert.equal(hasAllPermissions(user, ['DESIGN_TASKS:READ', 'DESIGN_TASKS:APPROVE']), false)
  assert.equal(canBypassPermissions({ permissions: ['MANAGE_SYSTEM'] }), true)
  assert.equal(hasAllPermissions({ permissions: ['MANAGE_SYSTEM'] }, ['ANYTHING:WRITE']), true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test src\features\auth\utils\authz.test.js
```

Expected: FAIL because helper exports do not exist.

- [ ] **Step 3: Implement minimal helpers**

Add to `src/features/auth/utils/authz.js`:

```js
export function canBypassPermissions(user) {
  return getUserPermissionCodes(user).includes('MANAGE_SYSTEM')
}

export function hasAnyPermission(user, permissions = []) {
  if (!permissions.length || canBypassPermissions(user)) return true

  const codes = new Set(getUserPermissionCodes(user))
  return permissions.some((permission) => codes.has(permission))
}

export function hasAllPermissions(user, permissions = []) {
  if (!permissions.length || canBypassPermissions(user)) return true

  const codes = new Set(getUserPermissionCodes(user))
  return permissions.every((permission) => codes.has(permission))
}
```

Update existing `hasRequiredPermissions` to call `hasAllPermissions`:

```js
export function hasRequiredPermissions(user, requiredPermissions = []) {
  return hasAllPermissions(user, requiredPermissions)
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
node --test src\features\auth\utils\authz.test.js
```

Expected: PASS.

---

### Task 2: Gate Sidebar By Permissions

**Files:**

- Modify: `src/layouts/sidebarNavigation.js`
- Modify: `src/layouts/sidebarNavigation.test.js`

**Interfaces:**

- Consumes: `hasAnyPermission(user, permissions)`
- Produces: `filterNavigationByUser(navigation, user)`

- [ ] **Step 1: Add failing navigation tests**

Add tests to `src/layouts/sidebarNavigation.test.js`:

```js
import { filterNavigationByUser } from './sidebarNavigation.js'

it('filters portal navigation by backend permissions', () => {
  const navigation = filterNavigationByUser(SIDEBAR_NAVIGATION, {
    permissions: ['DESIGN_TASKS:READ'],
  })

  assert.deepEqual(collectLeafIds(navigation), ['dashboard', 'design-task-list'])
})

it('keeps full navigation for manage system', () => {
  const navigation = filterNavigationByUser(SIDEBAR_NAVIGATION, {
    permissions: ['MANAGE_SYSTEM'],
  })

  assert.deepEqual(collectLeafIds(navigation), fullPortalLeafIds)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test src\layouts\sidebarNavigation.test.js
```

Expected: FAIL because `filterNavigationByUser` does not exist.

- [ ] **Step 3: Add minimal permission metadata**

In `src/layouts/sidebarNavigation.js`, add `requiredPermissions` only to leaf items first:

```js
{
  id: 'design-task-list',
  type: 'item',
  labelKey: 'nav.items.taskList',
  path: ROUTES.PORTAL_DESIGN_TASKS,
  allowedRoles: ROLE_ACCESS.DESIGN,
  requiredPermissions: ['DESIGN_TASKS:READ'],
}
```

Use these initial mappings:

```js
order-list: ['ORDERS:READ']
order-workbench: ['ORDERS:READ']
order-detail: ['ORDERS:READ']
catalog-setup: ['CATALOG:READ']
listings: ['LISTINGS:READ']
mapping-workbench: ['MAPPING:READ']
tracking: ['SHIPMENTS:READ']
production-board: ['PRODUCTION:READ']
scale: ['PRODUCTION:READ']
qc: ['QC:READ']
shipping: ['SHIPMENTS:READ']
vendor-submissions: ['VENDOR_SUBMISSIONS:READ']
cs: ['CUSTOMER_EXCEPTIONS:READ']
design-task-list: ['DESIGN_TASKS:READ']
template-center: ['DESIGN_TASKS:READ']
finance-summary: ['FINANCE:READ']
reports: ['REPORTS:READ']
vendor-list: ['VENDORS:READ']
products-cost: ['VENDORS:READ']
store-routing: ['VENDORS:READ']
customers: ['CUSTOMERS:READ']
users-roles: ['RBAC:READ']
shops-stores: ['SHOPS:READ']
system-config: ['SYSTEM:READ']
api-coverage: ['MANAGE_SYSTEM']
audit-log: ['AUDIT:READ']
```

- [ ] **Step 4: Implement `filterNavigationByUser`**

Add import:

```js
import { hasAnyPermission } from '@/features/auth/utils/authz'
```

Add helper:

```js
function canAccessByPermission(item, user) {
  return !item.requiredPermissions || hasAnyPermission(user, item.requiredPermissions)
}

function filterItemByUser(item, user) {
  if (!canAccessByPermission(item, user)) return null

  if (item.type === 'section') {
    const items = item.items.map((child) => filterItemByUser(child, user)).filter(Boolean)
    return items.length > 0 ? { ...item, items } : null
  }

  if (item.children) {
    const children = item.children.map((child) => filterItemByUser(child, user)).filter(Boolean)
    return children.length > 0 || item.path ? { ...item, children } : null
  }

  return { ...item }
}

export function filterNavigationByUser(navigation, user) {
  return navigation.map((item) => filterItemByUser(item, user)).filter(Boolean)
}
```

- [ ] **Step 5: Verify**

Run:

```powershell
node --test src\features\auth\utils\authz.test.js src\layouts\sidebarNavigation.test.js
```

Expected: PASS.

---

### Task 3: Gate Module Routes

**Files:**

- Modify: `src/routes/index.jsx`

**Interfaces:**

- Consumes: existing `ProtectedRoute requiredPermissions`
- Produces: route-level permission checks for high-value module routes.

- [ ] **Step 1: Wrap module pages with route permissions**

Change routes from:

```jsx
{ path: 'portal/design/tasks', element: <DesignTasksPage /> },
```

to:

```jsx
{
  path: 'portal/design/tasks',
  element: (
    <ProtectedRoute requiredPermissions={['DESIGN_TASKS:READ']}>
      <DesignTasksPage />
    </ProtectedRoute>
  ),
},
```

Apply the same pattern for:

```jsx
portal/orders -> ['ORDERS:READ']
portal/listings -> ['LISTINGS:READ']
portal/mapping -> ['MAPPING:READ']
portal/fulfillment/shipping -> ['SHIPMENTS:READ']
portal/finance/summary -> ['FINANCE:READ']
portal/reports -> ['REPORTS:READ']
portal/fulfillment/scale -> ['PRODUCTION:READ']
portal/fulfillment/qc -> ['QC:READ']
portal/vendors -> ['VENDORS:READ']
portal/vendors/products-cost -> ['VENDORS:READ']
portal/settings/users-roles -> ['RBAC:READ']
portal/settings/api-coverage -> ['MANAGE_SYSTEM']
portal/settings/audit-log -> ['AUDIT:READ']
```

- [ ] **Step 2: Verify build catches JSX mistakes**

Run:

```powershell
npm run build
```

Expected: PASS.

---

### Task 4: Make Design Actions Permission-Aware

**Files:**

- Modify: `src/features/design-tasks/utils/designTasksApi.js`
- Modify: `src/features/design-tasks/utils/designTasksApi.test.js`

**Interfaces:**

- Consumes: `hasAnyPermission(user, permissions)`
- Produces: `getDesignTaskActions(task, user)`

- [ ] **Step 1: Add failing action tests**

Append to `src/features/design-tasks/utils/designTasksApi.test.js`:

```js
test('getDesignTaskActions hides lifecycle actions without matching permissions', () => {
  const submittedTask = { status: 'SUBMITTED' }

  assert.deepEqual(getDesignTaskActions(submittedTask, { permissions: ['DESIGN_TASKS:READ'] }), {
    canAssign: false,
    canStart: false,
    canSubmit: false,
    canReview: false,
    canCancel: false,
    canDeleteSubmission: false,
    isReadOnly: false,
  })

  assert.equal(
    getDesignTaskActions(submittedTask, { permissions: ['DESIGN_TASKS:APPROVE'] }).canReview,
    true,
  )
})

test('getDesignTaskActions keeps admin lifecycle actions through manage system', () => {
  const actions = getDesignTaskActions({ status: 'ASSIGNED' }, { permissions: ['MANAGE_SYSTEM'] })

  assert.equal(actions.canAssign, true)
  assert.equal(actions.canStart, true)
  assert.equal(actions.canCancel, true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test src\features\design-tasks\utils\designTasksApi.test.js
```

Expected: FAIL because `getDesignTaskActions` does not check user permissions.

- [ ] **Step 3: Implement permission-aware gates**

Import:

```js
import { hasAnyPermission } from '../../auth/utils/authz.js'
```

Replace `getDesignTaskActions` with:

```js
export function getDesignTaskActions(task = {}, user = null) {
  const status = task.status || task.raw?.status
  const can = (permissions) => !user || hasAnyPermission(user, permissions)

  return {
    canAssign:
      ['REQUESTED', 'OPEN', 'ASSIGNED'].includes(status) &&
      can(['DESIGN_TASKS:ASSIGN', 'DESIGN_TASKS:WRITE']),
    canStart: status === 'ASSIGNED' && can(['DESIGN_TASKS:START', 'DESIGN_TASKS:WRITE']),
    canSubmit:
      ['IN_PROGRESS', 'REJECTED'].includes(status) &&
      can(['DESIGN_TASKS:SUBMIT', 'DESIGN_TASKS:WRITE']),
    canReview:
      status === 'SUBMITTED' &&
      can(['DESIGN_TASKS:APPROVE', 'DESIGN_TASKS:REVIEW', 'DESIGN_TASKS:WRITE']),
    canCancel:
      ['REQUESTED', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REJECTED'].includes(status) &&
      can(['DESIGN_TASKS:CANCEL', 'DESIGN_TASKS:WRITE']),
    canDeleteSubmission:
      status !== 'APPROVED' && can(['DESIGN_TASKS:DELETE_SUBMISSION', 'DESIGN_TASKS:WRITE']),
    isReadOnly: status === 'APPROVED' || status === 'CANCELLED',
  }
}
```

This keeps old callers working because `user = null` allows status-only behavior.

- [ ] **Step 4: Verify**

Run:

```powershell
node --test src\features\auth\utils\authz.test.js src\features\design-tasks\utils\designTasksApi.test.js
```

Expected: PASS.

---

### Task 5: Apply Permission UX To Design Tasks Page

**Files:**

- Modify: `src/features/design-tasks/pages/DesignTasksPage.jsx`

**Interfaces:**

- Consumes: `useAuthStore.currentUser`, `getDesignTaskActions(task, currentUser)`, `hasAnyPermission`
- Produces: permission-aware buttons, queue mode, and columns.

- [ ] **Step 1: Read current user in page**

Add imports:

```js
import { hasAnyPermission } from '@/features/auth/utils/authz'
import { useAuthStore } from '@/store/useAuthStore'
```

Inside `DesignTasksPage`:

```js
const currentUser = useAuthStore((state) => state.currentUser)
const canManageDesign = hasAnyPermission(currentUser, ['DESIGN_TASKS:ASSIGN', 'DESIGN_TASKS:WRITE'])
const canReviewDesign = hasAnyPermission(currentUser, [
  'DESIGN_TASKS:APPROVE',
  'DESIGN_TASKS:REVIEW',
])
const canSubmitDesign = hasAnyPermission(currentUser, ['DESIGN_TASKS:SUBMIT'])
```

- [ ] **Step 2: Add lightweight work mode**

Add state:

```js
const [workMode, setWorkMode] = useState(canManageDesign ? 'all' : 'mine')
```

Render near filters:

```jsx
<div className="flex flex-wrap gap-2">
  <Button
    variant={workMode === 'mine' ? 'contained' : 'outlined'}
    onClick={() => setWorkMode('mine')}
  >
    My queue
  </Button>
  {canManageDesign ? (
    <Button
      variant={workMode === 'all' ? 'contained' : 'outlined'}
      onClick={() => setWorkMode('all')}
    >
      All tasks
    </Button>
  ) : null}
  {canReviewDesign ? (
    <Button
      variant={workMode === 'review' ? 'contained' : 'outlined'}
      onClick={() => setWorkMode('review')}
    >
      Review queue
    </Button>
  ) : null}
</div>
```

- [ ] **Step 3: Apply work mode to query**

When building `filters` or `query`, set:

```js
const effectiveQuery = {
  ...query,
  assignedDesignerId: workMode === 'mine' && !canManageDesign ? 'me' : query.assignedDesignerId,
  status: workMode === 'review' ? 'SUBMITTED' : query.status,
}
```

Use `effectiveQuery` for `useDesignTasksQuery`, summary, and workload where appropriate.

If BE does not support `assignedDesignerId=me`, use current user employee/account id only if it is already available from `/me`; do not add a fake local id fallback.

- [ ] **Step 4: Pass current user into table and drawer actions**

Change:

```jsx
<TaskTable ... />
```

to:

```jsx
<TaskTable
  ...
  currentUser={currentUser}
  canManageDesign={canManageDesign}
/>
```

Change inside `TaskTable`:

```js
const actions = getDesignTaskActions(task, currentUser)
```

Hide action icons instead of rendering disabled icons:

```jsx
{
  actions.canStart ? (
    <RowAction title="Start task" disabled={isSubmitting} onClick={() => onStart(task)}>
      <PlayArrowIcon fontSize="small" />
    </RowAction>
  ) : null
}
```

Apply the same hide pattern to assign, submit, approve, reject, and cancel.

- [ ] **Step 5: Filter admin-only controls**

Hide `Bulk PSD` unless:

```js
canManageDesign
```

Hide assignee filter unless:

```js
canManageDesign || canReviewDesign
```

Keep search, type, status, date, and page size for everyone.

- [ ] **Step 6: Make empty state contextual**

In `TaskTable`, add `emptyMessage` prop:

```jsx
<TaskTable
  emptyMessage={
    workMode === 'mine'
      ? 'No tasks assigned to you.'
      : workMode === 'review'
        ? 'No submissions waiting for review.'
        : 'No design tasks found.'
  }
/>
```

Use it in empty state:

```jsx
<Typography className="font-semibold text-ink-strong">{emptyMessage}</Typography>
```

- [ ] **Step 7: Verify**

Run:

```powershell
node --test src\features\auth\utils\authz.test.js src\features\design-tasks\utils\designTasksApi.test.js
npm run lint
npm run build
```

Expected: PASS.

---

### Task 6: Manual UX Check

**Files:**

- No code changes.

**Interfaces:**

- Verifies actual UI behavior in `/portal/design/tasks`.

- [ ] **Step 1: Admin check**

Login as admin or use current admin session.

Expected:

- Sidebar still shows all admin modules.
- Design Tasks shows `My queue`, `All tasks`, and available admin filters.
- Assign, Start, Submit, Approve, Reject, Cancel appear only when task status allows them.
- `Bulk PSD` visible.

- [ ] **Step 2: Designer permission check**

Use a user with:

```js
;['DESIGN_TASKS:READ', 'DESIGN_TASKS:START', 'DESIGN_TASKS:SUBMIT']
```

Expected:

- Sidebar shows Design Tasks, not admin settings.
- Default queue is `My queue`.
- Start and Submit appear when status allows.
- Assign, Approve, Reject, Cancel, Bulk PSD are hidden.

- [ ] **Step 3: Reviewer permission check**

Use a user with:

```js
;['DESIGN_TASKS:READ', 'DESIGN_TASKS:APPROVE', 'DESIGN_TASKS:REVIEW']
```

Expected:

- Review queue is visible.
- Approve and Reject appear on submitted tasks.
- Assign, Start, Submit, Bulk PSD are hidden.

- [ ] **Step 4: Route denial check**

Try opening `/portal/settings/api-coverage` with a non-admin user.

Expected:

- Redirects to unauthorized.

---

## Self-Review

- Spec coverage: route gating, sidebar gating, action gating, admin full access, role-free UX, Design Tasks first slice are covered.
- Placeholder scan: no TODO/TBD placeholders.
- Type consistency: helpers and function names are defined before use.
- Scoped simplification: only Design Tasks gets full page-level UX in this plan. Orders, Catalog, Mapping should reuse the same helper pattern after this slice proves correct.
