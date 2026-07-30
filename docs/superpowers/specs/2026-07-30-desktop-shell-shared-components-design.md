# Desktop Shell and Shared Components Design

## Goal

Build the reusable desktop application shell and the smallest shared component layer needed for future LNG Web screens. The design follows the approved Stitch screen `LNG UI Foundation - Enterprise Compact` and uses the existing Industrial Operations Core palette.

## Scope

- Desktop only, targeting widths from 1280px upward.
- Fixed desktop sidebar with a collapsible compact state.
- Top bar with breadcrumbs, language control, theme control, and user entry point.
- Fluid content workspace capped at 1440px.
- Light, dark, and system appearance modes stored in `localStorage`.
- Existing project palette applied through Ant Design theme tokens.
- A foundation route that demonstrates reusable states before feature screens are built.

Mobile navigation, backend preference sync, feature-specific menus, and free-form color picking are explicitly out of scope.

## Design Direction

The interface is an enterprise POD operations workspace: compact, sober, and optimized for repeated daily use. Visual variance is low, motion is limited to direct interaction feedback, and information density is high. Structural borders and spacing provide hierarchy instead of decorative gradients or large shadows.

The approved palette anchors are:

- Brand primary: `#E83B4A`
- Application background: `#F6F7F9`
- Light surface: `#FFFFFF`
- Strong text: `#171A1F`

Dark mode derives compatible surfaces and text colors while retaining the same brand primary and semantic status meanings.

## Architecture

### Theme foundation

`ThemeProvider` owns the appearance preference and supplies Ant Design `ConfigProvider` tokens. It supports `light`, `dark`, and `system`, listens for system appearance changes only when `system` is selected, and persists the preference locally.

The provider is the single source of theme state. Components consume Ant Design tokens instead of importing fixed theme colors.

### Desktop application shell

`AppShell` provides:

- A fixed-width sidebar with brand, navigation slots, and collapse control.
- A compact top bar with breadcrumbs on the left and global controls on the right.
- A scrollable content workspace with consistent page gutters and maximum width.
- An outlet for routed feature content.

Navigation data remains minimal and local to the foundation until real feature routes are approved. Permission filtering will later consume backend-provided permissions rather than role names.

### Shared component boundary

Create wrappers only for repeated product patterns:

- `PageHeader`: title, description, breadcrumbs-adjacent actions.
- `SectionCard`: consistent bordered content grouping.
- `StatusTag`: semantic operational states.
- `EmptyState`: empty content with an optional primary action.
- `FeedbackAlert`: success, warning, and error feedback blocks.
- `ThemeSwitch`: light, dark, and system preference control.
- `MetricCard`: labelled operational summary value with optional trend/status.
- `TableFooter`: result range, page-size control, and pagination pattern.
- `ConfirmDangerModal`: explicit destructive-action confirmation with loading support.

Use Ant Design `Button`, `Input`, `Table`, `Modal`, `Drawer`, and other primitives directly. Do not create passthrough wrappers for them.

## Foundation Route

The `/foundation` route demonstrates the desktop shell and shared components using static presentation data. It includes:

- Page title and actions.
- Core button and input states rendered directly from Ant Design.
- Status tags and feedback alerts.
- Section card and selected-card treatment.
- Metric cards, table footer, and destructive confirmation modal.
- Tooltip plus loading and disabled button states rendered directly from Ant Design.
- Empty state.
- Theme and language controls.

This route is a visual regression surface, not a production feature or a full Storybook replacement.

## State and Data Flow

Theme preference flows from `ThemeProvider` to Ant Design and the document color scheme. Language continues through the existing i18n provider. App shell navigation uses React Router links and active route state. Foundation presentation data stays local because it has no business ownership or API contract.

## Accessibility

- All controls remain keyboard reachable.
- Collapsed sidebar controls retain accessible names and tooltips.
- Focus styles use Ant Design tokens and remain visible in both themes.
- Text and interactive contrast target WCAG 2.1 AA.
- Theme selection is available as labeled controls, not color-only affordances.

## Verification

- Unit tests cover theme persistence, system-mode resolution, and shell rendering.
- Existing i18n and route tests remain green.
- Typecheck, lint, tests, and production build pass.
- Browser audit runs at desktop viewport only and verifies shell layout, theme switching, sidebar collapse, navigation, and absence of horizontal overflow.
- Mobile behavior is not asserted in this phase.

## Non-goals

- No business dashboard or feature screen.
- No backend preference endpoint.
- No user-defined color picker.
- No new UI dependency beyond the installed Ant Design stack.
- No speculative shared abstractions for future features.
