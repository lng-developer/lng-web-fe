# Finance Data Imports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` task-by-task.

**Goal:** Deliver one read-only workbench for Ads, Settlement, and Transaction imports, their batches, normalized data, and batch recovery.

**Architecture:** The finance module owns import batches and source-data reads. Source files are stored with the existing media public port, so reprocessing creates a new batch from the immutable original input. The React workbench uses the shared API client and existing MUI table/toolbar patterns.

**Tech Stack:** Express, Mongoose, Jest, React, MUI, TanStack Query.

## Constraints

- Source rows are view/filter only. No update/delete API or UI.
- Reads require `FINANCE:READ`; upload/reprocess require `FINANCE:WRITE`.
- Reuse `src/modules/media/public.js`; add no storage dependency.
- Keep existing idempotent record keys.
- Acceptance fixtures are the supplied Amazon Ads CSV (8,470 rows), Settlement TXT (315 rows), and Transaction CSV (1,354 rows).

## File map

**BE `C:\lng_system\lng-web\lng-web-be`:** create `src/modules/finance/models/financeImportBatch.model.js`; modify finance source models, repository, import service, controller, routes, validator, API doc, and tests under `src/test/finance`.

**FE `C:\lng_system\lng-web\lng-web-fe`:** create `src/features/finance-imports/{api,pages}`; modify `src/services/endpoints.js`, `src/routes/index.jsx`, `src/layouts/sidebarNavigation.js`, and locale files.

---

### Task 1: Parse transaction files through the robust parser

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\services\financeImport.service.js`
- Test: `C:\lng_system\lng-web\lng-web-be\src\test\finance\services\financeImport.service.test.js`

**Produces:** `importTransactionsFromFile`, `importSettlementsFromFile`, and `importAdsFromFile` delegate to their existing full-text import functions.

- [ ] Write a failing test using a transaction header containing quoted line breaks and assert `externalOrderId: '114-5923330-5214637'` and `sku: 'J2528-NK-050126-609'` reach `upsertLedgerLine`.
- [ ] Run: `npm test -- --runInBand src/test/finance/services/financeImport.service.test.js -t "multi-line transaction header"`. Expected: FAIL.
- [ ] Replace each line-reader implementation with the minimal delegation:

```js
async function importTransactionsFromFile(filePath, rawContext = {}, authContext) {
  return importTransactions(await fs.promises.readFile(filePath, 'utf8'), rawContext, authContext)
}
```

- [ ] Run: `npm test -- --runInBand src/test/finance/services/financeImport.service.test.js`. Expected: PASS.
- [ ] Commit: `git commit -m "fix(finance): parse multiline transaction imports"`.

### Task 2: Persist imports as replayable batches

**Files:**

- Create: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\models\financeImportBatch.model.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\models\adsSpendDaily.model.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\models\marketplaceSettlement.model.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\models\marketplaceSettlementLedgerLine.model.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\models\marketplaceFeeLine.model.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\models\refundRecord.model.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\repositories\financeImport.repository.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\services\financeImport.service.js`
- Test: `C:\lng_system\lng-web\lng-web-be\src\test\finance\services\financeImport.service.test.js`

**Produces:** `FinanceImportBatch` with `sourceType`, `originalFilename`, `sourceAssetId`, scope, importer, lifecycle state, counts, errors, and timestamps. Every normalized source record has nullable `importBatchId`.

- [ ] Write failing tests that expect `createImportBatch({ sourceType: 'TRANSACTIONS', status: 'PROCESSING' })`, `completeImportBatch(batchId, summary)`, and a retry that calls `mediaPublic.withAssetLocalReadFile`.
- [ ] Run: `npm test -- --runInBand src/test/finance/services/financeImport.service.test.js -t "batch"`. Expected: FAIL.
- [ ] Store the multer file through `mediaPublic.storeAsset`, create a processing batch, pass `importBatchId` into all source upserts, and finalize `COMPLETED`, `PARTIAL_FAILED`, or `FAILED`. Retry must create a new batch from `sourceAssetId`, never mutate the original batch.
- [ ] Run: `npm test -- --runInBand src/test/finance/models/financeSourceModels.test.js src/test/finance/services/financeImport.service.test.js`. Expected: PASS.
- [ ] Commit: `git commit -m "feat(finance): persist import batches"`.

