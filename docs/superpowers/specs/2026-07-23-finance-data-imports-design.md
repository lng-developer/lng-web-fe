# Finance Data Imports Design

## Goal

Give Finance operators one read-only workbench to import and control Amazon Ads, Settlement, and Transaction source data. Operators can inspect batches, filter normalized rows, view import errors, and reprocess failed batches. They cannot edit or delete financial rows.

## Scope

- Add one `Finance Data Imports` page under `Finance & Reporting`.
- Support the existing Amazon file formats: Ads CSV, Settlement TXT, and Transaction CSV.
- Keep Finance snapshots and Reports as the calculation and analysis surfaces.
- Enforce `FINANCE:READ` for browsing and `FINANCE:WRITE` for import or reprocess.

## Page

The page has three parts:

1. **Source summary**: Ads, Settlements, and Transactions cards show the latest batch status, imported-row count, error count, and an Import button.
2. **Import batches**: the default table lists file name, source type, shop, marketplace, imported by, imported at, status, rows, and errors. Filters are source type, shop, marketplace, date range, and status. Failed or partial batches expose `Reprocess`.
3. **Imported data**: a read-only source-specific table selected by `Ads`, `Settlements`, or `Transactions`. It shares shop, marketplace, date, and status filters. A row opens a detail drawer; it never exposes edit or delete actions.

The import modal always collects `file`, `shopId`, `salesChannelCode`, and `marketplaceCode`. `sourceRef` defaults to the uploaded file name. Imports persist directly; dry-run is not a normal UI workflow.

## Backend contract

The existing endpoints remain unchanged:

- `POST /api/finance/imports/ads`
- `POST /api/finance/imports/settlements`
- `POST /api/finance/imports/transactions`

Add a finance-owned `FinanceImportBatch` record and attach its `batchId` to each normalized source row. A batch stores source type, original file name, scope, importer, status (`PROCESSING`, `COMPLETED`, `PARTIAL_FAILED`, `FAILED`), row counts, error summary, timestamps, and the original import parameters.

Add these read/retry APIs:

- `GET /api/finance/import-batches`
- `GET /api/finance/import-batches/:batchId`
- `POST /api/finance/import-batches/:batchId/reprocess`
- `GET /api/finance/imported-data/ads`
- `GET /api/finance/imported-data/settlements`
- `GET /api/finance/imported-data/transactions`

List APIs paginate and accept the UI filters. Reprocess creates a new batch from the saved source reference only when the source file remains available; otherwise return a clear `SOURCE_FILE_UNAVAILABLE` error. No direct row mutation API is added.

## Data behavior

The supplied files already parse with the existing finance parser:

- Ads CSV: 8,470 rows.
- Settlement TXT: 315 rows.
- Transaction CSV: 1,354 rows.

Idempotent business keys continue to protect normalized rows. A reprocess therefore records a new attempt while upserting the same financial source records instead of duplicating them.

## Errors and access

- Import validation failures create a failed batch with a useful error summary when a batch can be created safely.
- Per-row failures yield `PARTIAL_FAILED` and are available from the batch detail.
- The API validates scope and permissions before exposing batches or imported rows.
- Batch lists show empty, loading, and failure states; failed batches remain visible for recovery.

## Verification

- Backend parser/service/route tests cover batch creation, source filtering, access control, and idempotent reprocess.
- Frontend tests cover navigation, filters, batch-state actions, and read-only detail behavior.
- Run targeted backend tests plus FE lint and build.
