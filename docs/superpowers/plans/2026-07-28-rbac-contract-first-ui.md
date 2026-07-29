# RBAC Contract-First UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing RBAC administration page so its actions, forms, tables, and access summaries match the verified backend contract.

**Architecture:** Keep the existing `/portal/settings/users-roles` route and five-tab page. Reuse the RBAC query/mutation hooks and components, add one small tested authorization policy helper, preserve backend error envelopes, and reshape the existing dialogs around global access plus scoped assignments.

**Tech Stack:** React 19, MUI, Tailwind CSS, TanStack Query, Zustand, react-i18next, Axios, Node test runner

## Global Constraints

- Keep backend authorization based on `AUTH:READ` and `AUTH:WRITE`; do not hardcode role names.
- Use the shared API client and endpoint constants; do not add raw URLs or `fetch` calls.
- Use existing MUI, Tailwind, TanStack Query, Zustand, and RBAC components before adding code.
- Add no frontend dependencies, routes, fake fields, or speculative API calls.
- Keep departments and teams as item-only select sources until backend pagination is fixed.
- Add every visible string to both `src/i18n/locales/vi/common.json` and `src/i18n/locales/en/common.json`.
- Preserve the two unrelated untracked scripts and stage only files named by each task.

---

## File Map

- `src/services/axiosInstance.js`: preserve backend error code/message in `ApiError`.
- `src/services/axiosInstance.test.js`: regression check for nested backend error envelopes.
- `src/features/rbac/utils/rbacAccess.js`: central `AUTH:READ` and `AUTH:WRITE` capability calculation.
- `src/features/rbac/utils/rbacAccess.test.js`: security-focused capability checks.
- `src/features/rbac/utils/usersDisplay.js`: normalize account-detail global roles, permissions, and scoped assignments for display.
- `src/features/rbac/utils/usersDisplay.test.js`: contract-shape checks for account access normalization.
- `src/features/rbac/utils/permissionsDisplay.js`: remove unsupported permission status filtering.
- `src/features/rbac/utils/permissionsDisplay.test.js`: verify supported filters and usage values.
- `src/features/rbac/utils/scopesDisplay.js`: expose the scope deactivation constraint from `assignmentCount`.
- `src/features/rbac/utils/scopesDisplay.test.js`: verify the constraint boundary.
- `src/features/rbac/utils/scopedOverridesDisplay.js`: model scoped rules as replacement sets.
- `src/features/rbac/utils/scopedOverridesDisplay.test.js`: verify replacement semantics.
- `src/features/rbac/components/AccountInfoDialog.jsx`: read-only contract-backed account summary and authorized session/status actions.
- `src/features/rbac/components/EditAccessDialog.jsx`: global access editor plus scoped assignment editor.
- `src/features/rbac/components/RoleDialog.jsx`: allow permission selection during create and edit.
- `src/features/rbac/components/PermissionPicker.jsx`: reuse module grouping with accessible selection controls.
- `src/features/rbac/pages/UsersRolesPage.jsx`: workbench header, supported filters, tables, action gating, and mutation wiring.
- `src/i18n/locales/vi/common.json`: Vietnamese RBAC copy.
- `src/i18n/locales/en/common.json`: English RBAC copy.

---

### Task 1: Preserve Backend Error Codes

**Files:**

- Modify: `src/services/axiosInstance.js:35-60`
- Create: `src/services/axiosInstance.test.js`

**Interfaces:**

- Consumes: backend error envelope `{ success: false, error: { code, message, requestId, details } }`.
- Produces: exported `normalizeApiError(error)` returning `ApiError` with `.code`, `.message`, `.status`, and `.data`.

- [ ] **Step 1: Write the failing backend-envelope test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { AxiosError } from 'axios'

import { normalizeApiError } from './axiosInstance.js'

