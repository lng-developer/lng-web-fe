# RBAC Access Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five CRUD-table tabs on `/portal/settings/users-roles` with the approved Access Explorer, Roles & Policies, and Scope Matrix workspaces while preserving every verified RBAC API contract and permission gate.

**Architecture:** Keep `UsersRolesPage` as the query/mutation/dialog coordinator. Move each task-oriented workspace into one feature-local component, reuse the existing RBAC hooks, payload builders, dialogs, display helpers, and broad RBAC query invalidation, and render effective access only from `useAccountQuery`. Replace the centered access modal with a responsive MUI Drawer; add no endpoint, dependency, client-side authorization calculation, or persistent store.

**Tech Stack:** React 19, MUI 9, Tailwind CSS 4, TanStack Query 5, react-i18next, notistack, Node `node:test`.

## Global Constraints

- Stay on the current `/portal/settings/users-roles` route and current branch.
- Keep read/write behavior tied to backend permissions `AUTH:READ` and `AUTH:WRITE`; never infer capability from role names.
- Keep all HTTP work in the existing `rbac.queries.js` and `rbac.mutations.js` hooks. Do not add an endpoint or ad hoc request.
- Treat `useAccountQuery(accountId)` as the only source for global, scoped, and effective account access. Do not calculate effective access in the browser.
- Reuse `buildAccountAccessPayload`, `buildAccessAssignmentPayload`, `buildAccessAssignmentUpdatePayload`, `buildAccessAssignmentResetPayload`, and `buildScopedRulePayload` unchanged unless a failing contract test proves otherwise.
- Preserve backend error messages through the existing `runMutation`/snackbar path, and keep form state after failed mutations.
- Use existing MUI components, Tailwind tokens, dialogs, and pickers. Add no dependency, theme token, state store, API abstraction, or speculative audit/expiry/approval/Allow-Deny UI.
- Keep touch targets, keyboard selection, focus restoration, text status labels, tooltips, and accessible names.
- Use `apply_patch` for repository edits and preserve unrelated untracked files.

---

## Task 1: Add the smallest tested presentation helpers

**Files:**

- Modify: `src/features/rbac/utils/usersDisplay.js`
- Modify: `src/features/rbac/utils/usersDisplay.test.js`
- Modify: `src/features/rbac/utils/rolesDisplay.js`
- Modify: `src/features/rbac/utils/rolesDisplay.test.js`
- Modify: `src/features/rbac/utils/scopedOverridesDisplay.js`
- Modify: `src/features/rbac/utils/scopedOverridesDisplay.test.js`

- [ ] **Step 1: Write the failing account-selection test**

Add these imports and tests to `usersDisplay.test.js`:

```js
import { resolveSelectedAccountId } from './usersDisplay.js'

test('resolveSelectedAccountId keeps an explicit URL selection and otherwise uses the first account', () => {
  const accounts = [{ id: 'account-1' }, { accountId: 'account-2' }]

  assert.equal(resolveSelectedAccountId(accounts, 'account-2'), 'account-2')
  assert.equal(resolveSelectedAccountId(accounts, 'account-outside-page'), 'account-outside-page')
  assert.equal(resolveSelectedAccountId(accounts, ''), 'account-1')
  assert.equal(resolveSelectedAccountId([], ''), '')
})
```

- [ ] **Step 2: Run the tests and verify the missing exports fail**

Run:

```powershell
node --test src/features/rbac/utils/usersDisplay.test.js
```

Expected: FAIL because `resolveSelectedAccountId` is not exported.

- [ ] **Step 3: Implement the helpers in the existing utility**

Add to `usersDisplay.js`, reusing backend IDs and codes without inventing a view-model layer:

```js
export function resolveSelectedAccountId(accounts = [], selectedId = '') {
  if (selectedId) return selectedId
  return accounts[0]?.id || accounts[0]?.accountId || ''
}
```

- [ ] **Step 4: Write the failing effective-permission grouping test**

Add this test to `rolesDisplay.test.js`:

```js
test('groupPermissionsByModule resolves effective permission codes through the catalog', () => {
  const grouped = groupPermissionsByModule(
    ['AUTH:READ', 'ORDERS:WRITE', 'AUTH:WRITE'],
    [{ code: 'ORDERS:WRITE', module: 'COMMERCE', name: 'Write orders' }],
  )

  assert.deepEqual(
    grouped.map((group) => [group.module, group.permissions.map((permission) => permission.code)]),
    [
      ['AUTH MODULE', ['AUTH:READ', 'AUTH:WRITE']],
      ['COMMERCE MODULE', ['ORDERS:WRITE']],
    ],
  )
})
```

- [ ] **Step 5: Run the grouping test and verify string input fails**

Run:

```powershell
node --test src/features/rbac/utils/rolesDisplay.test.js
```

Expected: FAIL because the current `groupPermissionsByModule` only accepts permission objects.

- [ ] **Step 6: Extend the existing grouper instead of adding another one**

Update `groupPermissionsByModule` in `rolesDisplay.js` to accept an optional catalog while preserving its current return shape:

```js
export function groupPermissionsByModule(permissions = [], catalog = []) {
  const catalogByCode = new Map(catalog.map((permission) => [permission.code, permission]))
  const normalized = permissions
    .map((permission) => {
      if (typeof permission !== 'string') return permission
      return (
        catalogByCode.get(permission) || {
          code: permission,
          module: permission.split(':')[0] || 'OTHER',
        }
      )
    })
    .filter(Boolean)
  const grouped = normalized.reduce((items, permission) => {
    const moduleName = `${permission.module || 'OTHER'} MODULE`
    return { ...items, [moduleName]: [...(items[moduleName] ?? []), permission] }
  }, {})

  return Object.entries(grouped).map(([module, modulePermissions]) => ({
    module,
    permissions: modulePermissions,
  }))
}
```

- [ ] **Step 7: Write the failing Scope Matrix cell test**

Add this import and test to `scopedOverridesDisplay.test.js`:

```js
import { getScopeMatrixCell } from './scopedOverridesDisplay.js'

test('getScopeMatrixCell matches a role and scope without simulating permissions', () => {
  const cell = getScopeMatrixCell(
    [{ roleId: 'manager-id', scopeType: 'department', scopeId: 'dept-id', permissionIds: ['p3'] }],
    roles[1],
    { scopeType: 'department', scopeId: 'dept-id' },
  )

  assert.equal(cell.hasReplacement, true)
  assert.equal(cell.permissionCount, 1)
  assert.equal(cell.rule.roleId, 'manager-id')
  assert.deepEqual(getScopeMatrixCell([], roles[1], { scopeType: 'team', scopeId: 'team-id' }), {
    hasReplacement: false,
    permissionCount: 0,
    rule: null,
  })
})
```

- [ ] **Step 8: Run the Scope Matrix test and verify the missing export fails**

Run:

```powershell
node --test src/features/rbac/utils/scopedOverridesDisplay.test.js
```

Expected: FAIL because `getScopeMatrixCell` is not exported.

- [ ] **Step 9: Implement one lookup helper**

Add to `scopedOverridesDisplay.js`:

```js
export function getScopeMatrixCell(rules = [], role = {}, scope = {}) {
  const rule =
    rules.find(
      (item) =>
        item.roleId === role.id &&
        item.scopeType === scope.scopeType &&
        item.scopeId === (scope.scopeId || scope.resourceId || scope.id),
    ) ?? null

  return {
    hasReplacement: Boolean(rule),
    permissionCount: rule?.permissionIds?.length ?? 0,
    rule,
  }
}
```

- [ ] **Step 10: Run all three focused helper test files**

Run:

```powershell
node --test src/features/rbac/utils/usersDisplay.test.js src/features/rbac/utils/rolesDisplay.test.js src/features/rbac/utils/scopedOverridesDisplay.test.js
```

Expected: PASS.

- [ ] **Step 11: Commit the tested helpers**

