# Portal Integration Workbench Design

## Goal

Provide one operational workspace for uploading external order reports, monitoring import jobs, inspecting raw records, resolving import issues, and safely retrying failed jobs.

## Scope And Permission

- Route: `/portal/integrations`
- This phase covers External Order Import only.
- Read operations require `ORDERS:READ` or `ORDERS:WRITE` according to the current backend contract.
- Upload, retry, resolve, and ignore operations require `ORDERS:WRITE`.
- Do not use the currently seeded `INTEGRATION:*` permissions until backend routes adopt them through a separate authorization migration.

## Workbench Layout

The workspace stays on one route and contains:

1. A filter and upload toolbar.
2. A paginated import-job table.
3. A right context panel for the selected job.
4. A global issue queue beneath the job table.

Toolbar controls:

- Authorized shop selector
- Source selector
- Job status filter
- Shared DateRangePicker
- Upload action

Persist safe filters and the selected job id in the URL. Opening the context panel must not navigate away from the workbench.

## Upload Flow

Use the shared upload foundation with a 10 MB client limit matching the server. The form requires:

- Source/import format
- `shopId`
- `marketplaceCode`
- File
- Optional `shopConnectionId` and `externalAccountId`

Supported entry points in this phase:

- `POST /api/integration/external-order-imports/manual-excel`
- `POST /api/integration/external-order-imports/etsy-sold-order-items`

The UI sends multipart form data and never converts normal uploads to database-backed base64 fields. Client validation checks required metadata, extension/type, and size; the backend remains authoritative for report contents.

## Job Table

Columns:

- Created time
- Shop
- Source and marketplace
- File name when available
- Job status
- Imported, skipped, and failed counts
- Post-import progress derived from `summary.postImport`
- Icon actions

Job statuses use semantic colors for pending, processing, completed, partial failure, failure, and cancellation. `COMPLETED` describes order import completion, not downstream mapping or production completion.

## Selected Job Panel

The panel shows summary and progress first, followed by issue and raw-record sections without route-level tabs.

- Summary: timestamps, trigger account, counts, source identifiers, error, and post-import state.
- Issues: severity, type, affected order/item/row, message, status, resolution actor/time, and note.
- Raw records: normalize, import, and post-import states plus linked order and item identifiers.
- Retry is enabled only for a retryable job and requires confirmation.

Issue detail may expose structured diagnostic fields but must not render arbitrary HTML from external input.

## Global Issue Queue

The queue filters by shop, source, severity, status, issue type, external order id, and external item id. Write-authorized users can:

- Mark an open issue `RESOLVED` with a required resolution note.
- Mark an open issue `IGNORED` with a required reason.

Resolved or ignored issues remain queryable for audit history.

## Required Backend Additions

### List import jobs

Add `GET /api/integration/external-order-imports` with:

- Filters: `shopId`, `source`, `status`, `dateFrom`, `dateTo`
- Pagination: `page`, `limit` with the existing maximum of 100
- Scope filtering based on readable shop ids in the effective auth context
- Response: existing import-job DTO items plus pagination

### Resolve or ignore an issue

Add `PATCH /api/integration/external-order-imports/issues/:issueId` with:

```json
{
  "status": "RESOLVED",
  "note": "Corrected the source row and re-imported the order"
}
```

Rules:

- Status accepts only `RESOLVED` or `IGNORED`.
- Note is required and trimmed.
- Only an `OPEN` issue may transition.
- Add `resolutionNote` as a trimmed nullable field on `ExternalOrderImportIssue`; existing records remain valid with `null`.
- The service writes `resolvedBy`, `resolvedAt`, `status`, and `resolutionNote` atomically.
- Read and write authorization is constrained to the issue's job shop.
- Return the existing issue DTO extended with `resolutionNote`.

## Query And Refresh Behavior

- Do not poll completed or terminal jobs.
- Poll only the selected active job at a bounded interval while its status is pending, parsing, or importing.
- Pause polling when the page is hidden.
- A job mutation invalidates its detail, the job list, and affected issue queries only.
- Scrolling tables or panels never triggers a refetch unless pagination explicitly reaches the next server page.

## States And Feedback

- Workbench and panel use independent skeletons.
- List failures remain inline with Retry.
- Upload and retry failures use actionable product error toasts.
- Partial failures keep the job visible and link directly to its filtered issues.
- Empty queues distinguish no jobs, no issues, and no filter matches.
- Dirty resolution forms warn before close.

## Verification

Backend:

- Route, validation, service, repository, authorization-scope, transition, and DTO tests for both new endpoints.
- Tests prove users cannot list jobs or mutate issues outside readable shop scopes.

Frontend:

- API tests for upload, list, detail, issues, raw records, retry, and issue resolution.
- Component tests for URL filters, source-specific upload, selected-job panel, terminal polling stop, hidden-page polling pause, retry confirmation, and resolution validation.
- Verify no request spam occurs during scroll or rerender.

## Out Of Scope

- OAuth marketplace connection setup, webhook management, or automated scheduled imports
- SQL Attendance
- Editing raw records in place
- Deleting jobs or issues
- Vendor credentials and Vendor Submission
