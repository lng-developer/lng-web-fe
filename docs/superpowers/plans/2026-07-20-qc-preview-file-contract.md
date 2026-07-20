# QC Preview File Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make QC Preview show every required input and scaled output from the existing production list response, preserve file-check pairs even when URLs repeat, and identify missing files before a QC decision.

**Architecture:** Add a compact `qcPreviewFileChecks` array to each `GET /api/production/tasks` summary DTO. The QC page continues using one paginated list request; it does not call task-detail endpoints per row. FE maps cards and compare pairs by `fileCheckId`, with the output as the canvas base and the matched input as an optional overlay.

**Tech Stack:** Node.js/Express/Jest backend; React, MUI, TanStack Query, Node test runner frontend.

## Global Constraints

- Keep `GET /api/production/tasks` as the only task-data request when opening QC Preview.
- Do not add dependencies or a generic media abstraction.
- Expose only safe media download URLs, never storage paths or provider secrets.
- Keep backend QC-pass validation authoritative.
- Run focused tests, then `npm.cmd run lint` and `npm.cmd run build` in FE.

---

## File Structure

- Modify `C:\lng_system\lng-web-be-v1\lng-web-be\src\modules\production\dtos\productionTask.dto.js`: expose compact preview data on the list DTO.
- Modify `C:\lng_system\lng-web-be-v1\lng-web-be\src\test\production\dtos\productionTask.dto.test.js`: lock the list-response contract.
- Modify `C:\lng_system\lng-web-be-v1\lng-web-be\docs\production\PRODUCTION_API.md`: document the new field.
- Modify `C:\lng_system\lng-web-fe\src\features\qc\utils\qcApi.js`: use `qcPreviewFileChecks` as the primary preview source and keep slot-specific files.
- Modify `C:\lng_system\lng-web-fe\src\features\qc\utils\qcApi.test.js`: test list-shaped payloads, duplicate URLs, and missing outputs.
- Modify `C:\lng_system\lng-web-fe\src\features\qc\components\QcImageReviewDialog.jsx`: render every slot, disable unavailable files, and only compare complete pairs.
- Modify `C:\lng_system\lng-web-fe\src\features\qc\pages\qcPageComposition.test.js`: assert the dialog retains slot-missing and compare-pair behavior.

## Contract

Every `GET /api/production/tasks` item gains:

```json
{
  "qcPreviewFileChecks": [
    {
      "id": "fileCheckId",
      "slotKey": "FRONT",
      "slotLabel": "Front",
      "required": true,
      "inputAssetDownloadUrl": "/api/media/assets/input/download",
      "inputSourceLabel": "Customer upload",
      "inputImageName": "photo.png",
      "outputAssetDownloadUrl": "/api/media/assets/output/download",
      "outputStatus": "UPLOADED"
    }
  ]
}
```

The field contains every persisted `fileCheck`, not only `CUSTOMER_IMAGE` scale slots. `id` is the stable pair key. FE may fall back to the legacy `detail.fileChecks` and `detail.scaleSlots` only while old backend deployments still exist.

### Task 1: Add the compact backend list contract

**Files:**

- Modify: `C:\lng_system\lng-web-be-v1\lng-web-be\src\modules\production\dtos\productionTask.dto.js:454-483`
- Test: `C:\lng_system\lng-web-be-v1\lng-web-be\src\test\production\dtos\productionTask.dto.test.js`

**Consumes:** Existing `toFileCheckDto(check)`.

**Produces:** `qcPreviewFileChecks` on `toProductionTaskSummaryDto(task)`.

- [ ] **Step 1: Write the failing DTO test**

Add a summary DTO fixture with both a `PSD_TEMPLATE` check and a `CUSTOMER_IMAGE` check. Assert the list DTO includes both IDs, their input and output download URLs, `required`, `slotLabel`, and `outputStatus`.