```powershell
git add src/features/rbac/utils/usersDisplay.js src/features/rbac/utils/usersDisplay.test.js src/features/rbac/utils/rolesDisplay.js src/features/rbac/utils/rolesDisplay.test.js src/features/rbac/utils/scopedOverridesDisplay.js src/features/rbac/utils/scopedOverridesDisplay.test.js
git commit -m "test(rbac): cover access explorer presentation"
```

---

## Task 2: Build the Access Explorer reading experience

**Files:**

- Create: `src/features/rbac/components/AccessExplorer.jsx`
- Delete: `src/features/rbac/components/AccountInfoDialog.jsx`
- Modify: `src/features/rbac/components/index.js`
- Modify: `src/features/rbac/pages/UsersRolesPage.jsx`
- Modify: `src/i18n/locales/vi/common.json`
- Modify: `src/i18n/locales/en/common.json`

- [ ] **Step 1: Replace the account-detail modal boundary with an Explorer component**

Create `AccessExplorer.jsx` by moving the useful account identity, access summary, reset-password dialog, status mutation, and session revocation behavior out of `AccountInfoDialog.jsx`. Use this exact public interface:

```jsx
export default function AccessExplorer({
  accounts,
  accountsQuery,
  filters,
  pagination,
  selectedAccountId,
  permissions,
  canWrite,
  statusPending,
  passwordPending,
  sessionsPending,
  onFiltersChange,
  onSelectAccount,
  onEditAccess,
  onUpdateStatus,
  onResetPassword,
  onRevokeSessions,
  t,
  i18n,
})
```

Inside it, call the existing detail hook only for the selected account:

```jsx
const detailQuery = useAccountQuery(selectedAccountId, { enabled: Boolean(selectedAccountId) })
const detail = detailQuery.data
const account = detail?.account
const access = getAccountAccessSummary(detail)
const effectiveGroups = groupPermissionsByModule(access.effectivePermissions, permissions)
```

The component should contain only local render helpers for these three connected columns:

- Account rail: existing supported search/status/department/team/role filters, existing pagination, selected `aria-current="true"`, and a 44px minimum click target.
- Access profile: identity, Global, Scoped, then backend-returned Effective groups. Keep the selected rail identity visible while detail is pending or retrying.
- Action inspector: edit access, reset password, revoke sessions, and the existing account-status switch. Hide every mutation control when `canWrite` is false.

For mobile, use the same data and actions with responsive Tailwind layout: an account selector at the top, stacked Overview/Global/Scoped/Effective sections, and a sticky bottom edit action. Do not create a second mobile data path.

- [ ] **Step 2: Keep selection in the URL without adding a store**

In `UsersRolesPage.jsx`, replace the five-tab selection state with the three workspace IDs and use React Router's existing `useSearchParams` for account selection:

```jsx
const WORKSPACES = {
  EXPLORER: 'access',
  POLICIES: 'policies',
  MATRIX: 'matrix',
}

const [workspace, setWorkspace] = useState(WORKSPACES.EXPLORER)
const [searchParams, setSearchParams] = useSearchParams()
const requestedAccountId = searchParams.get('accountId') || ''
const selectedAccountId = resolveSelectedAccountId(accounts, requestedAccountId)

const selectAccount = (accountId) => {
  const next = new URLSearchParams(searchParams)
  next.set('accountId', accountId)
  setSearchParams(next, { replace: true })
}
```

Do not persist duplicate selection state. An explicit URL account ID stays selected even when it is outside the current paginated rail; the detail query validates it and shows its backend error if invalid. When the URL has no account ID, set the first returned ID once from an effect guarded by equality.

- [ ] **Step 3: Wire the existing actions unchanged**

Pass the current `runMutation` handlers for status, password, sessions, and `setDialog({ type: 'edit-access', payload: selectedAccountId })` to `AccessExplorer`. Delete the old `view-account` dialog state and `AccountInfoDialog` render block; remove the file and export after all behavior is absorbed.

Do not move mutations into the new component. Mutation success continues to invalidate `rbacKeys.all`, so the selected account detail refetches from the backend.

- [ ] **Step 4: Add bilingual workspace and Explorer text**

Under the existing `rbac` namespace in both locale files, add matching keys for:

