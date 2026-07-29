# RBAC and HR UI Platform Refactor Design

**Date:** 2026-07-30

**Status:** Approved design

## Objective

Refactor the desktop App Shell, RBAC, and HR experiences into one coherent enterprise operations UI based on the approved Stitch project `356688402026366041`. RBAC and HR become the reference implementation used to migrate the remaining modules later.

The refactor must preserve current routes, backend contracts, API hooks, query keys, payload builders, authentication behavior, and backend-provided permission checks.

## Scope

### Included

- Desktop App Shell shared by Portal and HR.
- Light and dark themes, with light mode as the primary Stitch comparison target.
- Shared operations components used by RBAC and HR.
- RBAC Access Explorer, Roles, Permissions, Scope Matrix, and their CRUD flows.
- HR People Directory, staff provisioning, profile detail/update, lifecycle actions, initial-password flow, and personal-profile onboarding.
- Loading, empty, error, disabled, focus, dirty-form, success, and confirmation states.
- Vietnamese and English copy for every changed visible string.
- Runtime verification against the local backend using the administrator account supplied by the user.

### Excluded

- Backend contract changes.
- Route or primary navigation label changes.
- Mobile layouts.
- Migration of non-RBAC and non-HR feature pages.
- New UI dependencies.
- Production mutations during visual verification unless a dedicated disposable test record is created and approved.

## Design Direction

This is a redesign-overhaul for a desktop enterprise operations product. It retains the LNG brand and information architecture while replacing the current mixed visual language.

- Design variance: 3. Predictable structure supports fast scanning and repeatable operations.
- Motion intensity: 2. Motion is limited to state feedback and transitions already supported by the application.
- Visual density: 8. Dense workspaces prioritize information and actions without reverting to generic management tables.
- Primary accent: LNG Red.
- Typeface: Inter, retained for the approved Stitch foundation and dense multilingual operations UI.
- Shape system: 8px controls, 12px surfaces, compact status chips.
- Separation: borders and spacing first, restrained shadows only for floating surfaces.

## Source of Truth

Stitch supplies the visual and interaction reference. Backend documentation and implementation supply the data contract.

Relevant Stitch boards include:

- `LNG UI Foundation - Enterprise Compact`
- `Staff Access Explorer (Contract Final)`
- `Access Assignments (Approved)`
- `Roles Workspace (Approved)`
- `Permissions Workspace (Contract Final)`
- `Scope Registry (Contract Final)`
- `HR People Directory (Contract Final)`
- `CRUD Modal Spec - HR CREATE STAFF (Approved Exact)`
- `CRUD Modal Spec - HR UPDATE / LIFECYCLE (Approved Exact)`
- `Change Initial Password (Contract Final)`
- `Complete Personal Profile (Contract Final)`

Stitch sample data and any invented contract details must not enter production code.

## Architecture

The refactor changes the presentation layer only.

### Theme foundation

`src/theme` and the Tailwind theme expose the same semantic concepts:

- canvas and page backgrounds;
- default, subtle, raised, and selected surfaces;
- default, strong, focus, and danger borders;
- primary, secondary, and muted text;
- brand default, hover, active, and tint colors;
- success, warning, danger, and information states;
- focus ring, disabled opacity, elevation, radius, and typography scales.

Light and dark values differ, but component hierarchy and semantic meaning remain identical. Feature components must not introduce raw colors when a semantic token exists.

### App Shell

`MainLayout`, `AppHeader`, and `AppSidebar` become the only desktop shell implementation.

- Header target height: 56px.
- Expanded sidebar target width: 240px.
- Portal and HR keep their existing navigation contexts and permission-aware menu behavior.
- Global search, theme, language, notifications, and account controls retain existing behavior.
- Route paths, primary navigation labels, and permission redirects remain unchanged.
- Main content uses one canvas and content-width rule across RBAC and HR.

### Shared operations system

The existing `src/components/operations` layer remains the shared boundary and is refactored rather than replaced by a parallel component library.

It owns:

- page frame and sticky workspace header;
- title, subtitle, primary actions, and contextual secondary actions;
- tabs and segmented navigation;
- search, filters, reset, and active-filter summary;
- dense table/list surfaces;
- pagination and result count;
- status badges and icon actions;
- skeleton, empty, and error states;
- dialog, confirmation, and drawer conventions.

Form controls follow one visual contract: persistent label above the value area, optional helper text below, error text below, and a visible keyboard focus ring. Dialogs use a stable title/body/footer hierarchy and action-specific confirmation labels.

### Feature composition

Feature pages keep ownership of queries, mutations, URL state, permission checks, and business-specific rendering. They compose shared presentation components and never duplicate API behavior inside UI primitives.

## RBAC Experience

RBAC remains one workspace at `/portal/settings/users-roles`.

### Access Explorer

- Left pane: account search, supported filters, paginated account list.
- Center pane: Overview, Global, Scoped, and Effective access views.
- Right pane: account actions and status controls.
- Effective permissions are displayed from backend responses and are never recalculated by the browser.
- Search and filters send only backend-supported parameters. Client-only filters must be explicit in code and UI behavior.

### Roles and Permissions

- Roles and Permissions are sibling workspace tabs.
- A selectable directory stays visible beside the selected item detail.
- Create and edit use shared dialogs with permission grouping and search.
- Delete actions show usage-aware disabled states and action-specific confirmations.
- Permission codes remain stable identifiers and cannot be silently rewritten during editing.

### Scope Matrix