test('normalizeApiError preserves backend error code and message', () => {
  const error = new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    {},
    {},
    {
      status: 409,
      data: {
        success: false,
        error: {
          code: 'SCOPE_IN_USE',
          message: 'Scope has active assignments',
          requestId: 'request-1',
        },
      },
    },
  )

  const normalized = normalizeApiError(error)

  assert.equal(normalized.status, 409)
  assert.equal(normalized.code, 'SCOPE_IN_USE')
  assert.equal(normalized.message, 'Scope has active assignments')
  assert.equal(normalized.data.error.requestId, 'request-1')
})
```

- [ ] **Step 2: Run the test and verify the missing export or wrong code fails**

Run: `node --test src/services/axiosInstance.test.js`

Expected: FAIL because `normalizeApiError` is not exported or `.code` is `ERR_BAD_REQUEST`.

- [ ] **Step 3: Export the normalizer and prefer the backend envelope**

```js
export function normalizeApiError(error) {
  if (!axios.isAxiosError(error)) return error

  const status = error.response?.status
  const data = error.response?.data
  const backendError = data && typeof data === 'object' ? data.error : undefined
  const serverMessage = data?.message || backendError?.message

  return new ApiError({
    message: serverMessage || 'errors.api.network',
    status,
    data,
    code: backendError?.code || error.code,
  })
}
```

- [ ] **Step 4: Run the focused test**

Run: `node --test src/services/axiosInstance.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the error-contract fix**

```bash
git add src/services/axiosInstance.js src/services/axiosInstance.test.js
git commit -m "fix(api): preserve backend error codes"
```

---

### Task 2: Add a Tested RBAC Capability Boundary

**Files:**

- Create: `src/features/rbac/utils/rbacAccess.js`
- Create: `src/features/rbac/utils/rbacAccess.test.js`
- Modify: `src/features/rbac/pages/UsersRolesPage.jsx:112-220`

**Interfaces:**

- Consumes: the current auth-store user shape already supported by `hasAnyPermission(user, permissions)`.
- Produces: `RBAC_PERMISSIONS` and `getRbacCapabilities(user) -> { canRead, canWrite }`.

- [ ] **Step 1: Write failing capability tests**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { getRbacCapabilities } from './rbacAccess.js'

test('AUTH:READ grants view-only RBAC access', () => {
  assert.deepEqual(getRbacCapabilities({ permissions: ['AUTH:READ'] }), {
    canRead: true,
    canWrite: false,
  })
})

test('AUTH:WRITE grants mutation access', () => {
  assert.equal(getRbacCapabilities({ permissions: ['AUTH:READ', 'AUTH:WRITE'] }).canWrite, true)
})

test('MANAGE_SYSTEM keeps the established permission bypass', () => {
  assert.equal(getRbacCapabilities({ permissions: ['MANAGE_SYSTEM'] }).canWrite, true)
})
```

- [ ] **Step 2: Run the test and verify the module is missing**

Run: `node --test src/features/rbac/utils/rbacAccess.test.js`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the minimal policy helper by reusing authz**

```js
import { hasAnyPermission } from '../../auth/utils/authz.js'

export const RBAC_PERMISSIONS = Object.freeze({
  READ: 'AUTH:READ',
  WRITE: 'AUTH:WRITE',
})

export function getRbacCapabilities(user) {
  return {
    canRead: hasAnyPermission(user, [RBAC_PERMISSIONS.READ]),
    canWrite: hasAnyPermission(user, [RBAC_PERMISSIONS.WRITE]),
  }
}
```

- [ ] **Step 4: Wire `canWrite` into the page without changing the route guard**

```jsx
const currentUser = useAuthStore((state) => state.currentUser)
const { canWrite } = getRbacCapabilities(currentUser)
```

Use this value for every mutation entry point. Keep detail buttons visible. Hide primary create buttons and destructive row-menu items when `canWrite` is false. Pass `canWrite` into account detail and access dialogs so nested actions cannot bypass the page-level decision.

- [ ] **Step 5: Run capability and existing auth tests**

Run: `node --test src/features/rbac/utils/rbacAccess.test.js src/features/auth/utils/authz.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the authorization boundary**

```bash
git add src/features/rbac/utils/rbacAccess.js src/features/rbac/utils/rbacAccess.test.js src/features/rbac/pages/UsersRolesPage.jsx
git commit -m "fix(rbac): gate admin mutations by permission"
```

