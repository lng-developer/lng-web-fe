# Backend PR-Aligned Frontend Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the existing and missing FE work against BE PRs EC-167 through EC-172 as small, independently reviewable PRs.

**Architecture:** FE reads the backend DTOs through `src/services/endpoints.js` and feature-local TanStack Query hooks. The backend is authoritative for order `workflow`; FE renders its stage, blockers, and permitted actions without reimplementing priority rules. HR remains an independent module because it has no dependency on the POD fulfillment flow.

**Tech Stack:** React, TanStack Query, Axios, existing MUI/Tailwind operations components, Node test runner, Vite.

## Global Constraints

- Work from the FE `develop` base after the current dirty `new` worktree has been audited and split; do not overwrite or discard it.
- Reuse `src/services/endpoints.js`, `api/*.queries.js`, `api/*.mutations.js`, feature-local mappers, and existing Operations UI primitives.
- Gate routes and mutations with backend permission codes; do not infer access from role names.
- Use backend `workflow.stage`, `workflow.blockers`, and `workflow.nextActions`; keep a compatibility fallback only for partial responses.
- Add no dependency and do not create a generic API-workflow screen for the operational UI.

---

### Task 1: Freeze and partition the current FE worktree

**Files:**

- Inspect: `src/services/endpoints.js`, `src/routes/index.jsx`, `src/layouts/sidebarNavigation.js`
- Inspect: every modified and untracked file from `git status --short`.

**Produces:** a reviewed file-to-PR map; no product code change.

- [ ] Run `git -C C:\Users\stack\Task\lng-web-fe status --short --branch` and `git -C C:\Users\stack\Task\lng-web-fe diff --stat`.
- [ ] Assign each file to exactly one PR below; put shared endpoint, route, navigation, translation, and operation-shell changes in the smallest prerequisite PR that actually needs them.
- [ ] Reject unrelated visual refactors from this rollout instead of mixing them into an API-alignment PR.
- [ ] Verify each proposed PR with `git diff --check` before staging it.

### Task 2: EC-167 FE design submission scoring

**Branch:** `EC-167-fe-design-submission-scoring`

**Files:**

- Modify: `src/services/endpoints.js`
- Modify: `src/features/design-tasks/api/designTasks.keys.js`
- Modify: `src/features/design-tasks/api/designTasks.queries.js`
- Modify: `src/features/design-tasks/api/designTasks.mutations.js`
- Modify: `src/features/design-tasks/pages/DesignTasksPage.jsx`
- Create: `src/features/design-tasks/components/DesignScoreSummary.jsx`
- Create: `src/features/design-tasks/components/SubmissionScoreEditor.jsx`
- Test: `src/features/design-tasks/utils/designTasksApi.test.js`

**Consumes:** `GET /api/design/score-summary`, `PATCH /api/design/submission-scores/:scoreId/override`, and `PATCH /api/design/tasks/:taskId/submissions/:submissionId/score/void`.

**Produces:** score summary and review-only override/void controls in the existing Design Tasks surface.

- [ ] Assert the mapper preserves `finalPoints`, `scoreLevel`, `status`, and override metadata from the API response.
- [ ] Assert users without `DESIGN:REVIEW` or `DESIGN:WRITE` cannot open score override or void controls.
- [ ] Invalidate task detail, submissions, and score-summary query keys after a successful override or void.
- [ ] Run `npm test -- --runInBand src/features/design-tasks` and `npm run build`.
- [ ] Commit with `feat(design): add submission scoring controls`.

### Task 3: EC-169 FE order workflow readiness

**Branch:** `EC-169-fe-order-workflow-readiness`

**Files:**

- Modify: `src/features/orders/utils/ordersApi.js`
- Modify: `src/features/orders/pages/OrdersPage.jsx`
- Modify: `src/features/orders/api/orders.queries.js`
- Test: `src/features/orders/utils/ordersApi.test.js`
- Test: `src/features/orders/utils/ordersPageComposition.test.js`

**Consumes:** `GET /api/orders/workbench`, item readiness/timeline endpoints, and the backend workflow payload `{ stage, owner, blockers, nextActions }`.

**Produces:** workbench/detail status driven by the backend, with links/actions only for backend-provided next actions.

- [ ] Add mapper assertions for `NEED_MAPPING`, `NEED_PSD`, `READY_FOR_SCALE`, `QC_PENDING`, `READY_TO_SEND_VENDOR`, `TRACKING_PENDING`, and terminal stages.
- [ ] Assert a backend workflow stage overrides stale item, mapping, and listing values.
- [ ] Keep legacy fallback only when `workflow` is absent; do not add FE workflow priority logic.
- [ ] Run `npm test -- --runInBand src/features/orders` and `npm run build`.
- [ ] Commit with `feat(orders): render backend workflow readiness`.

### Task 4: EC-170 FE mapping recovery

**Branch:** `EC-170-fe-import-mapping-recovery`

**Files:**

- Modify: `src/services/endpoints.js`
- Modify: `src/features/mapping/api/mapping.keys.js`
- Modify: `src/features/mapping/api/mapping.mutations.js`
- Modify: `src/features/mapping/pages/MappingPage.jsx`
- Test: `src/features/mapping/api/mapping.mutations.test.js`
- Test: `src/features/mapping/pages/MappingPage.test.js`

**Consumes:** `POST /api/mapping/recheck-unmatched` and the mapping workbench/summary responses.

**Produces:** a permission-gated recheck action with deterministic query invalidation and result feedback.