- workspace labels and descriptions;
- account rail search, selected state, pagination, empty/no-results;
- Global, Scoped, Effective section headings and count/view-all labels;
- action inspector explanations and mobile action labels;
- detail loading/error/retry and replacement/additive wording.

Reuse existing `rbac.users.*`, `rbac.common.*`, and `common.*` keys when their meaning already matches. Do not add illustrative audit, approval, expiry, schedule, or Allow/Deny copy.

- [ ] **Step 5: Run the narrow checks**

Run:

```powershell
node --test src/features/rbac/utils/usersDisplay.test.js src/features/rbac/muiV9Compatibility.test.js
npm run lint
npm run build
```

Expected: all commands PASS. Verify the build output contains no missing `AccountInfoDialog` import.

- [ ] **Step 6: Commit the Explorer**

```powershell
git add src/features/rbac/components/AccessExplorer.jsx src/features/rbac/components/AccountInfoDialog.jsx src/features/rbac/components/index.js src/features/rbac/pages/UsersRolesPage.jsx src/i18n/locales/vi/common.json src/i18n/locales/en/common.json
git commit -m "feat(rbac): add account access explorer"
```

---

## Task 3: Convert access editing to a responsive drawer

**Files:**

- Create: `src/features/rbac/components/EditAccessDrawer.jsx`
- Delete: `src/features/rbac/components/EditAccessDialog.jsx`
- Modify: `src/features/rbac/components/index.js`
- Modify: `src/features/rbac/pages/UsersRolesPage.jsx`
- Modify: `src/i18n/locales/vi/common.json`
- Modify: `src/i18n/locales/en/common.json`

- [ ] **Step 1: Preserve the existing mutation interface while changing only presentation**

Move `EditAccessDialog` to `EditAccessDrawer` and keep the existing props, renaming only the component/export:

```jsx
export default function EditAccessDrawer({
  accountId,
  open,
  onClose,
  roles,
  permissions,
  scopes,
  onCreateScopedAssignment,
  onUpdateGlobalAccess,
  onUpdateAssignment,
  onDeleteAssignment,
  pending,
  t,
})
```

Replace the outer `Dialog` with MUI `Drawer`:

```jsx
<Drawer
  anchor="right"
  open={open}
  onClose={requestClose}
  slotProps={{ paper: { className: 'w-full sm:w-[560px] bg-surface' } }}
>
```

Keep `PermissionPicker`, `PermissionOverrideDialog`, `AssignmentAccessRow`, scope parsing, and every existing payload unchanged.

- [ ] **Step 2: Split Global and Scoped modes without duplicating state**

Add local `mode` state with `global` and `scoped` values. Global mode keeps the existing role multi-select and direct-permission picker grouped by backend module. Scoped mode keeps existing assignments, add assignment, assignment edit, permission override, and removal.

Use the current account-detail response for initial values. On successful global save, set `globalAccessDraft` back to `null`; on failure, leave it intact. Each scoped mutation continues saving independently.

- [ ] **Step 3: Add dirty-close and destructive confirmation behavior**

Treat the drawer as dirty when `globalAccessDraft !== null` or either new-assignment field has a value. Implement one close gate:

```js
const dirty =
  globalAccessDraft !== null ||
  Boolean(assignmentForm.roleId || assignmentForm.scopeAssignmentValue)

const requestClose = () => {
  if (pending) return
  if (dirty && !window.confirm(t('rbac.users.editAccessModal.discardConfirm'))) return
  onClose()
}
```

Use the same confirmation pattern before `onDeleteAssignment`. Do not add a confirmation library or custom navigation blocker.

- [ ] **Step 4: Make the footer sticky and submission-safe**

Keep a sticky footer with the mode-specific primary action. Disable duplicate submission with the existing `pending` flag. Global save must call:

```js
onUpdateGlobalAccess({ accountId, values: globalAccess }, () => setGlobalAccessDraft(null))
```

Update the page handler so the optional callback is forwarded through `runMutation`. After success, the existing invalidation refetches account detail; never patch effective permissions locally.

- [ ] **Step 5: Update translations and run checks**

