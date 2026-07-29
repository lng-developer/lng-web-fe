# RBAC Desktop UI Foundation Design

Date: 2026-07-29
Status: Approved direction, pending written-spec review
Scope: Shared desktop visual language for HR and RBAC workspaces

## Objective

Create one reusable desktop UI foundation before refining individual HR and RBAC screens. The foundation standardizes typography, color, spacing, icons, buttons, fields, search, filters, cards, dialogs, feedback, and pagination while preserving the existing MUI stack and backend-first interaction contracts.

## Design Read

This is a serious internal operations product for HR and access administrators. The chosen direction is MUI Enterprise Compact: calm neutral surfaces, restrained brand red, dense information, clear action hierarchy, and minimal decorative treatment.

- Design variance: 4/10
- Motion intensity: 2/10
- Visual density: 7/10
- Theme: light desktop only for this delivery
- Primary accent: `#E83B4A`

## Constraints

- Reuse the installed MUI components, Material icons, Tailwind utilities, and existing theme entry points.
- Add no frontend dependency.
- Do not mix Fluent, Carbon, shadcn, or another component system into the project.
- Keep permission checks and mutation availability tied to backend-provided permissions.
- Search and filter controls expose only query parameters supported by the relevant backend endpoint.
- Form controls expose only fields supported by the relevant request body.

## Foundation Tokens

### Color

| Token          | Value                  | Purpose                               |
| -------------- | ---------------------- | ------------------------------------- |
| Canvas         | `#F6F7F9`              | App and page background               |
| Surface        | `#FFFFFF`              | Primary work surface                  |
| Surface subtle | `#FBFCFD`              | Toolbar and quiet grouped areas       |
| Border         | `#E3E6EA`              | Default divider and control border    |
| Border strong  | `#C9CED6`              | Hovered and emphasized border         |
| Text strong    | `#171A1F`              | Titles and primary values             |
| Text secondary | `#4E5968`              | Labels and supporting content         |
| Text muted     | `#7A8494`              | Placeholder and tertiary metadata     |
| Primary        | `#E83B4A`              | Primary action and selected state     |
| Primary hover  | `#D52F3E`              | Primary hover state                   |
| Primary subtle | `#FFF1F3`              | Selected row and quiet brand tint     |
| Focus          | `rgba(232,59,74,0.24)` | Focus ring                            |
| Success        | `#1F8A5B`              | Confirmed successful state            |
| Warning        | `#A86400`              | Attention without destructive meaning |
| Error          | `#C7353F`              | Validation and destructive state      |
| Info           | `#2563EB`              | Neutral informational state           |

Brand red is reserved for the primary action, current selection, focus, and destructive emphasis. It is not used as decoration or for unrelated statuses.

### Typography

Use the existing Inter stack for this operational interface and JetBrains Mono only for IDs, codes, permission keys, and endpoints.

| Style                | Size / line height | Weight | Use                              |
| -------------------- | ------------------ | ------ | -------------------------------- |
| Page title           | 24 / 32px          | 700    | One per page                     |
| Section title        | 20 / 28px          | 700    | Major workspace section          |
| Card or dialog title | 16 / 24px          | 700    | Local hierarchy                  |
| Body primary         | 14 / 20px          | 400    | Default reading text             |
| Body strong          | 14 / 20px          | 600    | Row label and important value    |
| Body compact         | 13 / 18px          | 400    | Dense metadata and controls      |
| Label                | 12 / 16px          | 600    | Field labels and table headers   |
| Caption              | 11 / 16px          | 600    | Secondary metadata only          |
| Code                 | 12 / 18px          | 500    | IDs, permission codes, endpoints |

Sentence case is the default. Uppercase is limited to backend codes and short table headings where already established.

### Spacing and Shape

- Spacing scale: 4, 8, 12, 16, 24, 32px.
- Default page gap: 24px.
- Default surface padding: 20px.
- Dense toolbar gap: 8px.
- Control radius: 8px.
- Card and dialog radius: 12px.
- Status chips and counters: full pill radius.
- Default control height: 40px.
- Compact table or toolbar control height: 32px.
- Large primary action height: 44px.

Shadows are used only for floating dialogs, menus, and popovers. Page sections and cards use borders and spacing instead of generic elevation.

## Component Standards

### Icons

- Use the existing Material icon family only.
- Default icon size: 18px.
- Compact action icon: 16px.
- Standalone toolbar icon: 20px.
- Empty-state icon: 24px maximum.
- Use outlined icons by default and filled icons only for an active navigation state.
- Every icon-only button requires a tooltip and accessible name.
- Do not use emoji, hand-drawn SVG paths, or mixed icon families.

### Buttons

The system has four button roles:

1. Primary: filled brand red, one per action group.
2. Secondary: white surface with neutral border.
3. Ghost: text or icon action for low-emphasis utilities.
4. Danger: red text or red fill only inside a confirmed destructive flow.

All buttons use 14px semibold labels, 8px radius, a one-line label, and visible hover, focus, active, disabled, and loading states. Loading preserves button width. Icon-only buttons are 32px compact or 40px default.

