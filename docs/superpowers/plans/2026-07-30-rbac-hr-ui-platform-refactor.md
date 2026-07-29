# RBAC and HR UI Platform Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current mixed UI treatment for the desktop App Shell, RBAC, and HR People workflows with the approved Stitch enterprise-compact system while preserving every existing route, permission check, query, mutation, URL parameter, and backend payload.

**Architecture:** Keep feature ownership intact. The existing MUI theme and Tailwind semantic classes become the single visual-token layer; `MainLayout` and the existing operations components become the reusable visual foundation; RBAC and HR compose those primitives without moving API calls or business logic out of their feature modules. Change shared components compatibly, then validate every impacted caller before migrating the two reference modules.

**Tech Stack:** React 19, Vite, MUI 9, Tailwind CSS 4, TanStack Query, Zustand, React Router, react-i18next, Vitest, Testing Library.

## Guardrails

- Desktop is the only design target. Do not add a mobile layout or breakpoint-specific workflow.
- Treat `C:\Users\stack\Task\lng-web-be\docs` and the existing feature `api`, hooks, and mappers as contract truth. Do not alter endpoint paths, query-key semantics, request bodies, or permission decisions for visual work.
- Use existing MUI, Tailwind, common, form, and operations components. Do not add dependencies or introduce a one-off design-system package.
- All visible text must use existing i18n conventions and land in both `src/i18n/locales/en/common.json` and `src/i18n/locales/vi/common.json`.
- Preserve the user’s existing uncommitted changes; keep commits scoped by checkpoint.
- Do not execute create, update, lifecycle, or delete requests against shared runtime data during manual verification. Open dialogs and inspect their payload wiring only.

## Reference Screens

- `LNG UI Foundation - Enterprise Compact`
- `Staff Access Explorer (Contract Final)`
- `Roles Workspace (Approved)` and `Permissions Workspace (Contract Final)`
- `Scope Registry (Contract Final)`
- `HR People Directory (Contract Final)`
- `CRUD Modal Spec - HR CREATE STAFF (Approved Exact)`
- `CRUD Modal Spec - HR UPDATE / LIFECYCLE (Approved Exact)`
- `Change Initial Password (Contract Final)` and `Complete Personal Profile (Contract Final)`

---

### Task 1: Capture compatibility baselines before shared-component changes

**Files:**

- Create: `src/components/operations/operationsComposition.contract.test.jsx`
- Modify: `src/layouts/mainLayoutComposition.test.jsx`
- Modify: `src/theme/themeComposition.test.jsx`

- [ ] **Step 1: Add failing composition assertions for the shared visual contract.**

  Cover the invariants that must survive the refactor: `MainLayout` renders header, permission-filtered sidebar, and outlet; `OperationsPageShell` preserves its sticky toolbar/content structure; operations tabs keep an accessible selected state; table pagination remains keyboard reachable; the light and dark themes expose the same semantic token keys.

- [ ] **Step 2: Run the focused baseline tests and confirm the expected failures.**

  Run: `node --test src/components/operations/operationsComposition.contract.test.js src/layouts/mainLayoutComposition.test.js src/theme/themeComposition.test.js`

  Expected: new contract expectations fail before the foundation implementation is updated; pre-existing tests remain readable and unchanged.

- [ ] **Step 3: Keep the assertions implementation-agnostic.**

  Assert visible roles, labels, ARIA state, semantic classes/token values, and composition boundaries; do not snapshot generated MUI class names or hard-code pixel offsets.

- [ ] **Step 4: Rerun the focused suite after only test setup work.**

  Run: `node --test src/components/operations/operationsComposition.contract.test.js src/layouts/mainLayoutComposition.test.js src/theme/themeComposition.test.js`

- [ ] **Step 5: Commit the baseline.**

  ```bash
  git add src/components/operations/operationsComposition.contract.test.jsx src/layouts/mainLayoutComposition.test.jsx src/theme/themeComposition.test.jsx
  git commit -m "test: cover shared operations UI contract"
  ```

### Task 2: Establish one semantic UI foundation for MUI and Tailwind

**Files:**

- Modify: `src/theme/palette.js`
- Modify: `src/theme/typography.js`
- Modify: `src/theme/index.js`
- Modify: `src/index.css`
- Modify: `src/theme/themeComposition.test.jsx`

