# QC Review Correctness and Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make QC Review export, pagination, decisions, URL state, and image preview lifecycle match the production-task API contract.

**Architecture:** Keep React, MUI, TanStack Query, and the existing operations table. The backend owns row scope and pagination; QcPage owns the one image-review dialog; QcDetailPanel only displays data and emits events.

**Tech Stack:** React, MUI, TanStack Query, existing QC helpers, Node test runner, Vite.

## Global Constraints

- Change only src/features/qc and its existing tests.
- Do not add dependencies, routes, endpoints, or shared table abstractions.
- Keep task details expanded and preserve existing pass/reject behavior.
- Export the active filtered queue; selected-row export is out of scope because the endpoint accepts filters only.
- Preserve unrelated dirty work and do not create a commit in this dirty worktree.

---

## File Structure

- Modify: src/features/qc/utils/qcApi.js and src/features/qc/utils/qcApi.test.js
  - Server query scope and terminal decision eligibility.
- Modify: src/features/qc/components/QcDetailPanel.jsx
  - Detail-only component that emits preview intent.
- Modify: src/features/qc/pages/QcPage.jsx and src/features/qc/pages/qcPageComposition.test.js
  - Page-level URL/filter/export state and one dialog.

### Task 1: Keep Status Scope and Decision Eligibility in the API Helper

**Files:**

- Modify: src/features/qc/utils/qcApi.js
- Modify: src/features/qc/utils/qcApi.test.js

**Interfaces:**

- Remove: filterQcRowsByStatusTab(rows, statusTab); the backend owns selected row scope.
- Keep: buildQcTaskQuery(filters) as the single selected-status mapper.
- Update: canSubmitQcReject(task) to deny PASSED and REJECTED.

- [ ] **Step 1: Write the failing test**

Replace the client filter test with:

```js
test('buildQcTaskQuery lets the backend own selected status scope', () => {
  assert.deepEqual(buildQcTaskQuery({ statusTab: 'pending' }), {
    salesChannelCode: 'AMAZON',
    qcStatus: 'PENDING',
    page: 1,
    limit: 10,
  })
  assert.deepEqual(buildQcTaskQuery({ statusTab: 'qcRejected' }), {
    salesChannelCode: 'AMAZON',
    qcStatus: 'REJECTED',
    page: 1,
    limit: 10,
  })
})
```

Extend the reject test:

```js
assert.equal(canSubmitQcReject({ statusQc: 'REJECTED' }), false)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: node --test src\features\qc\utils\qcApi.test.js

Expected: FAIL because rejected tasks can currently be rejected again.

- [ ] **Step 3: Implement the minimal shared guard**

Keep the existing row helper until Task 3 removes its active caller. Replace the shared guard:

```js
export function canSubmitQcReject(task = {}) {
  return !['PASSED', 'REJECTED'].includes(task.statusQc)
}
```

Remove the deleted helper import and test in this task.

- [ ] **Step 4: Run the test to verify it passes**

Run: node --test src\features\qc\utils\qcApi.test.js

Expected: PASS.

### Task 2: Make the Detail Panel Stateless for Image Preview

**Files:**

- Modify: src/features/qc/components/QcDetailPanel.jsx
- Modify: src/features/qc/pages/qcPageComposition.test.js

**Interfaces:**

- Update: QcDetailPanel({ canReview, decisionLoading, onDecision, onPreview, task }).
- Remove: onPreviewDecision, previewOpen, and local QcImageReviewDialog.
- Emit: onPreview(task).

- [ ] **Step 1: Write the failing composition test**

```js
test('QC details emit image preview intent without mounting a dialog per row', () => {
  const source = readDetailSource()
  assert.equal(source.includes('import QcImageReviewDialog'), false)
  assert.equal(source.includes('previewOpen'), false)
  assert.equal(source.includes('onPreview(resolvedTask)'), true)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: node --test src\features\qc\pages\qcPageComposition.test.js

Expected: FAIL because each expanded panel mounts a dialog.

- [ ] **Step 3: Implement the event-only panel**

Use the existing image data mapping, but remove state and dialog ownership:

```jsx
import { useMemo } from 'react'

export default function QcDetailPanel({ canReview, decisionLoading, onDecision, onPreview, task }) {
```

Replace the Inspect images callback:

```jsx
onClick={() => onPreview(resolvedTask)}
```

Delete the trailing QcImageReviewDialog block.

- [ ] **Step 4: Run the test to verify it passes**

Run: node --test src\features\qc\pages\qcPageComposition.test.js

Expected: PASS.

### Task 3: Integrate Queue State, Export, URL Filters, and One Preview Dialog

**Files:**

- Modify: src/features/qc/pages/QcPage.jsx
- Modify: src/features/qc/pages/qcPageComposition.test.js
- Modify: src/features/qc/utils/qcApi.js and src/features/qc/utils/qcApi.test.js only if URL parsing remains a pure helper.

**Interfaces:**

- Add page state: previewTask.
- Keep: taskFilters as input to task, summary, and export requests.
- Render: one page-level QcImageReviewDialog.

- [ ] **Step 1: Write the failing page-composition test**

```js
assert.equal(source.includes('filterQcRowsByStatusTab'), false)
assert.equal(source.includes('selectedTaskIds'), false)
assert.equal(source.includes('import QcImageReviewDialog'), true)
assert.equal(source.includes('<QcImageReviewDialog'), true)
assert.equal(source.includes('onPreview={setPreviewTask}'), true)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: node --test src\features\qc\pages\qcPageComposition.test.js

Expected: FAIL because the queue has selection state and client filtering.

- [ ] **Step 3: Remove selection and client filtering**

Map server items directly:

```jsx
const [previewTask, setPreviewTask] = useState(null)

const tasks = useMemo(
  () =>
    (tasksQuery.data?.items || []).map((task) => mapProductionTaskToQcRow(task, { shopNameById })),
  [shopNameById, tasksQuery.data],
)
```

Delete the Checkbox import, selectedTaskIds, selection helpers/resets, selected-row class, select-cell rendering, and the filterQcRowsByStatusTab import/call. Build columns without select:

```jsx
const tableColumns = QC_TABLE_COLUMNS.filter((column) => column.id !== 'select').map((column) => ({
  key: column.id,
  label: t(column.labelKey),
  width: qcColumnWidths[column.id],
  align: 'left',
}))
```

Change export copy to t('qc.actions.exportExcel'); exportTasks continues calling mutateAsync(exportQuery).

- [ ] **Step 4: Persist all active filters in the URL**

Extend the existing URL reader/writer using URLSearchParams for status, channel, search, sellerCode, shopId, dateFrom, dateTo, page, and limit. Omit defaults/empty values.

Initialize shopId, searchInput, sellerInput, and dateRange from it. Filter changes write page 1; pagination changes only page/limit while retaining filters.

- [ ] **Step 5: Mount one dialog at page level**

Pass intent from the detail panel:

```jsx
<QcDetailPanel
  task={task}
  canReview={canReview}
  decisionLoading={submitQcMutation.isPending}
  onDecision={openDecision}
  onPreview={setPreviewTask}
/>
```

After QcDecisionDialog, render:

```jsx
<QcImageReviewDialog
  open={Boolean(previewTask)}
  task={previewTask}
  canReview={canReview}
  canPass={canSubmitQcPass(previewTask || {})}
  canReject={canSubmitQcReject(previewTask || {})}
  decisionLoading={submitQcMutation.isPending}
  onClose={() => setPreviewTask(null)}
  onSubmitDecision={saveQcDecision}
/>
```

Import QcImageReviewDialog, canSubmitQcPass, and canSubmitQcReject.

- [ ] **Step 6: Run the focused tests**

Run: node --test src\features\qc\pages\qcPageComposition.test.js src\features\qc\utils\qcApi.test.js

Expected: PASS.

### Task 4: Independent Verification

**Files:**

- Verify only.

- [ ] **Step 1: Run independent QC tests**

Run:

```powershell
node --test src\features\qc\pages\qcPageComposition.test.js src\features\qc\utils\qcApi.test.js src\features\qc\utils\qcCanvas.test.js
```

Expected: PASS.

- [ ] **Step 2: Run project verification**

Run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: both exit 0; the existing Vite chunk-size warning is acceptable.

- [ ] **Step 3: Inspect scope**

Run:

```powershell
git diff --check
git diff -- src\features\qc
```

Expected: no whitespace errors and no changes outside QC from this implementation.

## Self-Review

- Scope: covers the export, pagination, dialog, decision, and URL-state audit findings.
- YAGNI: no API, dependency, route, abstraction, or redesign is added.
- Data consistency: server response total and displayed rows use the same selected-status scope.
- Performance: task details stay visible, but only one image dialog state tree/listener set is mounted.