---

### Task 3: Normalize and Display Account Access

**Files:**

- Modify: `src/features/rbac/utils/usersDisplay.js`
- Modify: `src/features/rbac/utils/usersDisplay.test.js`
- Modify: `src/features/rbac/components/AccountInfoDialog.jsx`
- Modify: `src/features/rbac/pages/UsersRolesPage.jsx:222-430`
- Modify: `src/i18n/locales/vi/common.json:389-495`
- Modify: `src/i18n/locales/en/common.json:391-497`

**Interfaces:**

- Consumes: account detail `{ account, access, roles, permissions, effectiveRoles, effectivePermissions, scopes }` and account list fields `department`, `team`, `memberType`, `roleAssignments`, `lastLoginAt`.
- Produces: `getAccountAccessSummary(detail)` with arrays `globalRoles`, `globalPermissions`, `effectiveRoles`, `effectivePermissions`, and `scopedAssignments`.

- [ ] **Step 1: Add a failing account-detail normalization test**

```js
test('getAccountAccessSummary keeps global and scoped access separate', () => {
  const result = getAccountAccessSummary({
    access: { roleIds: ['role-1'], customPermissionIds: ['permission-1'] },
    roles: [{ id: 'role-1', code: 'ADMIN' }],
    permissions: [{ id: 'permission-1', code: 'AUTH:READ' }],
    effectiveRoles: ['ADMIN'],
    effectivePermissions: ['AUTH:READ', 'AUTH:WRITE'],
    scopes: [{ assignmentId: 'assignment-1', scopeType: 'team', scopeId: 'team-1' }],
  })

  assert.deepEqual(
    result.globalRoles.map((role) => role.id),
    ['role-1'],
  )
  assert.deepEqual(
    result.globalPermissions.map((permission) => permission.id),
    ['permission-1'],
  )
  assert.deepEqual(
    result.scopedAssignments.map((item) => item.assignmentId),
    ['assignment-1'],
  )
  assert.deepEqual(result.effectivePermissions, ['AUTH:READ', 'AUTH:WRITE'])
})
```

- [ ] **Step 2: Run the focused test and verify the helper is missing**

Run: `node --test src/features/rbac/utils/usersDisplay.test.js`

Expected: FAIL because `getAccountAccessSummary` does not exist.

- [ ] **Step 3: Add the minimal normalizer**

```js
export function getAccountAccessSummary(detail = {}) {
  const roleIds = new Set(detail.access?.roleIds ?? [])
  const permissionIds = new Set(detail.access?.customPermissionIds ?? [])

  return {
    globalRoles: (detail.roles ?? []).filter((role) => roleIds.has(role.id)),
    globalPermissions: (detail.permissions ?? []).filter((permission) =>
      permissionIds.has(permission.id),
    ),
    effectiveRoles: detail.effectiveRoles ?? [],
    effectivePermissions: detail.effectivePermissions ?? [],
    scopedAssignments: detail.scopes ?? [],
  }
}
```

- [ ] **Step 4: Rebuild account detail around response-backed sections**

In `AccountInfoDialog.jsx`:

- Remove local password visibility state, the disabled fake password field, and `createdBy`.
- Add Identity, Global access, Scoped assignments, and Effective permissions sections.
- Render all roles and assignments rather than selecting the first role.
- Keep reset-password, status, and revoke-session actions only when `canWrite` is true.
- Replace `window.prompt` with an existing MUI dialog/form pattern so password entry is validated and never displayed back.
- Show `lastLoginAt`, `lastLoginIp`, `createdAt`, department, team, and member type only from returned fields.

- [ ] **Step 5: Update the Users table and supported filters**

Use list DTO fields directly:

- Add `teamId` to `userFilters`; it is accepted by `listAccountsQuerySchema`.
- Include `archived` in the existing status selector; `status` accepts all backend account statuses.
- Display `memberType` in the table/detail when returned, but do not send it as a query parameter.
- Add department/team organization, global role chips, scoped assignment count, and last login columns.
- Keep server `page`, `limit`, and `total` as the pagination source.
- Use horizontal table scrolling below desktop width.

