# Shell And Shared UI Redesign

## Goal

Redesign the app shell and shared UI primitives with a modern polished operational style. The work should make the product feel cleaner, deeper, and more deliberate while preserving dense enterprise workflows.

## Scope

- App shell: rail, sidebar, header command bar, content surface, collapse/search/action states.
- Shared primitives: `PageHeader`, `SectionCard`, `MetricCard`, `DataTable`, `FilterBar`, `DetailDrawer`, tabs, loading, empty, feedback, and bulk/action foundations where they share the same surface language.
- Theme tokens and shared SCSS needed to support those primitives.

Out of scope:

- Redesigning individual business workflows page by page.
- Backend/API changes.
- New dependencies.
- Replacing Ant Design or the existing routing/query/i18n architecture.

## Design Direction

Use a modern polished operational style:

- Light mode remains primary; dark mode remains compatible.
- Surfaces gain clearer layering through borders, tonal fills, and restrained shadows.
- Metrics become more prominent without becoming oversized dashboard cards.
- Tables remain dense and scannable.
- Motion is subtle, functional, and disabled under reduced-motion preferences.
- Radius stays close to the existing 8px system unless Ant Design component internals require a small local exception.

Avoid:

- Marketing-style hero sections.
- Decorative blobs, heavy glass effects, or one-note dark dashboards.
- Broad prop API churn in shared components.
- Full page rewrites hidden inside shared-system work.

## Architecture

Keep the existing stack:

- React 19 with Vite.
- React Router route lazy loading.
- Ant Design components and theme tokens.
- TanStack Query usage unchanged.
- Existing i18n setup for user-facing text.

Primary implementation files:

- `src/shared/theme/theme.ts`
- `src/app/layout/AppShell.tsx`
- `src/app/layout/AppShell.module.scss`
- `src/app/layout/AppRail.tsx`
- `src/app/layout/AppSidebar.tsx`
- `src/shared/ui/PageHeader.tsx`
- `src/shared/ui/sharedUi.module.scss`
- Existing shared UI component files only where removing inline style or improving accessibility requires a small code change.

## Shell Contract

The shell keeps its current information architecture:

- App rail stays the core switcher.
- Context sidebar stays the secondary navigation.
- Header stays the command/action bar.
- Page content continues to render through `Outlet`.

Polish targets:

- Rail active state is visually decisive and keyboard focus is obvious.
- Sidebar group/item states feel calmer and more consistent, with hover/focus motion kept small.
- Header search has stable width and does not crowd global actions.
- Header action cluster reads as one compact control group.
- Content area uses a layered background and spacing that makes shared page surfaces feel intentional.
- Fixed workspaces, especially chat, keep their current full-height behavior.

## Shared Component Contract

`PageHeader`:

- Move inline layout/style to shared classes.
- Preserve title, description, updatedAt, and actions props.
- Use a clear heading scale and compact metadata row.
- Replace hardcoded visible copy only if it can be done without changing callers.

`SectionCard`:

- Keep the existing prop API.
- Use restrained elevation and selected states.
- Reduce hover movement so cards feel stable in dense workbenches.

`MetricCard`:

- Keep value, label, icon, status, loading, className, style, and onClick props.
- Improve icon/status/value alignment.
- Prevent long values and labels from shifting layout.
- Preserve keyboard activation for clickable cards and add Space activation if touched.

`DataTable`:

- Keep default scroll behavior unless a caller overrides it.
- Make headers, borders, row separation, and hover state cleaner.
- Keep density suitable for operations queues.
- Preserve empty/error rendering.

`FilterBar`:

- Keep label, children, actions, and contentClassName props.
- Improve wrapping and action alignment across desktop and tablet widths.
- Avoid layout jumps when filters wrap.

`DetailDrawer`:

- Keep current props.
- Align drawer surface, footer spacing, and title density with the rest of the shell.

Tabs/loading/empty/feedback:

- Harmonize radius, border, spacing, and focus states with the updated surface language.
- Do not create new variants unless an existing caller needs one immediately.

## Accessibility And Motion

- All icon-only interactive controls must keep an accessible name.
- Focus states must remain visible.
- Keyboard order should follow visual order.
- Motion should use short transitions, roughly 150-220ms, with ease-out timing.
- `prefers-reduced-motion: reduce` must disable non-essential transitions.
- The nav-heavy shell should not make keyboard users tab through unnecessary hidden controls.

## Performance

- Prefer CSS and Ant Design tokens over JavaScript-driven visual behavior.
- Do not add animation libraries.
- Do not memoize simple components without evidence.
- Keep route lazy loading unchanged.
- Avoid changing query/data flow while redesigning surfaces.

## Verification

Run the smallest meaningful checks after implementation:

1. Focused shared UI and layout tests, such as `src/test/shared/ui/sharedUi.test.tsx` and app layout tests.
2. `npm run lint`
3. `npm run build`

If broader checks fail because of unrelated baseline issues, report focused passes and baseline failures separately.

## Rollout Plan

Phase 1:

- Theme token polish.
- Shell rail/sidebar/header/content polish.
- `PageHeader` and `SectionCard` alignment.

Phase 2:

- `MetricCard`, `DataTable`, `FilterBar`, `DetailDrawer`, tabs, loading, empty, and feedback surfaces.
- Focused tests for any behavior touched.

Phase 3:

- Run lint/build.
- Inspect key operational pages visually if a dev server/browser check is available.
