# PSD File Workspace

## Goal

Give Design operators one read-only, permission-scoped workspace for the PSD files linked to PSD template tasks, without duplicating task review or fabricating previews.

## Scope

### Backend contract

- Extend the shared Design workspace asset DTO used by `GET /api/design/psd-files` with `downloadUrl`.
- Set that value from the same Media download route already returned by Design task asset DTOs: `/api/media/assets/:assetId/download`.
- Preserve the existing flattened file row shape and server-side query/scope behavior.
- Do not add a second download endpoint, public asset URL, mutation, or client-computed media URL.

### Frontend workspace

- Add the permission-guarded route `/portal/design/files` under the existing Design permission set.
- Add a compact `PSD files` entry point from the Design workbench; do not add a second sidebar group.
- Fetch `GET /api/design/psd-files` through the shared API client and a Design query key.
- Show server-paginated rows with file name/type/size, role, listing code/title, task status, designer name, submission version, and linked time.
- Search by the backend-supported `search` field; filter by role, designer, task status, and linked-date range.
- Use the returned `downloadUrl` for accessible `Open` and `Download` actions. The browser decides whether a file opens or downloads.
- Render an image thumbnail only when the returned MIME type is an image. PSD, ZIP, and unknown types show a file icon/name instead of a fake preview.

## Permissions

- FE uses the same Design route guard as the existing workbench: `DESIGN:READ`, `DESIGN:WRITE`, `DESIGN:WORK`, or `DESIGN:REVIEW`.
- The backend remains authoritative for global, shop, and assigned-task scope. FE does not filter or infer scope locally.

## State and interaction

- Keep filters and page state in the PSD workspace only; do not couple them to the task queue.
- Resolve the designer display from the endpoint's `designer.name`; show `Unassigned` only when it is null.
- Role and task-status cells use the existing status color treatment.
- The Design workbench entry point is navigation only, so it cannot open a task drawer or action modal.

## Error handling

- Use the existing shared page feedback for list failures and retain filters for retry.
- Disabled/missing download links are rendered as unavailable, not as a client-side constructed URL.
- No client conversion, preview generation, or upload is attempted for unsupported binary formats.

## Verification

- BE contract tests assert the PSD list includes the exact asset download route while preserving existing query and scope behavior.
- FE API tests assert request query compaction and response typing.
- Component tests cover filters, image versus binary rendering, download action, permission entry point, pagination, and unavailable files.
- Keep route tests routing-only; add a dedicated PSD workspace component test.
- Run focused FE tests, `npm run lint`, `npm run build`, and relevant BE Design tests against test infrastructure.

## Out of scope

- Uploading, deleting, relinking, approving, or reviewing PSD files.
- A browser-based PSD editor or generated PSD preview.
- Changing submission scoring or task workflow.
