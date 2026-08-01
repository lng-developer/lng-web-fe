# Production and QC Workbench Design

## Goal

Provide an operational Scale and QC workflow from production-task readiness through recoverable vendor handoff.

## Decisions

- One `/portal/production` route owns two tabs: Scale queue and QC queue.
- Backend remains the source of truth for pagination, filters, task state, permissions, and QC eligibility.
- Scale operators can assign or claim tasks, maintain notes, and upload or replace each required scaled output.
- QC operators inspect original and scaled assets in one full-screen modal with side-by-side, synchronized zoom/pan, fit/reset, and download controls.
- QC decisions are recorded per file check. Any rejected required slot returns the task to `QC_REJECTED`; all required slots must pass before the task becomes `READY_TO_SEND_VENDOR`.
- Passing QC triggers the existing idempotent vendor-submission handoff. A lightweight server scheduler rechecks ready tasks after transient failures; QC approval is retained.
- Existing permissions are reused: `PRODUCTION:READ`, `PRODUCTION:WRITE`, `DESIGN:WORK`, and `DESIGN:REVIEW`. No role names are hardcoded.
- All visible copy is available in Vietnamese and English.

## Non-goals

- No new dependency, job queue, image editor, automatic pixel-difference engine, or asset mutation.
- Overlay and Difference modes are deferred; V1 ships side-by-side synchronized inspection.
- No refactor of the existing production service unrelated to this workflow.

## Failure behavior

- Concurrent mutations return the existing conflict response and the FE refreshes the task.
- Missing required outputs prevent QC pass.
- Rejection requires a reason and notifies the assigned scale operator.
- Vendor handoff failure leaves the task ready, exposes the failure through the attached submission, and is retried idempotently.

## Verification

- Backend production, scheduler, route, validator, concurrency, and audit tests.
- Frontend API, route, permission, Scale/QC interaction, and image-inspector tests.
- Frontend lint and production build.