- [ ] **Step 6: Add matching Vietnamese and English copy**

Add paired keys for global access, direct permissions, scoped assignments, effective permissions, last-login IP, session revocation, no-filter-results, and no-records. Remove keys used only by fake password visibility and `createdBy` after confirming `rg` has no callers.

- [ ] **Step 7: Run focused tests and lint touched files**

Run: `node --test src/features/rbac/utils/usersDisplay.test.js`

Run: `npx eslint src/features/rbac/utils/usersDisplay.js src/features/rbac/utils/usersDisplay.test.js src/features/rbac/components/AccountInfoDialog.jsx src/features/rbac/pages/UsersRolesPage.jsx`

Expected: all commands PASS.

- [ ] **Step 8: Commit the account summary work**

```bash
git add src/features/rbac/utils/usersDisplay.js src/features/rbac/utils/usersDisplay.test.js src/features/rbac/components/AccountInfoDialog.jsx src/features/rbac/pages/UsersRolesPage.jsx src/i18n/locales/vi/common.json src/i18n/locales/en/common.json
git commit -m "feat(rbac): show contract-backed account access"
```

---

### Task 4: Manage Global and Scoped Access in One Dialog

**Files:**

- Modify: `src/features/rbac/components/EditAccessDialog.jsx`
- Modify: `src/features/rbac/pages/UsersRolesPage.jsx:185-220, 890-1100`
- Modify: `src/features/rbac/utils/rbacApi.test.js`
- Modify: `src/i18n/locales/vi/common.json:440-495`
- Modify: `src/i18n/locales/en/common.json:442-497`

**Interfaces:**

- Consumes: `useUpdateAccountAccessMutation`, `useCreateAccessAssignmentMutation`, `useUpdateAccessAssignmentMutation`, `useDeactivateAccessAssignmentMutation`, roles, permissions, scopes, and account detail.
- Produces: `onUpdateGlobalAccess({ accountId, values: { roleIds, customPermissionIds } }, onSuccess)` and the existing scoped-assignment callbacks.

- [ ] **Step 1: Extend the payload regression check**

```js
test('buildAccountAccessPayload keeps only global role and direct permission IDs', () => {
  assert.deepEqual(
    buildAccountAccessPayload({
      roleIds: ['role-1', '', 'role-2'],
      customPermissionIds: ['permission-1', null],
      scopes: ['ignored'],
    }),
    {
      roleIds: ['role-1', 'role-2'],
      customPermissionIds: ['permission-1'],
    },
  )
})
```

- [ ] **Step 2: Run the payload tests**

Run: `node --test src/features/rbac/utils/rbacApi.test.js`

Expected: PASS, proving the existing builder already matches the backend body.

- [ ] **Step 3: Wire the unused global-access mutation in the page**

```jsx
const updateAccountAccessMutation = useUpdateAccountAccessMutation()

const updateGlobalAccess = (payload, onSuccess) =>
  runMutation(
    updateAccountAccessMutation,
    payload,
    t('rbac.users.feedback.accessUpdated'),
    onSuccess,
  )
```

Include this mutation in the dialog pending state.

- [ ] **Step 4: Add the Global Access section**

In `EditAccessDialog.jsx`, initialize local values when account detail changes:

```jsx
const [globalAccess, setGlobalAccess] = useState({ roleIds: [], customPermissionIds: [] })

useEffect(() => {
  if (!open || !data?.access) return
  setGlobalAccess({
    roleIds: data.access.roleIds ?? [],
    customPermissionIds: data.access.customPermissionIds ?? [],
  })
}, [data?.access, open])
```

Render a role multi-select and the existing `PermissionPicker`. Save only through `onUpdateGlobalAccess({ accountId, values: globalAccess })`.

- [ ] **Step 5: Clarify scoped assignment semantics**

- Keep role/scope changes using `buildAccessAssignmentResetPayload`, which sends `overridePermissionIds: null`.
- Label `customPermissionIds` as additive permissions.
- Label `overridePermissionIds` as replacement permissions.
- Preserve entered values and keep the dialog open when the backend returns a conflict.
- Disable only the active row or submit action while its mutation is pending.

