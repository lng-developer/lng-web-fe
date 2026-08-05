# Test Provider Performance Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the four-worker full UI suite from 234.81 seconds to below 180 seconds without production changes or coverage loss.

**Architecture:** Introduce a test-only provider builder with a fresh QueryClient and opt-in i18n/theme/AntD layers. Migrate the five measured hotspots, then retain the refactor only if the same full-suite benchmark improves.

**Tech Stack:** Vitest, Testing Library, TanStack Query, Ant Design, react-i18next.

## Constraints

- No production behavior changes, skipped tests, reduced assertions, dependency additions, or global Vitest isolation changes.
- Query retries are disabled in component tests.
- Every test render gets an independent QueryClient.
- Keep full AppProviders only where the test explicitly exercises the complete application provider stack.

### Task 1: Test provider helper

**Files:**

- Create: `src/test/helpers/testProviders.tsx`
- Create: `src/test/helpers/testProviders.test.tsx`

- [ ] Write a failing test proving two renders do not share QueryClient data.
- [ ] Implement `renderWithTestProviders(ui, options?)` with a fresh QueryClient and opt-in `i18n`, `theme`, and `antdApp` flags.
- [ ] Return the QueryClient and render-scoped Testing Library queries.
- [ ] Run the helper test and lint.

### Task 2: Design tests

**Files:**

- Modify: `src/test/portal/design/pages/DesignWorkbenchPage.test.tsx`
- Modify: `src/test/portal/design/pages/PsdFileWorkspacePage.test.tsx`

- [ ] Replace AppProviders with the minimum required provider options.
- [ ] Preserve all Design mocks and assertions.
- [ ] Remove the PSD test's inflated timeout if the isolated provider keeps it below five seconds.
- [ ] Run both files together and record duration.

### Task 3: Access Control and Catalog tests

**Files:**

- Modify: `src/test/auth/access-control/AccessControlPage.test.tsx`
- Modify: `src/test/portal/catalog/pages/CatalogListingWorkbenchPage.test.tsx`

- [ ] Migrate renders without changing permission or modal assertions.
- [ ] Keep i18n/theme only where the component consumes them.
- [ ] Run both files together and record duration.

### Task 4: Organization tests

**Files:**

- Modify: `src/test/organization/pages/OrganizationPage.test.tsx`

- [ ] Migrate all renders to fresh QueryClient instances.
- [ ] Preserve tree expansion, staff search, and CRUD assertions.
- [ ] Run the file and record duration.

### Task 5: Benchmark gate

- [ ] Run `npm run test:ui -- --reporter=verbose` with four workers.
- [ ] Compare files/tests, warnings, and wall time against 58 files, 174 tests, 234.81 seconds.
- [ ] Keep the migration only if all tests pass and wall time improves; target below 180 seconds.
- [ ] Run `npm run lint` and `npm run build`.
- [ ] Create one FE commit after all checks pass: `refactor(test): isolate UI test providers`.
