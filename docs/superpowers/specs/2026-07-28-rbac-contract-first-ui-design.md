# RBAC Contract-First UI Design

Date: 2026-07-28
Status: Approved direction, pending written-spec review
Scope: Existing `/portal/admin/users-roles` page only

## Context

The RBAC page already exposes five backend domains: users, roles, permissions,
scopes, and scoped permission overrides. The redesign must make the real access
model understandable and operable without changing routes, inventing fields, or
hardcoding role names.

The chosen approach is a contract-first administration workbench. It keeps the
existing single route and five-tab structure, then improves hierarchy, action
gating, data density, and access editing around the backend responses that were
verified through authenticated HTTP calls.

## Goals

- Show global access, scoped assignments, and effective access as distinct
  concepts.
- Make every mutation discoverable to authorized administrators and unavailable
  to read-only administrators.
- Use backend usage and constraint fields to prevent misleading actions.
- Preserve the current MUI, Tailwind, TanStack Query, shared API client, endpoint
  constants, and feature structure.
- Keep the screen dense and operational on desktop while remaining usable at
  narrower widths.

## Non-Goals

- No new RBAC route or separate dashboard.
- No frontend dependency additions.
- No backend schema, permission-resolution, or authorization changes.
- No fake permission status lifecycle. The current permission DTO always returns
  `status: active`.
- No frontend pagination facade for departments or teams. Their current HTTP
  responses contain `data.items` only because backend pagination metadata is
  dropped. Select controls will use the returned items until the backend contract
  is corrected.
- No role-name-based authorization. `SUPER_ADMIN` remains a backend grant
  constraint, not a frontend substitute for permission checks.

## Verified Backend Contract

All admin RBAC reads require global `AUTH:READ`. All RBAC mutations require
global `AUTH:WRITE`. Successful responses use:

```json
{
  "success": true,
  "data": {}
}
```