- [ ] Assert `MAPPING:WRITE` is required to show and execute recheck.
- [ ] After success invalidate mapping workbench, mapping summary, and order workbench keys.
- [ ] Preserve existing rule-management screens; do not add a second recovery dashboard.
- [ ] Run `npm test -- --runInBand src/features/mapping` and `npm run build`.
- [ ] Commit with `feat(mapping): add unmatched recovery action`.

### Task 5: EC-171 FE production and vendor submission handoff

**Branch:** `EC-171-fe-production-vendor-submission-flow`

**Files:**

- Modify: `src/services/endpoints.js`
- Modify: `src/features/production/api/production.queries.js`
- Modify: `src/features/production/api/production.mutations.js`
- Create or modify: `src/features/vendor-submissions/api/vendorSubmissions.keys.js`
- Create or modify: `src/features/vendor-submissions/api/vendorSubmissions.queries.js`
- Create or modify: `src/features/vendor-submissions/api/vendorSubmissions.mutations.js`
- Create or modify: `src/features/vendor-submissions/pages/VendorSubmissionsPage.jsx`
- Test: `src/features/vendor-submissions/utils/vendorSubmissionsApi.test.js`

**Consumes:** production task `workflow`, vendor submission list/detail/payload preview, create-from-task, submit, retry, fail, and cancel endpoints.

**Produces:** one operational vendor-submission screen, with actions limited by `VENDOR_SUBMISSIONS:WRITE` and state returned by BE.

- [ ] Assert payload previews never display unsafe credentials or local paths.
- [ ] Assert submit/retry/fail/cancel invalidate the vendor submission, related production task, and order workbench keys.
- [ ] Render failure and cancellation reasons returned by the backend; do not invent client status transitions.
- [ ] Run `npm test -- --runInBand src/features/production src/features/vendor-submissions` and `npm run build`.
- [ ] Commit with `feat(vendor-submissions): wire production handoff`.

### Task 6: EC-172 FE shipment and operational support fields

**Branch:** `EC-172-fe-fulfillment-support-fields`

**Files:**

- Modify: `src/services/endpoints.js`
- Create or modify: `src/features/shipments/api/shipments.keys.js`
- Create or modify: `src/features/shipments/api/shipments.queries.js`
- Create or modify: `src/features/shipments/api/shipments.mutations.js`
- Create or modify: `src/features/shipments/pages/ShippingPage.jsx`
- Test: `src/features/shipments/utils/shipmentsApi.test.js`

**Consumes:** shipment list/detail, update tracking/status, recheck, webhook-log endpoints and the added catalog/vendor/shop display fields.

**Produces:** shipment worklist showing vendor/order context and the BE tracking state.

- [ ] Assert tracking mutations require shipment write permission and invalidate shipment, vendor submission, production, and order workbench keys.
- [ ] Show webhook logs as read-only operational evidence, not a manual retry control.
- [ ] Keep catalog/vendor/shop support fields additive in existing tables and dialogs; do not redesign those modules.
- [ ] Run `npm test -- --runInBand src/features/shipments` and `npm run build`.
- [ ] Commit with `feat(shipments): add fulfillment support fields`.

### Task 7: EC-168 FE HR core, separately from POD operations

**Branches:** `EC-168-fe-hr-profile-schedule`, `EC-168-fe-hr-attendance`, `EC-168-fe-hr-leave-overtime`

**Files:**

- Create: `src/features/hr/api/hr.keys.js`, `src/features/hr/api/hr.queries.js`, `src/features/hr/api/hr.mutations.js`
- Create: `src/features/hr/pages/EmployeeProfilesPage.jsx`, `src/features/hr/pages/AttendancePage.jsx`, `src/features/hr/pages/LeaveOvertimePage.jsx`
- Modify: `src/services/endpoints.js`, `src/routes/index.jsx`, `src/layouts/sidebarNavigation.js`, `src/i18n/locales/en/common.json`, `src/i18n/locales/vi/common.json`
- Test: feature-local mapper, permissions, and page-composition tests.

**Consumes:** `/api/hr/employee-profiles`, schedule, attendance, leave, and overtime routes from EC-168.

**Produces:** three deployable HR slices with permissions matching the backend: profile/schedule admin, attendance self-service/admin, then leave/overtime request and approval.

- [ ] Ship profile and schedule screens first; require `HR:EMPLOYEE:READ/WRITE` and `HR:SCHEDULE:READ/WRITE` equivalents exposed by the authenticated permission list.
- [ ] Ship attendance next; expose check-in/out to `HR:ATTENDANCE:WRITE` and adjustment only to `HR:ATTENDANCE:MANAGE`.
- [ ] Ship leave and overtime last; separate requester actions from approve/reject actions, and invalidate balances after approval/cancellation.
- [ ] Run each feature's focused tests and `npm run build` per PR.
- [ ] Use commits `feat(hr): add profile and schedule screens`, `feat(hr): add attendance workspace`, and `feat(hr): add leave and overtime workflows`.

### Task 8: Integration and merge order

**Order:** EC-167, EC-169, EC-170, EC-171, EC-172; HR branches may run in parallel after shared navigation ownership is agreed.

- [ ] Create each PR against FE `develop` and rebase immediately before review.
- [ ] Require a backend-contract smoke pass against `VITE_API_BASE_URL=http://localhost:3000` with the BE on current `develop`.
- [ ] Run `npm run build` and only the feature-local test set for each PR; run the full FE suite once after the final merge.
- [ ] Merge one PR at a time in the stated order and delete its remote branch only after `develop` contains the merge commit.