- [ ] **Step 1: Define only the approved semantic tokens in both modes.**

  Align `background.default`, `background.paper`, `text.primary`, `text.secondary`, `divider`, `primary`, action states, success/warning/error, and focused/selected states with the Foundation board. Keep the current public MUI palette names intact so existing screens continue to resolve their colors.

- [ ] **Step 2: Align typography and density globally.**

  Make the existing Inter/Manrope hierarchy compact and deliberate: stable page title, section title, body, caption, button, input, tab, and table typography. Set shared MUI defaults for compact controls, borders, focus rings, tooltips, chips, and dialog actions instead of styling each feature separately.

- [ ] **Step 3: Map Tailwind semantic utilities to the same concepts.**

  Update only the existing semantic CSS variables/classes such as `page`, `surface`, `border`, `ink`, `ink-muted`, `primary`, and status colors. Do not add one-off hex values for RBAC or HR.

- [ ] **Step 4: Make the baseline tests pass.**

  Run: `node --test src/theme/themeComposition.test.js src/components/operations/operationsComposition.contract.test.js`

  Expected: light/dark token parity and semantic class expectations pass.

- [ ] **Step 5: Commit the foundation.**

  ```bash
  git add src/theme/palette.js src/theme/typography.js src/theme/index.js src/index.css src/theme/themeComposition.test.jsx
  git commit -m "feat: unify enterprise UI foundation tokens"
  ```

### Task 3: Refactor the desktop application shell without changing navigation behavior

**Files:**

- Modify: `src/layouts/MainLayout.jsx`
- Modify: `src/layouts/AppHeader.jsx`
- Modify: `src/layouts/AppSidebar.jsx`
- Modify: `src/layouts/sidebarNavigation.js`
- Modify: `src/layouts/mainLayoutComposition.test.jsx`

- [ ] **Step 1: Add failing tests for the approved shell hierarchy.**

  Cover the compact product header, stable left navigation rail, HR/Portal context switcher, visible current-user context, and an accessible active navigation item. Assert navigation still comes from `filterNavigationByUser` and does not leak unauthorized items.

- [ ] **Step 2: Implement the shell with existing layout responsibilities.**

  Keep `MainLayout` responsible for desktop sizing and the outlet, `AppHeader` for global controls, and `AppSidebar` for navigation. Use the new semantic tokens and approved spacing; do not move routing decisions, change `SIDEBAR_WIDTH` behavior, or introduce a second navigation data structure.

- [ ] **Step 3: Preserve keyboard and theme behavior.**

  Ensure the context switcher uses button semantics and `aria-pressed`, expandable groups retain `aria-expanded`, focus remains visible, and all labels still translate in both modes.

- [ ] **Step 4: Run targeted checks.**

  Run: `node --test src/layouts/mainLayoutComposition.test.js src/layouts/sidebarNavigation.test.js`

  Expected: shell composition and permission-filtering tests pass.

- [ ] **Step 5: Commit the shell.**

  ```bash
  git add src/layouts/MainLayout.jsx src/layouts/AppHeader.jsx src/layouts/AppSidebar.jsx src/layouts/sidebarNavigation.js src/layouts/mainLayoutComposition.test.jsx
  git commit -m "feat: refactor desktop application shell"
  ```

### Task 4: Upgrade existing operations primitives compatibly

**Files:**

- Modify: `src/components/operations/OperationsPageShell.jsx`
- Modify: `src/components/operations/OperationsHeader.jsx`
- Modify: `src/components/operations/OperationsToolbar.jsx`
- Modify: `src/components/operations/OperationsTabs.jsx`
- Modify: `src/components/operations/OperationsTable.jsx`
- Modify: `src/components/operations/OperationsPagination.jsx`
- Modify: `src/components/operations/StatusBadge.jsx`
- Modify: `src/components/operations/IconActionButton.jsx`
- Modify: `src/components/operations/operationsLayout.js`
- Modify: `src/components/operations/operationsComposition.contract.test.jsx`

- [ ] **Step 1: List and preserve each public prop used by current callers.**

  Before changing markup, inspect all callers of `OperationsPageShell`, `OperationsTabs`, and `OperationsTable`. Keep the current props and default behaviors; any added prop must be optional and have a semantic default.

- [ ] **Step 2: Implement the Foundation board’s dense visual rules in the shared primitives.**

  Use the existing components to standardize title/description/action alignment, toolbar filter grouping, selected tabs, compact searchable rows, header hierarchy, status badges, icon-button tooltips, empty/error/retry blocks, and pagination. Retain existing table keyboard navigation and sticky-layout behavior.

