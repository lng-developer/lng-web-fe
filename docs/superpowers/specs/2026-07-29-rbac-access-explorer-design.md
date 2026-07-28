# RBAC Access Explorer Design

Date: 2026-07-29
Status: Approved visual direction, pending written-spec review
Route: `/portal/settings/users-roles`

## Objective

Replace the backend-shaped five-table RBAC workbench with a task-oriented Access
Explorer. The primary experience answers one question quickly: what access does
this account have, where does it come from, and what can an authorized
administrator change?

The redesign preserves the verified backend contracts, permission gates, query
hooks, mutation hooks, MUI/Tailwind stack, and existing route. It does not add a
new authorization model or infer access that the backend has not returned.

## Approved Direction

The page has three product-level workspaces:

1. **Access Explorer** — account selection, access explanation, and account-level
   actions.
2. **Roles & Policies** — role and permission configuration.
3. **Scope Matrix** — scope relationships, assignments, and scoped role
   replacement rules.

Access Explorer is the default. The labels describe administrator tasks rather
than backend modules. The existing Users, Roles, Permissions, Scopes, and
Overrides concepts remain in the data layer but no longer define the primary
navigation.

## Contract Boundaries

- Reads require backend-provided `AUTH:READ`.
- Mutations require backend-provided `AUTH:WRITE`.
- Role names never substitute for permission checks.
- Global access consists of global role IDs and direct global permission IDs.
- Scoped assignments contain a role, scope identity, additive custom
  permissions, and optional replacement permissions.
- A scoped role override replaces the role's permission set in one scope; it is
  not additive.
- Effective access is rendered only from the account-detail response. The client
  does not simulate or predict the final effective permission set.
- After any access mutation, the account detail is refetched and the refreshed
  backend response becomes the displayed source of truth.
- Audit metadata, access expiry, approval workflow, Allow/Deny rules, and access
  scheduling are excluded because the verified contract does not provide them.

The approved mockups are visual references. Any illustrative copy or metadata
that is absent from the API must not be implemented.

## Desktop Access Explorer

The desktop workspace uses three connected columns inside one bounded surface.
It must read as one investigation flow, not three unrelated cards.

### Account Rail

The left column is approximately 280 pixels wide and contains:

- Account search.
- Supported status and organization filters.
- A paginated vertical account list.
- Identity, email, status, primary global role, and concise organization context.
- A clear selected state.

Selecting an account changes only the profile and action columns. Search and
pagination remain intact. The first returned account may be selected on initial
load, but a saved or URL-provided valid account ID takes precedence.

### Access Profile

The center column is the primary reading surface. It contains:

1. Identity header: account status, department, team, and member type when
   supplied.
2. Global access: global roles and direct global permissions.
3. Scoped access: assignment cards showing scope, resource, role, additive
   custom permissions, and replacement state.
4. Effective access: backend-returned effective roles and permissions, grouped
   by permission module for scanning.

The visual sequence `Global + Scoped → Effective` explains provenance without
claiming that the browser calculated the result. Long permission sets are
collapsed behind counts and an explicit “view all” action.

### Action Inspector

The right column is approximately 280 pixels wide and stays visible while the
profile scrolls. It contains only actions supported by the current account and
the viewer's permissions:

- Edit access.
- Reset password.
- Revoke sessions.

It also provides short contract-backed explanations of global, scoped, and
replacement semantics. Unsupported audit details are not displayed. Backend
constraint messages remain visible near the action that produced them.

## Edit Access Drawer

“Edit access” opens a right-side drawer of approximately 560 pixels rather than
a centered modal. The selected account remains visible in the dimmed Explorer,
preserving context.

The drawer contains two explicit modes.

### Global Mode

- Searchable global role selection.
- Direct global permissions grouped by backend `module`.
- Permission names and `MODULE:ACTION` codes.
- Summary counts for selected roles and direct permissions.
- One `Save global access` action using the existing account-access mutation.

The summary does not predict effective access. It states that effective access
will be reloaded from the backend after saving.

### Scoped Mode

- Existing scoped assignments rendered as compact editable cards.
- Add assignment flow with role and scope selection.
- Edit role/scope and custom or replacement permissions for one assignment.
- Remove assignment with confirmation.
- Clear labels distinguishing additive custom permissions from replacement
  permissions.

Each scoped mutation saves independently. A failed mutation keeps the relevant
form values so the administrator can correct them.

The drawer has a sticky footer and prevents duplicate submission. Closing with
unsaved changes requires confirmation; closing a clean drawer does not.

## Roles & Policies Workspace

This workspace combines roles and permissions without placing two large tables
on screen.

- A searchable role list is on the left.
- The selected role profile is in the center with description, usage count, and
  assigned permissions grouped by module.
