# Sidebar Stitch Expression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Express the existing Portal and HR sidebar with the approved compact Stitch hierarchy without changing navigation behavior.

**Architecture:** `AppSidebar.jsx` remains responsible for visual rendering and icon selection; `sidebarNavigation.js` remains the unchanged route and RBAC model. Parent rows become non-interactive section labels or nested functional labels, while leaf links retain their current route behavior.

**Tech Stack:** React 19, MUI icons and layout primitives, Node built-in tests, ESLint, Vite.

## Global Constraints

- Preserve all existing route IDs, route paths, permission arrays, Portal | HR switching, active-route behavior, and all-expanded hierarchy.
- Use only already installed MUI outlined icons; add no dependency, route, translation key, API work, or interaction state.
- Domain parents have no icon and are not focusable; Catalog and Monitoring retain icons and visible child insets.
- Keep `.stitch/` and `.superpowers/` artifacts uncommitted.

---

### Task 1: Render compact Stitch hierarchy and icon language

**Files:**

- Modify: `src/layouts/AppSidebar.jsx`
- Modify: `src/layouts/appSidebarComposition.test.js`

**Interfaces:**

- Consumes: the existing `item.type`, `item.children`, `item.icon`, active-path helper, `PORTAL_NAVIGATION`, and `HR_NAVIGATION`.
- Produces: visually distinct section labels for domain parents and the approved MUI icon map for navigable leaves and functional parents.

- [ ] **Step 1: Write failing static composition tests**

In `appSidebarComposition.test.js`, assert that the source has a parent-label rendering branch that omits `NavGlyph` for `depth === 'root'` parents with `children`, retains `NavGlyph` for nested parents, and imports the approved outlined icons such as `DashboardOutlinedIcon`, `ShoppingCartOutlinedIcon`, `ConstructionOutlinedIcon`, `OutboxOutlinedIcon`, `BrushOutlinedIcon`, `BusinessOutlinedIcon`, `PaymentsOutlinedIcon`, `LinkOutlinedIcon`, and `AssessmentOutlinedIcon`.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `node --test src/layouts/appSidebarComposition.test.js`

Expected: FAIL because root parent rows currently render their icon and use the generic navigation-row styling.

- [ ] **Step 3: Implement the minimal rendering and icon update**

In `AppSidebar.jsx`:

```jsx
const isDomainLabel = depth === 'root'

<Box sx={isDomainLabel ? sectionLabelSx : navButtonSx(/* current arguments */)}>
  {!isDomainLabel && <Box className="SidebarNavIcon"><NavGlyph icon={item.icon} /></Box>}
  <ListItemText primary={t(item.labelKey)} />
</Box>
```

Use the `sectionLabelSx` object only for root parent labels: compact uppercase caption, muted blue-grey text, 16px top separation, 4px bottom separation, 16px horizontal inset, no hover state, no active border, and no interactive role. Keep the current two child inset levels. Replace only the visual icon map with the exact approved icons in `2026-07-23-sidebar-stitch-expression-design.md`; do not change item icon keys or navigation data.

- [ ] **Step 4: Run focused checks and commit**

Run: `node --test src/layouts/appSidebarComposition.test.js src/layouts/sidebarNavigation.test.js` and `npm run lint`.

Expected: all focused tests and lint pass. Commit only the two source/test files with `feat(sidebar): apply stitch navigation expression`.

### Task 2: Verify production integration

**Files:**

- Verify: `src/layouts/AppSidebar.jsx`
- Verify: `src/layouts/sidebarNavigation.js`

- [ ] **Step 1: Run build and whitespace checks**

Run: `git diff --check HEAD^..HEAD` and `npm run build`.

Expected: no whitespace output and Vite exits 0. The existing bundle-size warning may remain non-failing.

- [ ] **Step 2: Confirm scope**

Run: `git status --short`.

Expected: only ignored `.stitch/` and `.superpowers/` tooling paths remain untracked; no source file is unstaged.

## Self-Review

- Task 1 covers the no-icon domain labels, functional parent icons, Stitch leaf icon map, and focused regression coverage.
- Task 2 verifies the production build and prevents accidental changes to routing/RBAC model files.
- The plan changes exactly one rendering component and its existing static test; it does not add a component or dependency.