- [ ] **Step 6: Add paired dialog copy and run checks**

Run: `node --test src/features/rbac/utils/rbacApi.test.js`

Run: `npx eslint src/features/rbac/components/EditAccessDialog.jsx src/features/rbac/pages/UsersRolesPage.jsx`

Expected: PASS.

- [ ] **Step 7: Commit global and scoped access editing**

```bash
git add src/features/rbac/components/EditAccessDialog.jsx src/features/rbac/pages/UsersRolesPage.jsx src/features/rbac/utils/rbacApi.test.js src/i18n/locales/vi/common.json src/i18n/locales/en/common.json
git commit -m "feat(rbac): manage global and scoped access"
```

---

### Task 5: Align Roles and Permissions with Usage Contracts

**Files:**

- Modify: `src/features/rbac/components/RoleDialog.jsx`
- Modify: `src/features/rbac/components/PermissionPicker.jsx`
- Modify: `src/features/rbac/pages/UsersRolesPage.jsx:433-650`
- Modify: `src/features/rbac/utils/permissionsDisplay.js`
- Modify: `src/features/rbac/utils/permissionsDisplay.test.js`
- Modify: `src/i18n/locales/vi/common.json:496-593`
- Modify: `src/i18n/locales/en/common.json:498-595`

**Interfaces:**

- Consumes: role DTO `permissions`, `permissionCount`, `userCount`, `deletable`; permission DTO usage counts and `deletable`.
- Produces: role create/update bodies that always include selected `permissionIds`; permission filters limited to search, module, and action.

- [ ] **Step 1: Replace the unsupported permission status test**

```js
test('filterPermissionItems filters by supported module action and search fields', () => {
  const items = [
    { id: '1', code: 'AUTH:READ', module: 'AUTH', action: 'READ', status: 'active' },
    { id: '2', code: 'AUTH:WRITE', module: 'AUTH', action: 'WRITE', status: 'active' },
  ]

  assert.deepEqual(
    filterPermissionItems(items, { search: 'write', module: 'AUTH', action: 'WRITE' }).map(
      (item) => item.id,
    ),
    ['2'],
  )
})

test('filterPermissionItems ignores unsupported status input', () => {
  const items = [{ id: '1', code: 'AUTH:READ', module: 'AUTH', action: 'READ', status: 'active' }]

  assert.deepEqual(filterPermissionItems(items, { status: 'deprecated' }), items)
})
```

- [ ] **Step 2: Run the permission display tests**

Run: `node --test src/features/rbac/utils/permissionsDisplay.test.js`

Expected: FAIL because the current implementation treats `status` as a live filter.

- [ ] **Step 3: Remove dead status behavior**

Delete `PERMISSION_STATUS_OPTIONS`, the `status` field in `permissionFilters`, the status select in `UsersRolesPage`, and `statusMatch` from `filterPermissionItems`.

- [ ] **Step 4: Enable permission selection in role creation**

In `RoleDialog.jsx`, always render the permission picker/group list and submit:

```js
onSubmit({
  ...form,
  permissionIds: Array.from(selectedPermissionIds),
})
```

Remove the `editing &&` display gate. Keep code immutable during edit and editable during create.

- [ ] **Step 5: Make selection controls accessible**

In `PermissionPicker.jsx`, replace dynamic `gap-${...}` with `dense ? 'gap-3' : 'gap-5'`, render the module name followed by `selectedCount/total`, and ensure each checkbox label includes the permission code. Do not add a new picker dependency.

- [ ] **Step 6: Show backend usage and deletability**

- Roles table: show `permissionCount`, `userCount`, and disable/delete-hide based on `deletable`.
- Permissions table: show `roleCount`, `scopedRoleCount`, `directAssignmentCount`, `usageCount`, and disable delete when `deletable` is false.
- Wire the existing `useDeleteRoleMutation`; keep `useDeletePermissionMutation`.
- Use backend conflict messages if usage changes after render.