- A contextual action area provides create, edit, and delete actions.
- Permission discovery is available as a secondary mode within the same
  workspace, with usage breakdown and deletability from the API.

Role creation and editing reuse the same permission picker. Delete remains
disabled when backend `deletable` is false, with the usage count explaining why.

## Scope Matrix Workspace

The Scope Matrix emphasizes relationships rather than a flat scope list.

- Rows represent backend roles.
- Columns represent active registered scopes, grouped by scope type when useful.
- A cell summarizes whether a scoped role replacement exists and its permission
  count.
- Selecting a cell opens an inspector with the role, scope, replacement set, and
  supported edit action.
- A separate scope directory exposes resource hierarchy, status, assignment
  count, create/edit, and safe deactivation.

The current role and scope counts fit in a filtered, horizontally scrollable
matrix; it does not render a permission-by-role grid. Deactivation remains
disabled when `assignmentCount > 0`.

## Mobile Behavior

Mobile uses progressive disclosure rather than compressing the three desktop
columns.

- The global app sidebar collapses behind the existing menu button.
- Account selection becomes a full-width selector that opens a searchable list.
- The selected account context remains above the profile.
- Profile navigation uses `Overview`, `Global`, `Scoped`, and `Effective`
  sections.
- Access sections stack vertically.
- The primary “Edit access” action stays in a bottom action bar; reset password
  and revoke sessions move into its overflow menu.
- Editing opens a full-screen drawer. Global and scoped modes remain separate.

There is no squeezed desktop table, permanent account rail, or horizontal page
scroll on mobile.

## Data Flow

1. Load the paginated account list with supported filters.
2. Select an account ID.
3. Load account detail using the existing account-detail query.
4. Normalize only presentation concerns; retain backend IDs and permission
   codes for mutations.
5. Submit through the existing focused mutation.
6. Invalidate the affected list/detail keys.
7. Render the refreshed backend response.

Changing account selection cancels or ignores stale detail results through the
existing TanStack Query key. The UI must not merge data from a previously
selected account into the current profile.

## States and Feedback

- Initial list loading keeps the account rail skeleton visible.
- Detail loading keeps selected identity context and replaces only the profile.
- List empty and filter no-results are distinct.
- Detail errors show the backend message with retry without clearing the account
  list.
- Mutation errors preserve backend error code/message and entered values.
- Read-only administrators can explore all supported details but never enter a
  mutation drawer.
- Destructive or blocked actions show backend-derived reasons.

## Component Boundaries

Keep the implementation local to the RBAC feature and reuse existing hooks and
controls. Suggested responsibilities:

- `AccessExplorer`: selection and three-column orchestration.
- `AccountRail`: filters, pagination, and account selection.
- `AccessProfile`: global, scoped, and effective read model.
- `AccessActionInspector`: permission-aware account actions.
- `EditAccessDrawer`: global/scoped editing orchestration.
- `RolesPoliciesWorkspace`: selected-role and permission management.
- `ScopeMatrixWorkspace`: role/scope relationships and scope directory.

These are UI boundaries, not new data abstractions. Existing payload builders,
queries, mutations, permission grouping, and access-normalization utilities are
reused rather than duplicated.

## Accessibility

- Account list and workspace navigation are keyboard operable.
- Selection is conveyed by more than color.
- Every icon-only action has an accessible name and tooltip.
- Drawers trap focus, restore focus to their trigger, and support Escape when no
  pending or unsaved operation blocks closing.
- Status and replacement meaning always include text.
- Desktop and mobile layouts preserve minimum 44-pixel touch targets where
  applicable.

## Verification

- Unit tests for selected-account state, access grouping, permission gating, and
  mutation payload reuse.
- Source-level MUI v9 compatibility check remains green.
- Browser verification with authenticated `AUTH:WRITE` access for desktop and
  mobile breakpoints.
- Read-only verification with `AUTH:READ` and no `AUTH:WRITE`.
- Verify global save, scoped add/edit/remove, backend refetch, preserved error
  messages, and stale-account isolation.
- Run the focused RBAC tests, `npm run lint`, and `npm run build`.

## Delivery Scope

The implementation remains on the existing route and current branch. It adds no
dependency, backend endpoint, or speculative field. The first delivery includes
all three workspaces because the approved navigation replaces the current five
tabs; the Access Explorer receives the deepest interaction work, while Roles &
Policies and Scope Matrix reuse existing mutations and detail controls.

## Success Criteria

- An administrator can understand one account's global, scoped, and effective
  access without opening multiple tables or dialogs.
- Global and scoped mutations are visually and contractually distinct.
- Effective access always comes from the backend after refetch.
- The primary experience is usable at desktop and mobile widths without a CRUD
  table.
- Roles, permissions, scopes, and scoped replacements remain fully manageable.
- Read-only and backend constraint behavior remains unchanged.
