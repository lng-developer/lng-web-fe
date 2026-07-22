# Sidebar Context Navigation Design

## Goal

Redesign the application sidebar from a workspace-icon rail into the compact, single-column navigation shell shown in the approved Stitch references. `Portal` and `HR` are functional navigation contexts: the visible menu and destination are derived from the current route and backend-provided permissions.

## Design read

This is a dense desktop POD operations product for internal operators. The visual language follows the two Stitch screens: a calm white shell, compact type, subtle dividers, grouped navigation, and a thin blue active indicator. It is an intentional operational redesign, not a marketing treatment.

## Scope

### In scope

- Preserve the existing 248px sidebar footprint and responsive drawer behavior.
- Replace the vertical workspace-icon rail with a one-column sidebar.
- Add a `Portal | HR` segmented context control under the brand block.
- Partition existing navigation by context without changing routes or permission rules.
- Route a context-switch click to the first accessible, mounted leaf in that context.
- Derive the active context from the URL on load, reload, browser navigation, and deep links.
- Keep active ancestor groups expanded; preserve existing `NavLink` URL/query behavior.
- Add focused regression coverage for navigation partitioning, permission filtering, context landing routes, and sidebar composition.

### Out of scope

- New routes, backend endpoints, permission codes, roles, dependencies, or global theme replacement.
- A third Admin context. Settings and administration stay in Portal.
- Changing header, page layout width, translations outside sidebar labels, or mobile information architecture.
- Browser-only acceptance evidence beyond the existing drawer behavior; source-level and automated coverage will be added.

## Information architecture

| Context | Contents                                                                                   | URL ownership             |
| ------- | ------------------------------------------------------------------------------------------ | ------------------------- |
| Portal  | Dashboard; existing Orders, Production, Design, Vendor, Reports, Settings/Admin navigation | all non-HR mounted routes |
| HR      | Existing My Time, Request Inbox, Attendance, Schedule, and People leaves                   | `ROUTES.HR_TIME_*`        |

The navigation configuration remains the source of truth. New context metadata owns labels and route classification only. Existing `filterNavigationByUser` continues to remove inaccessible leaves and empty groups using backend permissions.

## Interaction model

1. `getSidebarContextForLocation(pathname)` returns `hr` only for mounted HR route paths; all other routes are `portal`.
2. The selected context tab is therefore route-derived; no manually selected context survives a browser reload or produces a sidebar/page mismatch.
3. Selecting the other context filters its navigation for the current user, finds the first mounted accessible leaf depth-first, and navigates via its existing `getNavItemTo` value.
4. If a context has no accessible leaf, its tab is not rendered. This is permission-driven, never role-name-driven.
5. The existing sidebar group state remains context-local. Any group containing the current route is open independently of a collapsed manual state.

## Visual specification

- White background and one subtle right border; no workspace rail.
- Brand row: compact LNG Web identity plus current operator display name, matching the existing app information.
- Segmented `Portal | HR` control: neutral shared surface, selected tab on white with `primary.main` text and a soft elevation/border; 32–34px target height.
- Root/group rows are 38px minimum height with 24px icon space and chevron for expandable groups.
- Active leaf/root item uses `primary.light`, `primary.main`, and a 3px left rule. Inactive labels remain `text.primary`/`text.secondary` according to nesting depth.
- Workspace names appear as restrained section captions inside Portal rather than an icon-only rail.
- Mobile continues to use the current modal drawer and closes after navigation.
- Existing MUI focus-visible behavior is retained; the context buttons expose `aria-pressed` and translated labels.

## Component and data boundaries

- `src/layouts/sidebarNavigation.js`: context metadata, Portal/HR navigation partition, URL-to-context helper, and first accessible leaf helper. No JSX or UI state.
- `src/layouts/AppSidebar.jsx`: context-tab rendering, context navigation handler, single-column layout, existing menu rendering, and context-local expanded-group state.
- `src/layouts/sidebarNavigation.test.js`: pure navigation/permission/landing-route contracts.
- `src/layouts/appSidebarComposition.test.js`: structural and accessibility composition contracts.
- `src/i18n/locales/{en,vi}/common.json`: context group label plus Portal and HR labels only.

## Error and empty states

- A context with no visible, permission-approved mounted leaf is omitted rather than rendered disabled.
- If no context is available, sidebar keeps the existing empty-nav behavior and does not fabricate a destination.
- `handleContextChange` performs no navigation when a permitted destination cannot be resolved.

## Verification

- TDD: new navigation/context tests fail before config/UI changes and pass after.
- `node --test src/layouts/sidebarNavigation.test.js src/layouts/appSidebarComposition.test.js`
- `npx eslint src/layouts/AppSidebar.jsx src/layouts/sidebarNavigation.js`
- `npm run build`
- Full source test suite must introduce no new failures; the existing backend endpoint registry failure for four report routes is documented separately.

## Self-review

- The design has one context model, one navigation source of truth, and no new dependency.
- Portal retains Settings/Admin as approved; HR is the only separate context.
- Context selection is route-driven, avoiding stale manual state and permission bypasses.
- The spec does not require a visual redesign of unrelated page surfaces.