- [ ] **Step 3: Test both shared behavior and a representative existing caller.**

  Extend the operations contract test, then select one non-RBAC/non-HR caller already covered by tests to prove the compatible API still renders.

- [ ] **Step 4: Run targeted checks.**

  Run: `node --test src/components/operations/operationsComposition.contract.test.js src/features/design-tasks/**/*.test.js`

  Expected: shared component assertions and the selected existing caller tests pass without changing feature data contracts.

- [ ] **Step 5: Commit the primitives.**

  ```bash
  git add src/components/operations
  git commit -m "feat: standardize operations workspace primitives"
  ```

### Task 5: Normalize the existing dialog and form language

**Files:**

- Modify: `src/components/common/ConfirmDialog.jsx`
- Modify: `src/components/common/AnimatedDialog.jsx`
- Modify: `src/components/form/FormTextField.jsx`
- Modify: `src/components/form/DatePicker.jsx`
- Modify: `src/components/form/DateRangePicker.jsx`
- Create: `src/components/common/dialogComposition.test.jsx`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`

- [ ] **Step 1: Add failing dialog/form contract tests.**

  Cover labelled title and description, close affordance, autofocus target, required-field visibility, error description linkage, loading submit state, destructive confirmation hierarchy, Escape/overlay close behavior where allowed, and dialog focus restoration.

- [ ] **Step 2: Reuse the existing common and form components to enforce the contract.**

  Add compact spacing, semantic action ordering, helper/error treatment, and MUI 9 `slotProps` only at the shared layer. Keep feature-specific validation schemas and payload creation in their features.

- [ ] **Step 3: Localize shared fallback labels.**

  Add only labels actually rendered by the common components (for example cancel, close, confirm, retry, and irreversible-action help) in both locale files. Do not replace already-correct feature copy.

- [ ] **Step 4: Run targeted checks.**

  Run: `node --test src/components/common/dialogComposition.test.js src/components/common/*.test.js`

  Expected: accessibility and action-state tests pass.

- [ ] **Step 5: Commit dialog/form normalization.**

  ```bash
  git add src/components/common src/components/form src/i18n/locales/en/common.json src/i18n/locales/vi/common.json
  git commit -m "feat: standardize operational dialogs and forms"
  ```

### Task 6: Deliver the RBAC Access Explorer and account actions

**Files:**

- Modify: `src/features/rbac/pages/UsersRolesPage.jsx`
- Modify: `src/features/rbac/components/AccessExplorer.jsx`
- Modify: `src/features/rbac/components/AccountFormDialog.jsx`
- Modify: `src/features/rbac/components/EditAccessDialog.jsx`
- Modify: `src/features/rbac/components/AccountAccessDialog.jsx`
- Create: `src/features/rbac/components/AccessExplorer.test.jsx`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`

- [ ] **Step 1: Map each view state to the existing data contract.**

  Trace the current account query, search/filter URL state, pagination, `canWrite` gate, account create/update mutations, role assignment mutation, and invalidation keys. Record the existing request body fields in the test descriptions; do not change them.

- [ ] **Step 2: Add failing RBAC interaction tests.**

  Cover search/filter/pagination passthrough, account selection, access summary, create/edit dialog opening, write-action visibility under backend permissions, loading/error/empty states, and the confirm-before-destructive path.

- [ ] **Step 3: Compose the approved three-pane explorer from shared primitives.**

  Keep the current query and mutation owners in `UsersRolesPage`. Make the left account list, central access detail, and right activity/context panel visually match the approved desktop board; use progressive disclosure instead of adding a second account detail route.

- [ ] **Step 4: Make account CRUD dialogs contract-visible.**

  In `AccountFormDialog`, retain the existing body builder and validation, show the fields that body requires, surface backend errors beside the action, and prevent browser autofill from silently supplying credentials. In `EditAccessDialog`, expose the roles/scopes already supported by the mutation without inventing a local permission model.

- [ ] **Step 5: Run focused RBAC tests.**

  Run: `node --test src/features/rbac/**/*.test.js`

  Expected: explorer behavior, dialog payload wiring, and permission gates pass.

- [ ] **Step 6: Commit the Access Explorer.**

  ```bash
  git add src/features/rbac/pages/UsersRolesPage.jsx src/features/rbac/components src/i18n/locales/en/common.json src/i18n/locales/vi/common.json
  git commit -m "feat: refactor RBAC access explorer"
  ```

### Task 7: Deliver the RBAC roles, permissions, and scope workspaces

**Files:**

- Modify: `src/features/rbac/components/RolesPoliciesWorkspace.jsx`
- Modify: `src/features/rbac/components/ScopeMatrixWorkspace.jsx`
- Modify: `src/features/rbac/components/PermissionDialog.jsx`
- Modify: `src/features/rbac/components/RoleDialog.jsx`
- Modify: `src/features/rbac/components/ScopeDialog.jsx`
- Modify: `src/features/rbac/components/shared.jsx`
- Create: `src/features/rbac/components/RolesPoliciesWorkspace.test.jsx`
- Create: `src/features/rbac/components/ScopeMatrixWorkspace.test.jsx`

- [ ] **Step 1: Add failing tests for approved role/permission/scope workflows.**

  Cover roles versus permissions mode, selected-row detail, search and module/action filters, create/edit/delete action gates, delete-disabled explanation, scope matrix filtering, and each dialog’s existing submit payload.

- [ ] **Step 2: Refactor `RolesPoliciesWorkspace` as the approved master-detail board.**

  Preserve its `roles`, `permissions`, query states, callbacks, filters, and `canWrite` interface. Use the shared workspace primitives for the left registry and right detail, and retain accessible selected-row state.

- [ ] **Step 3: Refactor `ScopeMatrixWorkspace` as an auditable registry.**

  Preserve its scope filters and callbacks; make relationships, restrictions, and destructive actions scannable without replacing server-backed data with a local matrix.

- [ ] **Step 4: Bring role, permission, and scope dialogs onto the common form contract.**

  Keep existing validation/body creation and use shared dialog behavior. Ensure all labels and backend errors are localized and visible.

- [ ] **Step 5: Run focused RBAC tests.**

  Run: `node --test src/features/rbac/**/*.test.js`

  Expected: all RBAC workspaces and CRUD modal contracts pass.

- [ ] **Step 6: Commit the policy workspaces.**

  ```bash
  git add src/features/rbac/components
  git commit -m "feat: refactor RBAC policy workspaces"
  ```

### Task 8: Deliver the HR People directory, staff provisioning, and lifecycle actions

**Files:**

- Modify: `src/features/hr-time/pages/PeoplePage.jsx`
- Modify: `src/features/hr-time/components/EmployeeProfileDialog.jsx`
- Modify: `src/features/hr-time/components/EmployeeProfileDrawer.jsx`
- Modify: `src/features/hr-time/components/EmployeeLifecycleDialog.jsx`
- Modify: `src/features/hr-time/components/PeopleFilters.jsx`
- Create: `src/features/hr-time/pages/PeoplePage.test.jsx`
- Create: `src/features/hr-time/components/EmployeeProfileDialog.test.jsx`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`