Add matching vi/en keys only for drawer modes, counts, dirty confirmation, delete confirmation, additive custom permission wording, replacement wording, and backend-refetch note.

Run:

```powershell
node --test src/features/rbac/utils/rbacApi.test.js src/features/rbac/utils/usersDisplay.test.js src/features/rbac/muiV9Compatibility.test.js
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit the drawer**

```powershell
git add src/features/rbac/components/EditAccessDrawer.jsx src/features/rbac/components/EditAccessDialog.jsx src/features/rbac/components/index.js src/features/rbac/pages/UsersRolesPage.jsx src/i18n/locales/vi/common.json src/i18n/locales/en/common.json
git commit -m "feat(rbac): edit access in contextual drawer"
```

---

## Task 4: Combine roles and permissions into Roles & Policies

**Files:**

- Create: `src/features/rbac/components/RolesPoliciesWorkspace.jsx`
- Modify: `src/features/rbac/components/index.js`
- Modify: `src/features/rbac/pages/UsersRolesPage.jsx`
- Modify: `src/i18n/locales/vi/common.json`
- Modify: `src/i18n/locales/en/common.json`

- [ ] **Step 1: Create one master-detail component using existing display helpers**

Use this interface:

```jsx
export default function RolesPoliciesWorkspace({
  roles,
  rolesQuery,
  permissions,
  permissionsQuery,
  selectedRoleId,
  selectedPermissionId,
  canWrite,
  onSelectRole,
  onSelectPermission,
  onRoleSearch,
  onPermissionFiltersChange,
  onCreateRole,
  onEditRole,
  onDeleteRole,
  onCreatePermission,
  onEditPermission,
  t,
})
```

Use a local two-option mode switch (`roles`, `permissions`) rather than two top-level workspaces. In roles mode, render a searchable left list, selected role profile, permissions grouped with the existing `groupPermissionsByModule`, and contextual create/edit/delete actions. In permissions mode, render the existing module/action/search filters as a compact discovery list and selected permission detail.

Do not reimplement role or permission forms. `onCreateRole`, `onEditRole`, `onCreatePermission`, and `onEditPermission` open the existing `RoleDialog` and `PermissionDialog` owned by the page.

- [ ] **Step 2: Preserve backend usage and deletion constraints**

Use `role.userCount`, permission usage fields, `getDefaultPermissionMeta`, and backend `deletable` exactly as returned. Disable role delete when `role.deletable === false`; the permission dialog continues enforcing its own delete support. Show the returned count/reason next to the disabled action rather than inventing a rule.

- [ ] **Step 3: Replace old role and permission table render functions**

In `UsersRolesPage.jsx`, delete `renderRoles` and `renderPermissions`. Keep their current filters, queries, mutation handlers, and dialog wiring, then pass them to `RolesPoliciesWorkspace`. Default to the first valid role/permission using the same no-store selection pattern as Task 1.

- [ ] **Step 4: Add bilingual workspace text and verify**

Add matching vi/en keys for the role/permission mode switch, master-detail headings, usage counts, empty/filter states, and action inspector. Reuse all existing form/dialog keys.

Run:

```powershell
node --test src/features/rbac/utils/rolesDisplay.test.js src/features/rbac/utils/permissionsDisplay.test.js src/features/rbac/muiV9Compatibility.test.js
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit Roles & Policies**

```powershell
git add src/features/rbac/components/RolesPoliciesWorkspace.jsx src/features/rbac/components/index.js src/features/rbac/pages/UsersRolesPage.jsx src/i18n/locales/vi/common.json src/i18n/locales/en/common.json
git commit -m "feat(rbac): combine roles and policies workspace"
```

---

## Task 5: Build the Scope Matrix and scope directory

**Files:**

- Create: `src/features/rbac/components/ScopeMatrixWorkspace.jsx`
- Modify: `src/features/rbac/components/GrantScopedPermissionModal.jsx`
- Modify: `src/features/rbac/components/index.js`
- Modify: `src/features/rbac/components/shared.jsx`
- Modify: `src/features/rbac/pages/UsersRolesPage.jsx`
- Modify: `src/i18n/locales/vi/common.json`
- Modify: `src/i18n/locales/en/common.json`