### Inputs and Labels

- Labels always sit above fields. Placeholder text never replaces a label.
- Required fields use a text asterisk with an accessible required state.
- Helper text appears below the control only when it changes how the field is completed.
- Validation appears inline below the affected field; a toast does not replace field validation.
- Default input height is 40px with 14px text and 12px label.
- Hover strengthens the border; focus uses the primary border plus the shared focus ring.
- Disabled fields remain readable and clearly non-interactive.
- Read-only fields use a subtle surface and retain selectable text.

Text field, select, autocomplete, date field, password field, textarea, checkbox, radio, and switch share the same label, border, focus, error, and disabled language.

### Search

- Search is a dedicated field with a leading 18px search icon.
- A clear icon appears only when a value exists.
- Placeholder describes the searchable backend fields, for example `Search email or employee code`.
- Search width is 280-360px on desktop and may flex when it is the toolbar's primary control.
- The control does not invent advanced syntax or fields unsupported by the backend.

### Filters

- Keep the three most-used filters visible beside search.
- Less common supported params live in one Filters popover or drawer.
- The Filters trigger shows an active count only when filters are applied.
- Applied filters appear as removable chips below the toolbar when they need persistent visibility.
- `Clear all` resets filters and page to 1.
- Select options use human labels while requests retain backend IDs and enum values.
- Boolean filters use a checkbox or explicit two-state select, not ambiguous icon toggles.

### Pagination

The desktop footer uses one consistent three-part layout:

- Left: `Showing 21-40 of 126`.
- Center or right: previous, numbered pages, next.
- Far right: `Rows per page` select using backend-supported limits.

Page controls are 32px square with an 8px radius. The current page uses the primary subtle background and primary text, not a fully red block. Previous and next buttons have icons plus accessible names. Changing page size resets page to 1. Empty lists show `0 results` and disable navigation.

### Cards and Work Surfaces

- Use a card only when it establishes a real group or selected entity.
- Default card uses a white surface, 1px border, 12px radius, and 20px padding.
- Selected cards use a primary border and primary subtle background.
- Summary cards use one strong value, one label, and at most one supporting line.
- Nested card stacks are avoided. Use spacing, section headings, and dividers inside a parent surface.

### Dialogs and Drawers

- Confirmation dialog: 440px.
- Standard create or edit dialog: 560px.
- Dense multi-section form: 720px or a right drawer when account context should remain visible.
- Title and endpoint/body context remain visible at the top when useful for implementation, but production UI uses human-facing copy.
- Content scrolls independently when needed; header and footer remain stable.
- Footer places Cancel before the primary action. Destructive confirmation uses explicit action text such as `Delete role`.
- Closing with dirty values asks for confirmation. A pending mutation cannot be submitted twice.
- Backend validation stays in the form; transient success uses a toast; conflicts stay visible until corrected.

### Status and Feedback

- Status always includes text, never color alone.
- Use compact status chips for lifecycle state and inline alerts for persistent problems.
- Toasts are reserved for completed transient actions.
- Loading uses skeletons shaped like final content.
- Empty state distinguishes no data from no filter matches.
- Error state keeps current context and provides Retry when the read can be repeated.

## Shared Desktop Composition

Every HR and RBAC management screen follows the same vertical rhythm:

1. Page header with title, context, and one primary action.
2. Optional task-level navigation or tabs.
3. Search and filter toolbar on a subtle surface.
4. Active filter chips when needed.
5. Main work surface: explorer, list, matrix, or detail.
6. Pagination attached to the data surface.
7. Dialog or drawer for create, update, delete, and other mutations.

The foundation standardizes the controls without forcing every workflow into a table. Access Explorer, role workspace, scope matrix, people directory, and profile flows retain their task-oriented layouts.

## Accessibility

- Body and control text meet WCAG AA contrast.
- Focus is visible on every interactive element.
- Keyboard order follows visual order.
- Dialogs and drawers trap focus and restore it to the trigger.
- Icon-only actions have labels and tooltips.
- Error summaries link to invalid fields when a long form contains multiple failures.
- Status, selection, and required state are communicated with text or shape in addition to color.

## Stitch Deliverable

Create one desktop-only `LNG UI Foundation - Enterprise Compact` board with these sections:

1. Color and typography tokens.
2. Icon sizes and action patterns.
3. Buttons in every role and state.
4. Inputs, labels, helper text, validation, and disabled/read-only states.
5. Search plus inline and advanced filter patterns.
6. Cards and work surfaces.
7. Pagination.
8. Create/edit dialog, destructive confirmation, drawer, toast, alert, skeleton, and empty state.
9. One compact toolbar specimen showing the components working together.

Only after this foundation board is approved will the CRUD and Access Explorer frames be visually revised against it.

## Success Criteria

- The same component has the same height, radius, typography, color, and states in every frame.
- Brand red has one controlled semantic role.
- All search and filter controls map to supported backend params.
- All form controls map to supported backend body fields.
- Antigravity can implement components from this board without guessing visual tokens.
- No new UI dependency or parallel design system is introduced.
