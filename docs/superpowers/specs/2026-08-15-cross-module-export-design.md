# Cross-Module Export Design

## Goal

Provide one consistent export workflow for operational workbenches across FE and BE. Exports must use the same server-side filters the user is viewing, enforce read permissions, support large datasets without blocking requests, and return downloadable private media files.

## In Scope

- Orders
- Production
- Design
- Finance
- Reports
- Customers
- Shipments
- Vendor submissions
- Catalog
- HR
- Audit log

## Out Of Scope

- Chat export.
- Visual dashboard screenshot export.
- XLSX in phase 1.
- User-defined formulas or report builders.

## User Flow

1. User opens a module workbench.
2. User applies filters.
3. User clicks Export.
4. FE opens an export modal with:
   - Format: CSV in phase 1.
   - Scope: current filters.
   - Columns: default module columns, optionally editable later.
5. FE creates an export job.
6. BE returns an export job id.
7. FE shows a processing toast or notification.
8. FE polls the job.
9. When ready, FE shows Download.
10. User downloads through the existing authenticated media download helper.

## Backend Contract

### Create Export Job

`POST /api/export-jobs`

Request:

```json
{
  "module": "orders",
  "format": "csv",
  "filters": {
    "search": "J2605",
    "status": "READY"
  },
  "columns": ["orderId", "asin", "sku", "status"],
  "timezone": "Asia/Saigon"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "exportJobId",
    "module": "orders",
    "status": "PENDING",
    "format": "csv",
    "createdAt": "2026-08-15T00:00:00.000Z"
  }
}
```

### Get Export Job

`GET /api/export-jobs/:id`

Response:

```json
{
  "success": true,
  "data": {
    "id": "exportJobId",
    "module": "orders",
    "status": "READY",
    "format": "csv",
    "downloadUrl": "/api/media/assets/mediaAssetId/download",
    "filename": "orders-2026-08-15.csv",
    "rowCount": 1234,
    "createdAt": "2026-08-15T00:00:00.000Z",
    "completedAt": "2026-08-15T00:01:00.000Z"
  }
}
```

### List My Export Jobs

`GET /api/export-jobs?module=orders&limit=20`

Used for retrying downloads and showing recent exports.

## Backend Module

Add `src/modules/exportJob`.

Suggested files:

- `models/exportJob.model.js`
- `repositories/exportJob.repository.js`
- `services/exportJob.service.js`
- `services/exportJobWorker.service.js`
- `services/exportRegistry.js`
- `controllers/exportJob.controller.js`
- `validators/exportJob.validator.js`
- `dtos/exportJob.dto.js`
- `routes/index.js`
- `public.js`

## Export Job Model

Fields:

- `module`: string enum.
- `format`: `CSV` initially.
- `status`: `PENDING | RUNNING | READY | FAILED | EXPIRED`.
- `filters`: object.
- `columns`: string array.
- `timezone`: string.
- `requestedByAccountId`: ObjectId.
- `scopeHash`: string.
- `mediaAssetId`: ObjectId nullable.
- `filename`: string.
- `rowCount`: number.
- `errorCode`: string nullable.
- `errorMessage`: string nullable.
- `expiresAt`: Date.
- `startedAt`, `completedAt`, `createdAt`, `updatedAt`.

Indexes:

- `{ requestedByAccountId: 1, createdAt: -1 }`
- `{ module: 1, createdAt: -1 }`
- `{ status: 1, createdAt: 1 }`
- TTL on `expiresAt`.

## Permission Rules

Export uses READ permission only.

Module permission map:

- `orders`: `ORDERS:READ`
- `production`: `PRODUCTION:READ`
- `design`: `DESIGN:READ`
- `finance`: `FINANCE:READ`
- `reports`: `REPORTS:READ`
- `customers`: `ORDERS:READ` or future `CUSTOMERS:READ`
- `shipments`: `SHIPMENTS:READ`
- `vendorSubmissions`: `VENDOR_SUBMISSIONS:READ`
- `catalog`: `CATALOG:READ`
- `hrAttendance`: `HR_ATTENDANCE:READ`
- `hrPayroll`: `HR_PAYROLL:READ`
- `audit`: `AUDIT:READ`

Scoped permissions must be preserved. Export services must reuse each module's existing query service or public read contract instead of bypassing access constraints.

## Data Rules

- Export must run server-side from filters, not from currently loaded FE rows.
- Use lean or streaming queries.
- Do not load large datasets into memory.
- Cap phase 1 exports at a configured max row count unless worker streaming is ready.
- CSV values must be escaped according to RFC 4180.
- Dates must use requested timezone.
- Money values should export as minor units and formatted display columns only when explicitly requested.

## File Storage

- Generated files are private media assets.
- Download uses `/api/media/assets/:id/download`.
- Export files expire after 7 days by default.

## FE Contract

Shared pieces:

- `exportJobsApi.ts`
- `exportJobKeys.ts`
- `ExportButton`
- `ExportModal`
- `useExportJob`
- optional `ExportJobNotification`

FE request should pass:

- `module`
- `format`
- current server-side filters
- visible/default columns
- `timezone`

FE must not export from current table rows except for tiny debug-only local exports, which are out of scope.

## Initial Module Column Sets

Orders:

- order id
- marketplace order id
- shop
- sales channel
- asin or listing id
- sku
- status
- order date
- customer
- country
- total
- tracking

Production:

- task id
- order id
- asin or listing id
- sku
- status
- scale status
- qc status
- assigned designer
- blockers
- vendor
- created at

Design:

- task id
- channel
- asin or listing id
- sku
- task type
- status
- assigned designer
- due date
- created at

Finance:

- date
- shop
- channel
- order id
- sku
- revenue
- cost
- fees
- profit
- margin

Reports:

- export per selected report view.

Customers:

- customer
- lifecycle
- care status
- order count
- revenue
- last order
- country
- shop

Catalog:

- channel
- asin or listing id
- sku
- shop
- qc status
- psd status
- source
- created at

HR:

- attendance rows
- leave requests
- overtime requests
- payroll results
- adjustments

Audit:

- timestamp
- actor
- action
- entity type
- entity id
- outcome
- source

## Failure Handling

- Invalid module or columns: `VALIDATION_ERROR`.
- Missing permission: `AUTHORIZATION_ERROR`.
- Too many rows for sync export: create async job or return `EXPORT_TOO_LARGE`.
- Worker failure: mark job `FAILED` with a short safe message.
- Expired file: mark job `EXPIRED`, user can create a new export.

## Phasing

Phase 1:

- Shared export job BE module.
- CSV only.
- Async job only.
- Orders export.
- FE shared modal/button.

Phase 2:

- Production, Design, Catalog.
- Job list and download retry.

Phase 3:

- Finance, Reports, Customers, Shipments, Vendor submissions.

Phase 4:

- HR and Audit.
- Optional XLSX.
- Optional scheduled exports.