- [ ] **Step 1: Create the relationship-first matrix**

Use this interface:

```jsx
export default function ScopeMatrixWorkspace({
  roles,
  scopes,
  scopesQuery,
  rules,
  rulesQuery,
  filters,
  canWrite,
  scopeMutationPending,
  onFiltersChange,
  onSelectCell,
  onCreateScope,
  onEditScope,
  onToggleScope,
  t,
})
```

Render roles as rows and active registered scopes as grouped columns inside one horizontally scrollable bounded surface. For each cell call `getScopeMatrixCell(rules, role, scope)` and display only replacement existence plus permission count. Selecting a cell opens a small inspector in the same component and calls `onSelectCell({ role, scope, rule })` for the supported edit flow.

This is a role-by-scope matrix, not a permission grid. Do not calculate inherited or effective permissions.

- [ ] **Step 2: Reuse existing scoped replacement dialogs**

In the page, map a selected matrix cell with an existing rule to the exact context already consumed by `GrantPermissionModal`:

```js
{
  section: {
    role,
    roleId: role.id,
    roleName: getOverrideRoleName(role),
  },
  group: {
    ...rule,
    scope,
  },
}
```

Map an empty cell to `GrantScopedPermissionModal` with `role` plus the clicked `scope` as `initialScope`. Both dialogs continue submitting through `useSetScopedRolePermissionsMutation` and `buildScopedRulePayload`.

Add one optional `initialScope` prop to `GrantScopedPermissionModal` and initialize `scopeType`/`scopeId` from it. Key the dialog by role and scope so switching cells resets its local state. Do not introduce a new modal.

- [ ] **Step 3: Add the scope directory below the matrix**

Reuse current scope filters and render a compact card/list directory with type, hierarchy, status text, assignment count, create/edit, and activation/deactivation. Keep `canDeactivateScope(scope)` as the client-side affordance gate and still surface backend errors from the mutation.

Open the existing `ScopeDialog` for create/edit. Disable mutation controls without `AUTH:WRITE`. Keep active/inactive meaning as text as well as color.

- [ ] **Step 4: Remove obsolete five-tab-only UI exports**

Delete `renderScopes` and `renderOverrides` from `UsersRolesPage.jsx`. Remove `TAB_KEYS`, `TABS`, and `RoleOverrideSection` from `shared.jsx` only after `rg` confirms there are no callers. Keep `GrantPermissionModal`, `GrantScopedPermissionModal`, `ScopeDialog`, shared badges, payload builders, and filters.

- [ ] **Step 5: Add translations and verify**

Add matching vi/en keys for matrix legends, selected-cell inspector, no replacement, replacement count, horizontal-scroll hint, and scope directory. Reuse existing scope and override modal keys.

Run:

