# Cross-Module Export Implementation Plan

## Phase 0 - Contract Setup

1. Add shared export module constants.
   - Define module ids, permission map, formats, statuses, and default TTL.
   - Keep module ids stable and lowercase.

2. Add API documentation.
   - Document `POST /api/export-jobs`.
   - Document `GET /api/export-jobs/:id`.
   - Document `GET /api/export-jobs`.

3. Add test fixtures.
   - Minimal account with read permission.
   - Minimal denied account.
   - Minimal media asset mock.

## Phase 1 - Backend Core

1. Create `exportJob` module skeleton in BE.
   - model
   - repository
   - service
   - controller
   - validator
   - dto
   - route
   - public port

2. Wire routes.
   - Mount `/api/export-jobs`.
   - Require authentication.
   - Authorize by export module permission in service.

3. Implement export job creation.
   - Validate module, format, filters, columns, timezone.
   - Persist `PENDING` job.
   - Return DTO.

4. Implement job status reads.
   - Users can read only their own jobs unless super/admin export permission is later added.
   - Return safe error fields only.

5. Implement worker runner.
   - Start with in-process worker or existing queue if already available.
   - Status transitions: `PENDING -> RUNNING -> READY|FAILED`.
   - Keep retry count minimal.

6. Implement CSV writer utility.
   - Escape values correctly.
   - Stream rows.
   - Write to temp file.
   - Upload/store through media module.

7. Implement media handoff.
   - Store CSV as private media asset.
   - Set original filename.
   - Attach `mediaAssetId` to job.

8. Tests.
   - create job validates payload.
   - create job rejects missing permission.
   - get job enforces ownership.
   - worker marks ready and stores media.
   - CSV escaping test.

## Phase 2 - Orders Export

1. Add orders export adapter.
   - Reuse existing order query logic.
   - Apply same filters as workbench.
   - Preserve scoped access.

2. Define default columns.
   - order id
   - marketplace order id
   - shop
   - channel
   - asin or listing id
   - sku
   - status
   - order date
   - customer
   - country
   - total
   - tracking

3. Add tests.
   - export uses filters.
   - export excludes inaccessible scoped rows.
   - export emits expected CSV headers and rows.

## Phase 3 - Frontend Shared Export

1. Add `src/features/export/api/exportJobsApi.ts`.
   - `createExportJob`
   - `getExportJob`
   - `listExportJobs`

2. Add shared export UI.
   - `ExportButton`
   - `ExportModal`
   - `useExportJobPolling`

3. UX behavior.
   - Click Export opens modal.
   - Submit creates job.
   - Toast says export is processing.
   - Poll until `READY` or `FAILED`.
   - Download uses `downloadMediaAsset`.

4. Wire Orders first.
   - Pass current filter state.
   - Pass default order columns.
   - Hide button without `ORDERS:READ`.

5. Tests.
   - modal submits current filters.
   - ready job shows download action.
   - failed job shows error toast.

## Phase 4 - Add Operational Modules

1. Production.
   - Reuse production task filters.
   - Export task status, scale status, qc status, blockers, assignee, vendor.

2. Design.
   - Reuse design task filters.
   - Export task type, status, assignee, channel, asin/listing id, dates.

3. Catalog.
   - Reuse listing filters.
   - Export qc status and effective PSD readiness.

4. Tests per adapter.
   - filter pass-through.
   - permission denial.
   - CSV row shape.

## Phase 5 - Add Reporting Modules

1. Finance.
   - Export finance daily and profit report views.
   - Keep money units explicit.

2. Reports.
   - One adapter per report view.
   - Export selected report, not the whole report workspace.

3. Customers.
   - Export list using customer filters.

4. Shipments and vendor submissions.
   - Export current workbench filters.

## Phase 6 - HR And Audit

1. HR exports.
   - Attendance.
   - Leave requests.
   - Overtime requests.
   - Payroll results.
   - Payroll adjustments.

2. Audit export.
   - Strict `AUDIT:READ`.
   - Always filter by requested date range.
   - Add max range guard if needed.

## Performance Rules

- Use cursor or stream for high-volume modules.
- Avoid `populate` in export loops; batch-load lookup maps.
- Export jobs should not block HTTP request threads.
- Use temp files and stream upload where possible.
- Add max concurrent export jobs per account.
- Add TTL cleanup for expired media files.

## Acceptance Criteria

- Orders export works end to end from FE.
- Export respects current filters.
- Export respects scoped permissions.
- Large exports do not timeout the browser request.
- Download uses existing authenticated media flow.
- CSV opens cleanly in Excel/Google Sheets.
- Failed jobs show a useful user-facing error.
- No module exports raw Mongo documents.