```js
expect(dto.qcPreviewFileChecks).toEqual([
  expect.objectContaining({ id: 'psd-check', slotLabel: 'Template', required: true }),
  expect.objectContaining({ id: 'front-check', slotLabel: 'Front', required: true }),
])
```

- [ ] **Step 2: Verify the test fails**

Run:

```powershell
npx jest src/test/production/dtos/productionTask.dto.test.js --runInBand
```

Expected: FAIL because `qcPreviewFileChecks` is undefined on the summary DTO.

- [ ] **Step 3: Add the DTO field**

In `toProductionTaskSummaryDto`, add the already-sanitized projection:

```js
qcPreviewFileChecks: (task.fileChecks || []).map(toFileCheckDto),
```

Do not create a second media serializer. `toFileCheckDto` already emits safe `/api/media/assets/:id/download` links.

- [ ] **Step 4: Verify the DTO test passes**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit the backend contract**

```powershell
git add src/modules/production/dtos/productionTask.dto.js src/test/production/dtos/productionTask.dto.test.js
git commit -m "feat(production): expose qc preview file checks in task list"
```

### Task 2: Document the list response contract

**Files:**

- Modify: `C:\lng_system\lng-web-be-v1\lng-web-be\docs\production\PRODUCTION_API.md:45-104`

**Consumes:** `qcPreviewFileChecks` from Task 1.

**Produces:** API documentation showing the exact compact file payload.

- [ ] **Step 1: Add the response example**

Add `qcPreviewFileChecks` next to the existing `scaleContext` example and state that it contains all persisted file checks needed by QC Preview. State that `inputAssetDownloadUrl` and `outputAssetDownloadUrl` are the only supported browser preview URLs.

- [ ] **Step 2: Check the contract wording**

Confirm the example does not claim `scaleContext.use.scaleSlots` includes all file checks; it only represents customer-image scale slots.

- [ ] **Step 3: Commit the documentation**

```powershell
git add docs/production/PRODUCTION_API.md
git commit -m "docs(production): document QC preview file checks"
```

### Task 3: Map list-shaped preview files without losing duplicate slots

**Files:**

- Modify: `C:\lng_system\lng-web-fe\src\features\qc\utils\qcApi.js:263-378`
- Test: `C:\lng_system\lng-web-fe\src\features\qc\utils\qcApi.test.js:365-439`

**Consumes:** `task.qcPreviewFileChecks` from Task 1.

**Produces:** Slot-specific preview records with `{ id, sourceId, kind, url, required, outputStatus, unavailableReason }`.

- [ ] **Step 1: Write failing mapping tests**

Use a payload shaped like the production list response: no `task.fileChecks`, two `qcPreviewFileChecks`, and the same input URL for `FRONT` and `BACK`.

```js
assert.deepEqual(
  item.layers.map(({ id, sourceId, kind }) => ({ id, sourceId, kind })),
  [
    { id: 'front-input', sourceId: 'front', kind: 'input' },
    { id: 'front-output', sourceId: 'front', kind: 'output' },
    { id: 'back-input', sourceId: 'back', kind: 'input' },
    { id: 'back-output', sourceId: 'back', kind: 'output' },
  ],
)
```

Add a second assertion for a required output with no URL: it remains in `layers` as an unavailable output card with `outputStatus: 'MISSING'`.

- [ ] **Step 2: Verify the tests fail**

Run:

```powershell
node --test src\features\qc\utils\qcApi.test.js
```

Expected: FAIL because the current mapper ignores `qcPreviewFileChecks`, drops repeated URLs, and skips missing output records.

- [ ] **Step 3: Implement the smallest mapper change**

Build checks from this ordered source:

```js
const previewChecks =
  detail.qcPreviewFileChecks ||
  task.qcPreviewFileChecks ||
  detail.fileChecks ||
  detail.scaleSlots ||
  []
```

Create both input and output records for each check. Keep `id` and `sourceId` derived from `fileCheckId`/`id`; do not deduplicate layer records by URL. Retain URL deduplication only for `referenceImages`.