- [ ] **Step 1: Trace existing people endpoint params and mutation bodies.**

  Document in tests the current list search/filter/page params, profile creation fields, account-provisioning inputs, update fields, lifecycle action body, and query invalidation. Do not infer fields from the UI board.

- [ ] **Step 2: Add failing tests for the directory states.**

  Cover server-backed search/filter/pagination, row selection, loading/empty/error/retry state, permission-gated create action, profile drawer access, and lifecycle dialog opening.

- [ ] **Step 3: Refactor `PeoplePage` into the approved dense desktop directory.**

  Use the upgraded operations shell, toolbar, table, and pagination; retain all existing params and filter controls. Make role/account state and lifecycle state visible in each row, with quick actions that preserve the existing permission gates.

- [ ] **Step 4: Refactor provisioning, update, and lifecycle dialogs.**

  `EmployeeProfileDialog` must visibly distinguish profile fields from account-provisioning fields while keeping its current submit body. `EmployeeProfileDrawer` presents read-only context and hands off to the existing edit/lifecycle actions. `EmployeeLifecycleDialog` retains its current service call and adds clear irreversible-action language and backend error feedback.

- [ ] **Step 5: Run focused HR tests.**

  Run: `node --test src/features/hr-time/pages/PeoplePage.test.js src/features/hr-time/components/EmployeeProfileDialog.test.js src/features/hr-time/**/*.test.js`

  Expected: People list params, CRUD payload wiring, lifecycle safeguards, and i18n behavior pass.

