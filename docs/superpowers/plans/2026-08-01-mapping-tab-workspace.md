# Mapping Tab Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace six Mapping sidebar pages with one Mapping workspace containing six internal tabs and modal-based rule CRUD.

**Architecture:** Reuse the existing Workbench and rule-page components behind one `/portal/mapping` route. Store the active tab in `?tab=` and redirect legacy routes while preserving context query parameters. Keep rule IDs internal and render readable business labels only.

**Tech Stack:** React, React Router, Ant Design, TanStack Query, Vitest.

## Global Constraints

- Do not add dependencies.
- Sidebar exposes exactly one Mapping item.
- Create and update use a centered modal.
- MongoDB ObjectIDs never appear as user-facing fallbacks.

---

### Task 1: Unified Mapping route and navigation

**Files:**

- Create: `src/features/portal/mapping/pages/MappingWorkspacePage.tsx`
- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/app/router/router.tsx`
- Modify: `src/features/portal/mapping/pages/MappingWorkbenchPage.tsx`
- Test: `src/test/app/layout/appNavigation.test.ts`
- Test: `src/test/app/router/PortalMappingRoute.test.tsx`

- [ ] Write failing tests for one sidebar item and one canonical lazy route.
- [ ] Implement the unified route, tab query state, and legacy redirects.
- [ ] Update Workbench fix links to target the correct internal tab.
- [ ] Run the navigation, router, and Mapping workspace tests.

### Task 2: Modal rule CRUD and readable labels

**Files:**

- Modify: `src/features/portal/mapping/pages/MappingRulePage.tsx`
- Modify: `src/features/portal/mapping/components/RuleInventoryPanel.tsx`
- Test: `src/test/portal/mapping/pages/MappingRulePage.test.tsx`

- [ ] Write failing tests for modal create/update and absence of raw ObjectID fallback.
- [ ] Move the existing editor into an Ant Design modal without changing API behavior.
- [ ] Replace raw ID fallbacks with localized unavailable labels.
- [ ] Run the focused Mapping tests, typecheck, and build.