- [ ] **Step 7: Add paired copy and run checks**

Run: `node --test src/features/rbac/utils/permissionsDisplay.test.js src/features/rbac/utils/rolesDisplay.test.js src/features/rbac/utils/rbacApi.test.js`

Run: `npx eslint src/features/rbac/components/RoleDialog.jsx src/features/rbac/components/PermissionPicker.jsx src/features/rbac/pages/UsersRolesPage.jsx src/features/rbac/utils/permissionsDisplay.js`

Expected: PASS.

- [ ] **Step 8: Commit the roles and permissions alignment**

```bash
git add src/features/rbac/components/RoleDialog.jsx src/features/rbac/components/PermissionPicker.jsx src/features/rbac/pages/UsersRolesPage.jsx src/features/rbac/utils/permissionsDisplay.js src/features/rbac/utils/permissionsDisplay.test.js src/i18n/locales/vi/common.json src/i18n/locales/en/common.json
git commit -m "feat(rbac): align roles and permissions with usage"
```

---

### Task 6: Enforce Scope Constraints and Replacement Overrides

**Files:**

- Modify: `src/features/rbac/utils/scopesDisplay.js`
- Modify: `src/features/rbac/utils/scopesDisplay.test.js`
- Modify: `src/features/rbac/utils/scopedOverridesDisplay.js`
- Modify: `src/features/rbac/utils/scopedOverridesDisplay.test.js`
- Modify: `src/features/rbac/pages/UsersRolesPage.jsx:650-890`
- Modify: `src/i18n/locales/vi/common.json:594-720`
- Modify: `src/i18n/locales/en/common.json:596-722`

**Interfaces:**

- Consumes: scope `assignmentCount`, `status`, `resource`, `parentDepartment`; scoped role rule `permissionIds` and `permissionDetails`.
- Produces: `canDeactivateScope(scope)` and override sections whose permissions are replacement permissions only.

- [ ] **Step 1: Write failing scope-constraint checks**

```js
test('canDeactivateScope blocks scopes with active assignments', () => {
  assert.equal(canDeactivateScope({ status: 'active', assignmentCount: 2 }), false)
  assert.equal(canDeactivateScope({ status: 'active', assignmentCount: 0 }), true)
  assert.equal(canDeactivateScope({ status: 'inactive', assignmentCount: 0 }), false)
})
```

- [ ] **Step 2: Write a replacement-override regression check**

```js
test('buildScopedOverrideSections uses the rule as a replacement set', () => {
  const [section] = buildScopedOverrideSections({
    roles: [{ id: 'role-1', code: 'STAFF', permissions: ['read'] }],
    permissions: [
      { id: 'read', code: 'AUTH:READ' },
      { id: 'write', code: 'AUTH:WRITE' },
    ],
    rules: [{ roleId: 'role-1', scopeId: 'team-1', permissionIds: ['write'] }],
  })

  assert.deepEqual(
    section.overrideGroups[0].permissions.map((item) => item.id),
    ['write'],
  )
  assert.deepEqual(section.defaultPermissionIds, ['read'])
})
```

- [ ] **Step 3: Run both focused suites**

Run: `node --test src/features/rbac/utils/scopesDisplay.test.js src/features/rbac/utils/scopedOverridesDisplay.test.js`

Expected: the new scope helper test FAILS; the override test protects the intended replacement behavior.

- [ ] **Step 4: Implement the scope constraint**

```js
export function canDeactivateScope(scope = {}) {
  return scope.status === 'active' && Number(scope.assignmentCount || 0) === 0
}
```

Use it to disable deactivation while showing the translated assignment-count reason. Wire the existing `useDeactivateScopeMutation` instead of sending an update that imitates deletion.

- [ ] **Step 5: Make replacement semantics explicit**

- Keep role default permissions visible only as reference.
- The editable selection starts from the rule's `permissionIds`, not a union with role permissions.
- Submit `buildScopedRulePayload({ role, scope, permissionIds })` unchanged.
- Empty-state copy states that roles inherit normally when no scoped rule exists.
- Remove fixed role-name filter options and build the role filter from returned roles.