For a missing URL, emit a record with `url: ''` and an explicit unavailable status instead of removing the slot.

- [ ] **Step 4: Verify the tests pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit the FE mapper**

```powershell
git add src/features/qc/utils/qcApi.js src/features/qc/utils/qcApi.test.js
git commit -m "fix(qc): preserve preview file-check pairs"
```

### Task 4: Make the QC dialog describe real file availability

**Files:**

- Modify: `C:\lng_system\lng-web-fe\src\features\qc\components\QcImageReviewDialog.jsx:57-105,179-205,475-510`
- Modify: `C:\lng_system\lng-web-fe\src\i18n\locales\en\common.json`
- Modify: `C:\lng_system\lng-web-fe\src\i18n\locales\vi\common.json`
- Test: `C:\lng_system\lng-web-fe\src\features\qc\pages\qcPageComposition.test.js:129-165`

**Consumes:** Available and unavailable slot records from Task 3.

**Produces:** Three clear side-panel groups: reference context, source input per slot, and scaled output per slot.

- [ ] **Step 1: Write the failing composition check**

Assert the dialog renders unavailable file state and compares only fully available pairs:

```js
assert.equal(source.includes("t('qc.preview.fileUnavailable')"), true)
assert.equal(source.includes('layer.url && layer.sourceId === baseLayer?.sourceId'), true)
```

- [ ] **Step 2: Verify the test fails**

Run:

```powershell
node --test src\features\qc\pages\qcPageComposition.test.js
```

Expected: FAIL because unavailable layers currently disappear and comparison only tests the source ID.

- [ ] **Step 3: Render unavailable cards and restrict interaction**

Keep all slot cards in `Source Files` and `Scaled Files`. For a card without `url`, render its slot label plus `Missing` or `Unavailable`, do not make it selectable, and do not render an open-image action.

Derive canvas layers with `layers.filter((layer) => layer.url)`. Enable `Compare` only when the selected output and its matched input both have URLs. Keep output as the base layer and input as the temporary overlay.

Add only these translations:

```json
"fileUnavailable": "File unavailable",
"outputMissing": "Scaled output missing"
```

- [ ] **Step 4: Verify the UI contract test passes**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit the dialog behavior**

```powershell
git add src/features/qc/components/QcImageReviewDialog.jsx src/features/qc/pages/qcPageComposition.test.js src/i18n/locales/en/common.json src/i18n/locales/vi/common.json
git commit -m "fix(qc): show missing preview slots"
```

### Task 5: End-to-end verification

**Files:** No production file changes.

**Consumes:** Tasks 1-4.

**Produces:** Verified one-request QC Preview behavior.

- [ ] **Step 1: Run focused FE tests**

```powershell
node --test src\features\qc\utils\qcApi.test.js src\features\qc\pages\qcPageComposition.test.js
```

Expected: PASS.

- [ ] **Step 2: Run frontend quality gates**

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: both commands exit `0`; record any existing Vite chunk-size warning separately from failures.

- [ ] **Step 3: Verify in the browser with a multi-slot task**

Confirm one `GET /api/production/tasks` response includes `qcPreviewFileChecks`, opening QC Preview makes no per-row detail request, repeated input URLs show both slots, and a missing required output remains visible but cannot be selected or compared.

- [ ] **Step 4: Verify decisions**

Confirm `Pass QC` stays disabled when a required output is missing. Submit `Reject QC` with a note and confirm the existing `PATCH /api/production/tasks/:taskId/qc` response updates the queue.

## Self-Review

- Coverage: Tasks 1-2 provide and document the missing list contract; Task 3 preserves file pairs; Task 4 exposes missing files safely; Task 5 verifies no N+1 regression and decisions.
- No new endpoint or dependency is introduced.
- `qcPreviewFileChecks`, `sourceId`, and `fileCheckId` use the same stable pairing identity in every task.
