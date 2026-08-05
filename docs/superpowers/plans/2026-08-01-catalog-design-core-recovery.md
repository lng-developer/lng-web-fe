# Catalog and Design Core Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing Catalog and Design recovery APIs to an operator-safe frontend workflow for PSD upload, PSD task creation, queue workload, submission history, and task cancellation.

**Architecture:** Extend the two existing feature API modules and keep mutation ownership in the current Catalog and Design workbenches. Add focused Design child components only for candidate selection and workload/history presentation so the existing page does not absorb more modal state. Backend lifecycle and authorization remain authoritative.

**Tech Stack:** React, TypeScript, Ant Design, TanStack Query, Axios API client, Vitest, Testing Library; Node.js/Jest backend verification only.

## Global Constraints

- Add no dependency.
- Use backend-provided permissions, never role names.
- Keep table actions icon-only with Tooltip and accessible labels.
- Never open an action modal and detail drawer together.
- Do not expose submission removal.
- Do not mutate the configured development database.
- Create one frontend implementation commit after all tasks pass.

---

### Task 1: API contracts and query keys

**Files:**

- Modify: `src/features/portal/catalog/api/catalogApi.ts`
- Modify: `src/features/portal/catalog/api/catalogKeys.ts`
- Modify: `src/features/portal/design/api/designApi.ts`
- Modify: `src/features/portal/design/api/designKeys.ts`
- Test: `src/test/portal/catalog/api/catalogApi.test.ts`
- Test: `src/test/portal/design/api/designApi.test.ts`

**Interfaces:**

- Produces: `uploadListingPsdTemplate(id, file)`, `getDesignSummary(params)`, `getDesignWorkload(params)`, `listPsdCandidates(params)`, `createPsdTaskFromListing(listingId, note?)`, `bulkCreatePsdTasks(input)`, `listDesignSubmissions(taskId)`, and `cancelDesignTask(taskId, cancelReason)`.

- [ ] Write API tests asserting exact HTTP method, URL, filtered query, JSON body, and multipart body for all functions above.
- [ ] Run `npm run test:unit -- --run src/test/portal/catalog/api/catalogApi.test.ts src/test/portal/design/api/designApi.test.ts` and confirm failure because the exports do not exist.
- [ ] Add the minimum response/input types and API functions using the shared `apiClient` and existing `unwrap`/`compact` helpers.
- [ ] Add query keys for summary, workload, candidates, and task submissions.
- [ ] Re-run the focused API tests and confirm they pass.

### Task 2: Catalog manual PSD recovery

**Files:**

- Modify: `src/features/portal/catalog/pages/CatalogListingWorkbenchPage.tsx`
- Test: `src/test/portal/catalog/pages/CatalogListingWorkbenchPage.test.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes: `uploadListingPsdTemplate(id: string, file: File)` returning the refreshed listing plus `warnings?: Array<{code: string; message: string}>`.
- Produces: a permission-aware Upload PSD quick action and warning feedback.

- [ ] Add a failing component test that uploads `template.psd`, verifies the listing endpoint receives the file, and verifies returned post-action warnings are visible without an upload failure message.
- [ ] Run the Catalog page test and confirm it fails because the upload action is absent.
- [ ] Add an icon action for writable listings, a single-file Ant Upload control, pending-state protection, Catalog query invalidation, and Design query invalidation.
- [ ] Keep the upload modal state independent of `selectedId` so the detail drawer does not open.
- [ ] Re-run the focused Catalog page test and confirm it passes.

### Task 3: PSD candidate creation and workload

**Files:**

- Create: `src/features/portal/design/pages/PsdCandidateDrawer.tsx`
- Create: `src/features/portal/design/pages/DesignWorkloadPanel.tsx`
- Modify: `src/features/portal/design/pages/DesignWorkbenchPage.tsx`
- Test: `src/test/portal/design/pages/PsdCandidateDrawer.test.tsx`
- Test: `src/test/portal/design/pages/DesignWorkloadPanel.test.tsx`
- Test: `src/test/portal/design/pages/DesignWorkbenchPage.test.tsx`

**Interfaces:**

- `PsdCandidateDrawer` consumes `open`, `onClose`, and `canCreate`; it owns candidate pagination/selection and single/bulk result display.
- `DesignWorkloadPanel` consumes the current supported queue filters and renders backend summary/workload responses.

- [ ] Add failing tests for candidate read access, hidden create controls without `DESIGN:WRITE`, single create, explicit bulk create, duplicate pending-submit protection, and persisted bulk results.
- [ ] Add failing tests for summary totals, unassigned count, and per-designer workload.
- [ ] Run the three focused Design component suites and confirm they fail because the components/actions do not exist.
- [ ] Implement the two focused components using existing shared cards, tables, feedback, and query patterns.
- [ ] Add the candidate entry action and workload panel to `DesignWorkbenchPage`; invalidate Design queries after create/bulk success.
- [ ] Re-run the focused suites and confirm they pass.

### Task 4: Submission history and cancellation

**Files:**

- Modify: `src/features/portal/design/pages/DesignWorkbenchPage.tsx`
- Test: `src/test/portal/design/pages/DesignWorkbenchPage.test.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes: `listDesignSubmissions(taskId)` and `cancelDesignTask(taskId, cancelReason)`.
- Produces: lazy version history and a reason-required cancel modal.

- [ ] Add failing tests proving history loads only after opening detail, renders multiple versions, hides cancel without `DESIGN:WRITE`, rejects a blank reason, and shows only one dialog when Cancel is invoked from the table/drawer.
- [ ] Run the Design page test and confirm the new assertions fail for missing behavior.
- [ ] Add the lazy submissions query and render version/status/files/note/rejection/approval data in the drawer.
- [ ] Add Cancel only for non-terminal tasks and `DESIGN:WRITE`, with isolated `activeTask`, trimmed required reason, pending protection, and query invalidation.
- [ ] Re-run the focused test and confirm it passes.

### Task 5: Full verification and delivery

**Files:**

- Verify all changed FE files.
- Read-only verify BE worktree: `C:\lng_system\lng-web\lng-web-be\.worktrees\fe-refactor`.

- [ ] Run FE verification:

```powershell
npm run lint
npm run test:unit
npm run test:ui
npm run build
git diff --check
```

- [ ] Run relevant BE verification without database mutation:

```powershell
npm test -- --runInBand src/test/catalog src/test/design src/test/media src/test/production/services/productionTask.service.test.js src/test/architecture
```

- [ ] Confirm no credentials or development database URI appear in captured output and both worktrees contain no unrelated changes.
- [ ] Stage only plan-owned FE files and create one commit:

```powershell
git commit -m "feat(design): add catalog recovery workflow"
```

- [ ] Re-run lint, focused component/API tests, and build after the pre-commit hook; confirm the worktree is clean.