- [ ] **Step 6: Show contract-backed scope columns**

Render scope resource, parent department, status, `assignmentCount`, and actions. Use the DTO's `resource` and `parentDepartment`; do not reconstruct organization objects from paginated department/team metadata.

- [ ] **Step 7: Run focused checks**

Run: `node --test src/features/rbac/utils/scopesDisplay.test.js src/features/rbac/utils/scopedOverridesDisplay.test.js`

Run: `npx eslint src/features/rbac/utils/scopesDisplay.js src/features/rbac/utils/scopedOverridesDisplay.js src/features/rbac/pages/UsersRolesPage.jsx`

Expected: PASS.

- [ ] **Step 8: Commit scope and override behavior**

```bash
git add src/features/rbac/utils/scopesDisplay.js src/features/rbac/utils/scopesDisplay.test.js src/features/rbac/utils/scopedOverridesDisplay.js src/features/rbac/utils/scopedOverridesDisplay.test.js src/features/rbac/pages/UsersRolesPage.jsx src/i18n/locales/vi/common.json src/i18n/locales/en/common.json
git commit -m "feat(rbac): enforce scope and override contracts"
```

---

### Task 7: Finish Workbench Hierarchy and Verify End to End

**Files:**

- Modify: `src/features/rbac/pages/UsersRolesPage.jsx`
- Modify: `src/features/rbac/components/shared.jsx`
- Modify: `src/i18n/locales/vi/common.json`
- Modify: `src/i18n/locales/en/common.json`

**Interfaces:**

- Consumes: completed capability, error, account, role, permission, scope, and override behavior from Tasks 1-6.
- Produces: the final dense five-tab RBAC workbench with consistent loading, empty, error, and responsive states.

- [ ] **Step 1: Add the compact workbench hierarchy**

- Header: title, one-sentence description, active-tab total, and the authorized primary action.
- Tabs: Users, Roles, Permissions, Scopes, Overrides with totals from their existing queries.
- Filter rows: keep supported filters adjacent to their table.
- Tables: use shared headers, dense rows, visible focus, and horizontal overflow.
- Avoid separate summary API calls; derive counts from list responses already loaded.

- [ ] **Step 2: Complete state feedback**

- Loading preserves table structure through the existing loading treatment.
- Empty state distinguishes zero records from zero filter matches.
- Query errors show the backend message and a retry action.
- Mutation errors retain dialog input and use `ApiError.message`.
- Icon-only buttons retain translated `aria-label` and tooltips.

- [ ] **Step 3: Run every RBAC and API regression test**

Run:

```bash
node --test src/services/axiosInstance.test.js src/features/auth/utils/authz.test.js src/features/rbac/utils/*.test.js
```

Expected: all tests PASS.

- [ ] **Step 4: Run repository verification**

Run: `npm run lint`

Expected: PASS with no ESLint errors.

Run: `npm run build`

Expected: PASS and Vite emits the production bundle.

- [ ] **Step 5: Verify the authenticated UI manually**

Start the existing local FE and BE without changing env files. Log in through the UI with the provided admin account, then verify:

1. All five tabs load real backend data.
2. Role creation sends selected permission IDs.
3. Account detail separates global, scoped, and effective permissions.
4. Global access save uses `PATCH /api/auth/accounts/:id/access`.
5. Scope deactivation is blocked when `assignmentCount > 0`.
6. Overrides are labeled and edited as replacement sets.
7. A backend conflict displays its specific message without clearing form state.
8. At desktop and narrow viewport widths, tables remain usable and dialog focus/labels are correct.

Do not print or persist credentials, access tokens, or refresh tokens during verification.

- [ ] **Step 6: Review the final diff and commit polish**

Run: `git diff --check`

Run: `git status --short`

Expected: only intentional RBAC files plus the two pre-existing untracked scripts appear.

```bash
git add src/features/rbac/pages/UsersRolesPage.jsx src/features/rbac/components/shared.jsx src/i18n/locales/vi/common.json src/i18n/locales/en/common.json
git commit -m "feat(rbac): finish contract-first admin workbench"
```