- The matrix connects roles and registered scopes without simulating access.
- Selecting a cell reveals the backend replacement set or inherited state.
- Scope registry management shares the same workspace.
- Scopes with active assignments cannot be deactivated.
- Scoped override forms submit the exact backend replacement payload.

## HR Experience

### People Directory

- Dense directory with sticky header, search, department/status filters, refresh, deleted-record toggle, and pagination.
- Directory responses stay minimal. Restricted or sensitive details load only when a profile drawer opens.
- Each row exposes only backend-authorized actions.

### Staff provisioning

Create Staff is one transaction-oriented dialog that builds the existing staff provisioning payload:

- work email;
- employee code and full name;
- department and team;
- job title and level;
- employment type and work mode;
- start and probation dates;
- employee status;
- access role, scope type, and scope target.

The generated account continues through the existing initial-password and personal-profile onboarding flows.

### Profile and lifecycle

- Profile detail opens in a right drawer.
- HR-owned fields edit in a separate dialog.
- Staff-owned personal fields remain read-only for HR unless backend permissions explicitly allow editing.
- Delete and restore show the employee identity and explain the directory impact.
- Leave-balance administration remains permission-gated and visually separated from profile metadata.

### Onboarding

- Initial password change and personal profile completion remain separate enforced steps.
- Existing saved destination and permission-aware redirect behavior must not regress.

## Data and State Flow

- Pages call existing TanStack Query hooks.
- URL search state remains the source for paginated list filters where already implemented.
- Query arguments pass through existing normalizers before reaching the shared API client.
- Mutations pass through existing payload builders.
- Success invalidates or refetches the narrowest relevant query keys.
- API errors appear in the affected workspace, drawer, or dialog.
- Snackbar messages are reserved for transient completion feedback.
- Pending actions disable duplicate submission.
- Dirty dialogs require confirmation before closing.
- No production path uses mock data as an API fallback.

## Interaction States

Every refactored workspace must implement:

- shape-matched skeleton loading;
- actionable empty state;
- contextual load error and retry;
- disabled controls with a discoverable reason when possible;
- keyboard focus visibility;
- correct hover, active, selected, and pending states;
- action-specific confirmation verbs;
- success feedback and refreshed backend data;
- light and dark theme parity.

## Localization

- Every changed visible label, helper, placeholder, tooltip, status, empty state, error, and action is present in both `vi` and `en` resources.
- Technical fallback keys such as `Title`, `Edit Action`, or raw i18n paths must not render.
- Backend enum values may remain technical where they are the contract, but their display labels should use existing localized mappings when available.

## Migration Strategy

The work is delivered in four checkpoints, but RBAC and HR are not considered migrated until each entire module uses the new foundation.

### Checkpoint 1: Foundation and App Shell

- Align semantic tokens across MUI and Tailwind.
- Refactor shared controls and operations components.
- Replace the desktop header, sidebar, and content frame.
- Verify representative existing pages do not lose routing or basic layout behavior.

### Checkpoint 2: RBAC

- Migrate Access Explorer.
- Migrate Roles and Permissions.
- Migrate Scope Matrix and registry.
- Migrate all account, assignment, role, permission, scope, and override dialogs.

### Checkpoint 3: HR

- Migrate People Directory.
- Migrate staff provisioning.
- Migrate profile drawer, edit dialog, lifecycle actions, and leave-balance placement.
- Align initial-password and personal-profile onboarding.

### Checkpoint 4: Visual and runtime audit

- Run the local frontend against the local backend.
- Log in with the administrator account supplied by the user.
- Compare the approved Stitch boards with the rendered desktop light theme.
- Verify hierarchy and contrast in dark theme.
- Exercise search, filters, pagination, tabs, drawers, dialog validation, dirty-close protection, and permission gating.
- Avoid mutating real records unless a disposable record is explicitly approved.

## Compatibility Constraints

- Keep React 19, Vite, MUI 9, Tailwind 4, TanStack Query 5, Zustand 5, React Router 7, react-hook-form, zod, and react-i18next.
- Add no frontend dependencies.
- Use the shared API client and endpoint constants.
- Use backend-provided permission codes instead of role names.
- Preserve existing route paths and setup redirects.
- Preserve unrelated working-tree changes.

## Verification

Automated verification includes:

- focused theme and shared-component composition tests;
- RBAC payload, access, filtering, and compatibility tests;
- HR payload and workflow composition tests;
- i18n completeness checks;
- layout and permission-aware navigation tests;
- `npm run lint`;
- `npm run build`.

Runtime verification includes:

- desktop widths represented by the approved Stitch screens;
- light and dark modes;
- keyboard focus and dialog close behavior;
- backend loading, empty, and error states;
- real account and profile data;
- no console warnings caused by invalid MUI props or leaked DOM attributes.

## Acceptance Criteria

- App Shell, RBAC, and HR use one visual language derived from Stitch.
- No old visual pattern remains inside the migrated RBAC and HR surfaces.
- All included CRUD bodies and list params match the audited backend contracts.
- Search, filters, pagination, tabs, drawers, dialogs, validation, confirmations, and permission gating work against the real backend.
- Light mode closely matches the approved Stitch hierarchy and density.
- Dark mode preserves the same hierarchy, status meaning, and accessibility.
- No visible technical placeholder or mixed-language fallback remains in the included surfaces.
- No raw API URL, `window.confirm`, hardcoded role gate, or browser-side effective-permission calculation is introduced.
- Focused tests, lint, and production build pass.
- The shared foundation can be reused by later feature migrations without recreating buttons, filters, tables, drawers, or dialogs.