```powershell
node --test src/features/rbac/utils/scopedOverridesDisplay.test.js src/features/rbac/utils/scopesDisplay.test.js src/features/rbac/muiV9Compatibility.test.js
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit the Scope Matrix**

```powershell
git add src/features/rbac/components/ScopeMatrixWorkspace.jsx src/features/rbac/components/GrantScopedPermissionModal.jsx src/features/rbac/components/index.js src/features/rbac/components/shared.jsx src/features/rbac/pages/UsersRolesPage.jsx src/i18n/locales/vi/common.json src/i18n/locales/en/common.json
git commit -m "feat(rbac): add scope relationship matrix"
```

---

## Task 6: Finish orchestration, responsive verification, and cleanup

**Files:**

- Modify: `src/features/rbac/pages/UsersRolesPage.jsx`
- Modify: `src/features/rbac/components/AccessExplorer.jsx`
- Modify: `src/features/rbac/components/EditAccessDrawer.jsx`
- Modify: `src/features/rbac/components/RolesPoliciesWorkspace.jsx`
- Modify: `src/features/rbac/components/ScopeMatrixWorkspace.jsx`
- Modify: `src/features/rbac/components/index.js`
- Modify: `src/i18n/locales/vi/common.json`
- Modify: `src/i18n/locales/en/common.json`

- [ ] **Step 1: Reduce the page to coordination**

The final `UsersRolesPage` should own only:

- three workspace selection;
- server queries and supported filters;
- URL account selection;
- mutation instances, `runMutation`, and snackbars;
- dialog/drawer state and existing form dialogs;
- prop wiring for the three workspace components.

Delete old table imports, old render functions, duplicate account-detail querying, unused counts, and dead dialog types. Keep `getRbacCapabilities(currentUser)` and its `canWrite` gate unchanged.

- [ ] **Step 2: Verify stale-account isolation and error states in code**

Confirm `AccessExplorer` calls `useAccountQuery(selectedAccountId)` directly, keys the detail by account ID through the existing hook, and never stores a previous detail response. Confirm:

- list loading does not erase the rail frame;
- detail loading does not clear selected rail identity;
- list empty and filter no-results use different copy;
- detail failure exposes backend message and retry;
- mutation failure leaves drawer form state intact;
- successful mutation refetches through existing query invalidation.

- [ ] **Step 3: Run the complete focused RBAC suite**

Run:

```powershell
node --test src/features/rbac/**/*.test.js
```

If PowerShell does not expand `**`, run:

```powershell
$tests = rg --files src/features/rbac -g "*.test.js"
node --test $tests
```

Expected: all RBAC tests PASS.

- [ ] **Step 4: Run repository verification**

Run:

```powershell
npm run lint
npm run build
```

Expected: PASS. Then run the full Node suite for regression evidence:

```powershell
$tests = rg --files src -g "*.test.js"
node --test $tests
```

Expected: RBAC tests remain green. If the known unrelated HR/QC/sidebar/i18n baseline failures remain, record their exact names and do not expand this change to fix them.

- [ ] **Step 5: Browser-check the approved workflows**

Start the existing FE and BE development commands in their repositories, then use the authenticated admin account already approved for local verification.

At desktop width, verify:

1. Access Explorer defaults open and account selection updates `accountId` without losing filters.
2. Global, scoped, and effective data match the account-detail response.
3. Global save and scoped add/edit/remove refetch the selected account.
4. Roles & Policies supports role/permission create, edit, and permitted delete actions.
5. Scope Matrix edits replacements and preserves scope deactivation constraints.

At mobile width, verify:

1. No horizontal page overflow.
2. Account selector replaces the permanent rail.
3. Overview/Global/Scoped/Effective stack cleanly.
4. Edit access fills the screen and the sticky action remains reachable.

Repeat with an `AUTH:READ` user lacking `AUTH:WRITE`: every reading surface remains usable and every mutation entry point is absent or disabled.

- [ ] **Step 6: Review against excluded scope**

Run:

```powershell
rg -n "audit|expiry|expires|approval|allow|deny|schedule|effective.*reduce|effective.*map" src/features/rbac
```

Inspect every match. Remove unsupported metadata or client-side effective-access derivation; keep only legitimate translations/explanations of backend-returned values.

- [ ] **Step 7: Commit final integration cleanup**

```powershell
git add src/features/rbac src/i18n/locales/vi/common.json src/i18n/locales/en/common.json
git commit -m "refactor(rbac): finish task-oriented access workbench"
```

---

## Final Acceptance Checklist

- [ ] Existing route and backend contracts are unchanged.
- [ ] Access Explorer, Roles & Policies, and Scope Matrix replace the five CRUD tabs.
- [ ] Effective access is displayed only from account-detail data after refetch.
- [ ] `AUTH:READ` remains sufficient to explore; every mutation requires `AUTH:WRITE`.
- [ ] Global and scoped edits remain distinct and use existing payload builders.
- [ ] Backend mutation errors and blocked-deletion reasons remain visible.
- [ ] Desktop and mobile workflows match the approved design direction.
- [ ] No new dependency, endpoint, store, speculative field, or dead legacy UI remains.
- [ ] Focused RBAC tests, lint, and build pass; unrelated full-suite baseline failures are reported separately.