Errors use:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "requestId": "request-id",
    "details": {}
  }
}
```

Authenticated HTTP verification returned these current list shapes:

| Resource              | `data` shape                      | Current total | Important item fields                                                                   |
| --------------------- | --------------------------------- | ------------: | --------------------------------------------------------------------------------------- |
| Accounts              | `items`, `total`, `page`, `limit` |            52 | `access`, `roles`, `roleAssignments`, `department`, `team`, `memberType`, `lastLoginAt` |
| Roles                 | `items`, `total`, `page`, `limit` |             5 | `permissions`, `permissionCount`, `userCount`, `deletable`                              |
| Permissions           | `items`, `total`, `page`, `limit` |            58 | `module`, `action`, usage counts, `deletable`                                           |
| Scopes                | `items`, `total`, `page`, `limit` |            14 | resource identity, hierarchy, `status`, `assignmentCount`                               |
| Access assignments    | `items`, `total`, `page`, `limit` |            46 | role, scope, custom permissions, override permissions, `isPermissionOverridden`         |
| Scoped role overrides | `items`, `total`, `page`, `limit` |             0 | role and scope replacement permission set                                               |
| Departments           | `items`                           |   unavailable | `id`, `name`, `code`, `status`                                                          |
| Teams                 | `items`                           |   unavailable | `id`, `name`, `code`, `departmentId`, `status`                                          |

Login returns `accessToken`, `refreshToken`, `account`, `roles`, `permissions`,
and `scopes`. The UI will continue to obtain authorization from the established
auth store rather than retaining or displaying login credentials.

## Authorization Rules

The page route remains protected by `AUTH:READ`.

The page derives one `canWriteAuth` value from backend-provided permissions. It
controls all create, edit, delete, activate, deactivate, assignment, override,
password-reset, and session-revocation actions.

For users without `AUTH:WRITE`:

- Lists, filters, counts, and detail views remain available.
- Mutation buttons and row-menu entries are hidden when their absence is clear.
- Controls that explain a blocked state remain visible but disabled with a short
  reason.
- Dialogs never rely on disabled submit buttons as their only authorization
  boundary. Mutation entry points also check `canWriteAuth`.

Backend authorization remains authoritative for actor-sensitive rules such as
granting protected roles. Backend error codes and messages must be preserved in
the shared API error mapping and shown in the relevant dialog or toast.

## Information Architecture

The existing page header becomes a compact workbench header with:

- Title and one-sentence explanation.
- The active tab's primary action on the right when `canWriteAuth` is true.
- Small summary counts sourced from the active query, not separate aggregate
  requests.

The five tabs remain:

1. Users
2. Roles
3. Permissions
4. Scopes
5. Overrides

Tab labels include backend totals when available. Search and filters live below
the tabs and above each table. Existing server pagination remains the source of
truth.

## Users Tab

### Table

The user table prioritizes identity and effective placement:

- User: email plus status.
- Organization: department and team.
- Global access: global role chips from `access.roles` or the list DTO's global
  access representation.
- Scoped access: assignment count with concise scope and role preview.
- Last login.
- Actions.

Filters use only supported request parameters: search, status, role, department,
team, member type, and archived state where currently supported by the query.

### Account Detail

The existing information dialog becomes a read-only access summary:

- Identity and account status.
- Department, team, member type, creation date, and last login.
- Global roles and direct global permissions.
- Scoped assignments grouped by scope, showing role, additive custom
  permissions, and replacement overrides.
- Effective permissions when supplied by the account-detail response.
- Session actions only when supported by existing mutations and `canWriteAuth`.

The fake password visibility row and unsupported `createdBy` field are removed.

### Edit Access

One dialog contains two explicit sections:

1. Global Access: global roles and direct global permissions, saved through the
   existing account-access endpoint.
2. Scoped Assignments: a list of assignments with add, edit, and remove actions.

An assignment editor uses backend IDs for account, role, scope, and permission
sets. It labels custom permissions as additive and override permissions as a
replacement set. Empty replacement permissions are not presented as equivalent
to inherited role permissions.

## Roles Tab

- Columns: name/code, description, permission count, user count, and actions.
- Role creation and editing use the same permission-selection control.
- Permissions are grouped by backend `module` with search and select-all within
  the visible module.
- Delete is disabled when `deletable` is false, with user count explaining why.
- The client does not infer deletability from names or local usage.

## Permissions Tab

- Columns: code/name, module, action, usage breakdown, and actions.
- Filters: search, module, and action only.
- The dead status/deprecated filter is removed.
- Usage shows role, scoped role, direct assignment, and total counts from the DTO.
- Delete is disabled when `deletable` is false.

## Scopes Tab

- Columns: scope identity, resource hierarchy, status, assignment count, and
  actions.
- The resource and parent department fields describe where the scope points.
- Deactivation is disabled when `assignmentCount` makes the operation invalid.
- A backend conflict remains visible as a contextual error in case data changes
  between render and submit.

## Overrides Tab

This tab explains that an override replaces a role's permission set for one
scope. It does not describe the set as additive.

- Columns: role, scope, replacement permission count/preview, updated time, and
  actions.
- Create/edit selects one role, one scope, and the replacement permissions.
- The empty state explains that roles currently inherit their normal permission
  set in every scope.

## Component and Data Strategy

Reuse existing RBAC page, dialogs, query hooks, mutation hooks, shared table
components, and permission selector. Add only small local presentation helpers
when repeated markup already exists in more than one RBAC view.

Queries remain server-driven. Filter state maps directly to supported backend
query parameters. Mutations invalidate the narrowest existing query keys for the
affected resource and account detail.

The shared API error adapter must prefer `response.data.error.code` and
`response.data.error.message`, falling back to Axios values only when the backend
envelope is absent. This is required for constraint-aware UI messages.

## States and Feedback

- Loading: preserve table structure with the existing loading treatment.
- Empty: distinguish no records from no filter matches.
- Error: show backend message with retry; never replace a specific conflict with
  a generic failure message.
- Mutation pending: disable only the affected submit/action and prevent duplicate
  submission.
- Mutation success: close the dialog after success and refresh affected queries.
- Stale conflict: keep entered values when the backend rejects a mutation so the
  administrator can correct it.

## Responsive and Accessibility

- Desktop keeps the dense table layout.
- Narrow screens allow horizontal table scrolling and stack dialog sections.
- Every icon-only action has an accessible label and tooltip.
- Dialog focus is trapped by MUI, destructive actions require confirmation, and
  keyboard submission follows native form behavior.
- Color is not the only carrier for status or permission meaning.

## Verification

- Unit coverage for permission-based action visibility and backend error-code
  extraction.
- RBAC utility tests continue to pass.
- Manual checks with an `AUTH:READ`-only account and an `AUTH:WRITE` account.
- Manual create/edit checks for a role with permissions, global account access,
  scoped assignment, and replacement override.
- Confirm scope deactivation and deletion constraints display backend-derived
  reasons.
- Run `npm run lint` and `npm run build`.

## Success Criteria

- A read-only administrator cannot enter any mutation flow.
- A write administrator can manage both global and scoped access from the Users
  tab without guessing which model is being edited.
- Role creation can assign permissions immediately.
- Every table and dialog uses fields present in verified backend responses.
- Usage counts and backend constraints determine destructive-action availability.
- No new dependencies, routes, or speculative API calls are introduced.
