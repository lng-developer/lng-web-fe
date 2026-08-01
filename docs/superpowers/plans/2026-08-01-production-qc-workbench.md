# Production and QC Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the recoverable backend workflow and the Scale/QC operator workbench approved in the mockups.

**Architecture:** Extend the current production public contract and reuse its transactional mutations. Add a small recovery scheduler matching existing server schedulers. Build one portal feature with a shared task API, two queue tabs, a task drawer, and one page-level inspection modal.

**Tech Stack:** Node.js, Express, MongoDB, Jest; React 19, TypeScript, Ant Design, TanStack Query, Vitest.

## Global Constraints

- No new dependencies or generic abstractions.
- Backend owns authorization, state transitions, pagination, and QC eligibility.
- Use existing API client, portal components, status tokens, and i18n structure.
- Keep all changes uncommitted until final verification; create one final commit per repository.

---

### Task 1: Backend contract and recovery

**Files:** production validator/service tests; production validator/service; new vendor-handoff recovery scheduler; server lifecycle; Production API docs.

**Interfaces:** `PATCH /api/production/tasks/:taskId/qc` accepts `fileDecisions[]`; scheduler calls the existing `vendorSubmission.recheckReadyProductionTasks` public port.

- [ ] Add failing tests for enum filters, per-file rejection/pass, and scheduler overlap/disabled behavior.
- [ ] Run focused tests and confirm the expected failures.
- [ ] Implement enum validation, minimal per-file decision handling, and the scheduler.
- [ ] Run all Production and Vendor Submission tests.

### Task 2: Frontend API and route

**Files:** create `src/features/portal/production/api/*`; update router, navigation, and route tests.

**Interfaces:** list, summary, assign, claim, notes, upload, QC, export, and vendor retry use `/api/production` and `/api/vendor-submissions`.

- [ ] Add failing API and route tests.
- [ ] Implement typed API helpers, query keys, permission boundary, navigation, and lazy route.
- [ ] Run focused portal tests.

### Task 3: Scale and QC workbench

**Files:** create Production workbench page, drawer, image inspector, styles, and EN/VI translations.

**Interfaces:** Scale tab mutates assignment/files; QC tab submits `fileDecisions`; inspector receives safe media download URLs only.

- [ ] Add failing interaction tests for the two tabs and inspector controls.
- [ ] Implement the compact queues, task drawer, slot decisions, synchronized zoom/pan, and guarded actions.
- [ ] Run focused UI tests.

### Task 4: Verification and delivery

- [ ] Run backend Production/Vendor Submission suites.
- [ ] Run frontend portal tests, lint, and build.
- [ ] Run `git diff --check` in both repositories and inspect scope.
- [ ] Create one final commit in each repository after every check passes.

## Self-review

The plan covers every approved state and reuses the existing vendor idempotency contract. It intentionally defers overlay/difference rendering and avoids a new queue dependency.
