# Catalog and Design Core Recovery

## Goal

Complete the operator recovery path from a Catalog listing that lacks a PSD through Design task creation, assignment, submission, review, cancellation, and Production recheck visibility.

## Scope

### Catalog manual PSD upload

- Add an upload action to a listing that the current account may write.
- Call `POST /api/catalog/listings/:id/psd-template` directly with multipart form data.
- Accept the backend listing response as authoritative for PSD readiness.
- Show successful upload even when optional post-actions return warnings; surface those warnings separately.
- Refresh Catalog list, detail, summary, and Design task queries after success.

### Design queue creation

- Add a candidate drawer backed by `GET /api/design/tasks/psd-template/candidates`.
- Allow `DESIGN:WRITE` users to create/get one PSD task with `POST /api/design/tasks/from-listings/:listingId/psd-template`.
- Allow explicit multi-selection and idempotent bulk creation through `POST /api/design/tasks/bulk-create-psd-from-listings`.
- Display per-listing `CREATED`, `EXISTING`, `SKIPPED`, or failure results returned by the backend.
- Do not recreate candidate filtering or idempotency rules in the frontend.

### Workload and summary

- Use `GET /api/design/tasks/summary` for queue status/type totals.
- Use `GET /api/design/tasks/workload` for unassigned and per-designer active workload.
- Apply the same supported filters as the queue where their backend contracts overlap.
- Keep the current task table as the primary workspace; metrics and workload are supporting context.

### Submission history and cancellation

- Load `GET /api/design/tasks/:taskId/submissions` only when the task detail drawer is open.
- Render every version with status, files, note, rejection reason, and approval selection.
- Add `PATCH /api/design/tasks/:taskId/cancel` for `DESIGN:WRITE` users when the task is not already terminal.
- Require a non-empty cancellation reason and confirmation.
- Do not expose submission removal because the backend does not currently recalculate task status or clear latest-submission fields after removal.

## Permissions

- Listing PSD upload follows existing Catalog write scope; the backend remains authoritative.
- Candidate reads follow any Design read/work/review/write permission.
- Task creation, bulk creation, and cancellation require `DESIGN:WRITE`.
- UI controls are hidden when unavailable, while backend authorization remains mandatory.

## State and interaction

- Table quick actions remain icon-only with Tooltip and accessible labels.
- Opening an action modal must not also open the detail drawer.
- Candidate, workload, submission-history, and cancellation state remain separate from selected task detail state.
- Mutations disable only the affected action and cannot be submitted twice while pending.

## Error handling

- Page-level read failures use the shared inline feedback component.
- Mutation failures use the shared error toast and keep entered data available for retry.
- Bulk results remain visible until the operator closes or refreshes the candidate drawer.
- Catalog upload post-action warnings are not converted into a failed upload.

## Verification

- API unit tests cover every newly used endpoint and request shape.
- Component tests cover permissions, action/modal isolation, candidate selection, single/bulk results, warnings, cancellation reason, and submission versions.
- Existing route tests remain routing-only.
- Run FE lint, unit tests, UI tests, and production build.
- Run the relevant BE Catalog, Design, Production, Media, and architecture suites against test infrastructure; do not mutate the configured development database.

## Deferred

- Generic `IDEA`, `CLONE`, `MOCKUP`, and `PNG_ASSET` task creation.
- PSD File workspace.
- Submission score UI and backend Shop-scope correction.
- Submission removal UI.