- [ ] **Step 6: Commit the HR workspace.**

  ```bash
  git add src/features/hr-time src/i18n/locales/en/common.json src/i18n/locales/vi/common.json
  git commit -m "feat: refactor HR people workspace"
  ```

### Task 9: Align first-login and personal-profile completion flows

**Files:**

- Modify: `src/features/auth/pages/ChangeInitialPasswordPage.jsx`
- Modify: `src/features/profile/pages/ProfilePage.jsx`
- Modify: `src/features/auth/pages/ChangeInitialPasswordPage.test.jsx`
- Modify: `src/features/profile/pages/ProfilePage.test.jsx`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`

- [ ] **Step 1: Verify the actual auth/profile hooks and redirect conditions.**

  Trace current password-change and profile-completion request bodies, required fields, success redirects, and any backend-provided state deciding when a user must complete a step.

- [ ] **Step 2: Add failing workflow tests.**

  Cover required values, field-level errors, pending submit state, backend error display, successful redirect, and no authenticated-route regression.

- [ ] **Step 3: Apply the approved focused-card visual treatment.**

  Reuse the common dialog/form visual rules as a standalone page treatment: short explanation, clear primary action, password visibility support where already present, and no extra account-management functionality.

- [ ] **Step 4: Run focused checks.**

  Run: `node --test src/features/auth/pages/ChangeInitialPasswordPage.test.js src/features/profile/pages/ProfilePage.test.js`

  Expected: authentication onboarding behavior remains unchanged while visual and accessibility assertions pass.

- [ ] **Step 5: Commit onboarding alignment.**

  ```bash
  git add src/features/auth/pages/ChangeInitialPasswordPage.jsx src/features/profile/pages/ProfilePage.jsx src/features/auth/pages/ChangeInitialPasswordPage.test.jsx src/features/profile/pages/ProfilePage.test.jsx src/i18n/locales/en/common.json src/i18n/locales/vi/common.json
  git commit -m "feat: align staff onboarding screens"
  ```

### Task 10: Perform contract, visual, and runtime acceptance

**Files:**

- Modify only if verification exposes a scoped defect in the files above.
- Create: `docs/superpowers/verification/2026-07-30-rbac-hr-ui-platform-refactor.md`

- [ ] **Step 1: Run all narrow tests changed by this plan.**

  Run: `node --test src/theme/*.test.js src/layouts/*.test.js src/components/operations/*.test.js src/components/common/*.test.js src/features/rbac/**/*.test.js src/features/hr-time/**/*.test.js src/features/auth/**/*.test.js src/features/profile/**/*.test.js`

  Expected: all targeted suites pass. If an unrelated global HR coverage failure remains, report it separately with the exact failing file/endpoint and do not mask it as a refactor failure.

- [ ] **Step 2: Run repository verification.**

  Run: `npm run lint && npm run build`

  Expected: both commands exit 0.

- [ ] **Step 3: Run a non-mutating browser acceptance pass against the local backend.**

  Log in as the provided administrator, then inspect `/portal/settings/users-roles` and `/hr/employees` in light and dark mode. Verify navigation permissions, list data provenance, search/filter/pagination requests, tab switches, detail selection, create/update/delete/lifecycle dialogs, close/cancel paths, and error/loading/empty states without submitting a mutation.

- [ ] **Step 4: Record the evidence and remaining known issues.**

  Write only commands, routes, outcomes, screenshots/observations, and any pre-existing failures to the verification note. Do not claim Stitch pixel parity; state that visual comparison was made against the named approved boards.

- [ ] **Step 5: Inspect the final diff and commit verification evidence.**

  ```bash
  git diff --check
  git status --short
  git add docs/superpowers/verification/2026-07-30-rbac-hr-ui-platform-refactor.md
  git commit -m "docs: verify RBAC and HR UI refactor"
  ```

## Final Acceptance Checklist

- [ ] Light and dark themes use the same semantic token system and no RBAC/HR-only color constants remain.
- [ ] Existing App Shell, operations components, and non-reference callers retain their public behavior.
- [ ] RBAC Access, Roles, Permissions, and Scope CRUD surfaces visibly match their server-supported bodies, params, and permission gates.
- [ ] HR People listing, staff provisioning, profile edit, lifecycle actions, initial password change, and personal profile completion visibly match their server-supported flows.
- [ ] All included visible copy is localized in Vietnamese and English.
- [ ] Targeted tests, `npm run lint`, and `npm run build` pass.
- [ ] Local browser acceptance uses real server data without altering it.