### Task 3: Publish read-only batch and source-data contracts

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\repositories\financeImport.repository.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\controllers\financeImport.controller.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\routes\index.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\finance\validators\financeSnapshot.validator.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\docs\finance\FINANCE_API.md`
- Test: `C:\lng_system\lng-web\lng-web-be\src\test\finance\routes\index.test.js`

**Produces:** `GET /import-batches`, `GET /import-batches/:batchId`, `POST /import-batches/:batchId/reprocess`, and `GET /imported-data/:sourceType` under `/api/finance`.

- [ ] Write failing route tests for pagination, `FINANCE:READ` on GET, `FINANCE:WRITE` on retry, and rejection of an invalid source type.
- [ ] Run: `npm test -- --runInBand src/test/finance/routes/index.test.js`. Expected: FAIL.
- [ ] Add validated filters: `sourceType`, `shopId`, `salesChannelCode`, `marketplaceCode`, `status`, `dateFrom`, `dateTo`, `page`, and `limit`. Source type is only `ads`, `settlements`, or `transactions`; response is `{ items, total, page, limit }` with no mutation fields.
- [ ] Update `docs/finance/FINANCE_API.md`, then run the same route test. Expected: PASS.
- [ ] Commit: `git commit -m "feat(finance): expose import batch APIs"`.

### Task 4: Implement the Finance Data Imports workbench

**Files:**

- Create: `src/features/finance-imports/api/financeImports.keys.js`
- Create: `src/features/finance-imports/api/financeImports.queries.js`
- Create: `src/features/finance-imports/pages/FinanceDataImportsPage.jsx`
- Modify: `src/services/endpoints.js`
- Modify: `src/routes/index.jsx`
- Modify: `src/layouts/sidebarNavigation.js`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`
- Test: `src/features/finance-imports/pages/financeDataImportsPage.test.jsx`

**Produces:** `ROUTES.PORTAL_FINANCE_IMPORTS`, sidebar leaf `Finance Data Imports`, and a `FINANCE:READ` route.

- [ ] Write a failing page test asserting the heading, Ads/Settlements/Transactions summaries, batch table, and that no Edit/Delete button is rendered.
- [ ] Run: `node --test src/features/finance-imports/pages/financeDataImportsPage.test.jsx`. Expected: FAIL.
- [ ] Use existing MUI toolbar/table patterns for summary cards, batch filters, batch table, import modal, source tabs, and detail drawer. `Reprocess` renders only for `FAILED` and `PARTIAL_FAILED`; import calls the existing three POST endpoints with scope fields.
- [ ] Run: `node --test src/features/finance-imports/pages/financeDataImportsPage.test.jsx; npm run lint`. Expected: PASS.
- [ ] Commit: `git commit -m "feat(finance): add data imports workbench"`.

### Task 5: Validate actual files and the end-to-end recovery path

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-be\src\test\e2e\financeImportSnapshotFlow.e2e.test.js`
- Test: `src/features/finance-imports/pages/financeDataImportsPage.test.jsx`

- [ ] Add a focused flow asserting batch list contains `ADS`, `SETTLEMENTS`, and `TRANSACTIONS` with `COMPLETED`, and a failed fixture creates a new retry batch.
- [ ] Run: `npm test -- --runInBand src/test/finance/services/financeImport.service.test.js src/test/finance/routes/index.test.js src/test/e2e/financeImportSnapshotFlow.e2e.test.js`. Expected: PASS.
- [ ] Run FE verification: `npm run lint; npm run build`. Expected: PASS.
- [ ] Test in authenticated Chrome: upload each supplied file with Amazon scope, filter source data, open details, and confirm only failed/partial batches show Reprocess.
- [ ] Commit any final tests: `git commit -m "test(finance): cover imports workbench flow"`.

## Self-review

- Backend gap found during planning: the current streaming transaction file path splits the real CSV's multi-line quoted header; Task 1 fixes the shared import path before batch work.
- Every spec requirement maps to Tasks 2-5; no row mutation or new dependency is planned.
- API names, `sourceType`, `importBatchId`, batch statuses, and finance permissions are consistent across tasks.
