# Finance Import UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Make finance import batches observable and actionable in the web workbench while exposing the existing upload modal to authorized finance users.

**Architecture:** Extend the existing finance import query/API types with recalculation progress, poll only active batches, and keep reprocess/upload mutations in the existing Integration Workbench query cache. No new backend endpoints are introduced; the FE consumes the existing batch detail and reprocess contracts.

**Tech Stack:** React 19, TypeScript, Ant Design, TanStack Query, Vitest, Testing Library.

**Spec:** Approved in chat on 2026-09-07: implement items 1–4; defer settlement export.

## Global Constraints

- Preserve existing `IntegrationWorkbench` tab, permission, and query-key patterns.
- Only users with `FINANCE:WRITE` may upload or reprocess finance imports.
- Poll only while the page is visible and the batch/import recalculation is active.
- Do not change settlement backend behavior in this phase.

---

### Task 1: Finance batch progress contract and polling

**Files:**
- Modify: `src/features/portal/finance/api/financeApi.ts`
- Modify: `src/features/portal/integrations/hooks/useFinanceImports.ts`
- Create: `src/features/portal/integrations/hooks/useFinanceImportPolling.ts`
- Test: `src/test/portal/integrations/hooks/useFinanceImports.test.ts`

**Interfaces:**
- `ImportBatch` exposes recalculation status, total, completed, failed, and errors.
- `useFinanceImportPolling(batchId, initialBatch)` returns the current `UseQueryResult<ImportBatch>` and stops polling after import and recalculation reach terminal states.

- [ ] Write failing tests for the expanded batch shape and active/terminal polling interval.
- [ ] Run the focused hook tests and verify they fail because the fields/hook do not exist.
- [ ] Implement the type fields and visibility-aware polling using `getFinanceImportBatch` and existing TanStack Query patterns.
- [ ] Run the focused hook tests and verify they pass.

### Task 2: Import history progress and reprocess action

**Files:**
- Modify: `src/features/portal/integrations/hooks/useFinanceImports.ts`
- Modify: `src/features/portal/integrations/components/FinanceImportSection.tsx`
- Modify: `src/features/portal/integrations/components/FinanceImportsTab.tsx`
- Modify: `src/features/portal/finance/api/financeApi.ts`
- Test: `src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx`

**Interfaces:**
- `useReprocessFinanceImportMutation` calls `reprocessImportBatch`, invalidates list/detail queries, and exposes mutation state.
- `FinanceImportSection` renders import status and recalculation progress, opens batch details, and renders a reprocess button for failed/partial batches when permitted.

- [ ] Add failing UI tests for recalculation counters/status and reprocess success/error behavior.
- [ ] Run the focused UI test and verify it fails.
- [ ] Implement the mutation, status display, progress text, and permission-gated action with existing `StatusTag`, `Progress`, and feedback toast components.
- [ ] Run the focused UI test and verify it passes.

### Task 3: Mount the finance upload modal

**Files:**
- Modify: `src/features/portal/integrations/pages/IntegrationWorkbenchContent.tsx`
- Modify: `src/features/portal/finance/pages/FinanceImportModal.tsx` only if the current callback contract needs error display wiring.
- Test: `src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx`

**Interfaces:**
- Finance Workbench exposes an `Import finance file` action for `FINANCE:WRITE` users.
- Submit calls `importFinanceFile` with the selected kind, shop, channel, marketplace, and dry-run values; success invalidates all finance import lists and closes the modal.

- [ ] Add a failing UI test that opens the Finance tab, launches the modal, submits a valid file, and asserts the API call plus success refresh.
- [ ] Run the focused UI test and verify it fails because the modal is not mounted.
- [ ] Add the mutation, button/action wiring, error toast, and modal rendering in `IntegrationWorkbenchContent`.
- [ ] Run the focused UI test and verify it passes.

### Task 4: FE verification and handoff

**Files:**
- Modify: `src/shared/i18n/locales/en/common.json` only for missing user-facing strings.

- [ ] Run focused integration UI and hook tests.
- [ ] Run `npm run typecheck` and `npm run lint`.
- [ ] Run `npm run build:dev`.
- [ ] Run `git diff --check` and report any pre-existing unrelated changes separately.
