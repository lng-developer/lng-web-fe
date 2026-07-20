# QC Compare View Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a QC operator inspect a scaled output at fit, actual size, and in a temporary source-overlay comparison before submitting the existing Pass or Reject decision.

**Architecture:** Keep `QcImageReviewDialog` as the only owner of local comparison state. `buildQcImageReviewItems` already gives input/output layers a shared `sourceId`; use that pair to render a scaled output as the base image and its matching source as a movable, resizable, translucent overlay. No comparison state is persisted and no API contract changes.

**Tech Stack:** React hooks, MUI, Tailwind utility classes, existing QC canvas helpers, Node built-in test runner.

## Global Constraints

- Do not add dependencies, routes, API endpoints, or backend changes.
- Keep Pass/Reject eligibility and the `{ taskId, decision, note }` mutation payload unchanged.
- Keep Reference, Source, and Scaled file groups explicit in the sidebar.
- View controls affect local modal state only and reset whenever the task or preview item changes.
- Keep the screen operational and dense; use existing MUI icon buttons with tooltips.

---

### Task 1: Protect the source-output pairing contract

**Files:**

- Modify: `src/features/qc/utils/qcApi.test.js`
- Modify: `src/features/qc/pages/qcPageComposition.test.js`

**Consumes:** `buildQcImageReviewItems(task)` and the current modal composition.

**Produces:** Regression coverage proving source and scaled files share a pair key, and that the dialog retains a local compare mode plus view controls without changing decision submission.

- [ ] **Step 1: Write the failing data-contract test**

```js
assert.deepEqual(
  items[0].layers.map(({ kind, sourceId }) => ({ kind, sourceId })),
  [
    { kind: 'input', sourceId: 'front' },
    { kind: 'output', sourceId: 'front' },
  ],
)
```

- [ ] **Step 2: Run the test to verify it passes on the existing pairing contract**

Run: `node --test src\\features\\qc\\utils\\qcApi.test.js`

Expected: PASS. This locks the existing `sourceId` contract before modal work begins.

- [ ] **Step 3: Write the failing dialog composition assertions**

```js
assert.equal(source.includes("const [viewMode, setViewMode] = useState('single')"), true)
assert.equal(source.includes('activeLayer.sourceId'), true)
assert.equal(source.includes('onResizeMouseDown'), true)
assert.equal(source.includes("submitDecision('PASSED')"), true)
```

- [ ] **Step 4: Run the composition test to verify it fails**

Run: `node --test src\\features\\qc\\pages\\qcPageComposition.test.js`

Expected: the view-mode assertion fails because compare state does not exist yet.

- [ ] **Step 5: Keep the tests red until Task 2 implements the controls**

Do not alter API tests or mutation assertions to make the feature appear implemented.

### Task 2: Restore local comparison and view controls

**Files:**

- Modify: `src/features/qc/components/QcImageReviewDialog.jsx`
- Modify: `src/features/qc/utils/qcCanvas.js`
- Modify: `src/features/qc/utils/qcCanvas.test.js`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`

**Consumes:** Paired `sourceId` values from Task 1 and the existing `computeQcWheelView` helper.

**Produces:** A `single` or `compare` local view, with fit, center, actual-size, reset, opacity, and resize controls that never change the QC API payload.

- [ ] **Step 1: Restore local layer geometry helpers with failing tests**

Add tests for an exported helper that returns a bounded resize result and supports reset-safe geometry:

```js
test('computeQcLayerResize changes only local overlay geometry', () => {
  assert.deepEqual(
    computeQcLayerResize({ x: 10, y: 20, width: 100, height: 50 }, { dx: 20, dy: 10 }),
    { x: 10, y: 20, width: 120, height: 60 },
  )
})
```

- [ ] **Step 2: Run the canvas test to verify it fails**

Run: `node --test src\\features\\qc\\utils\\qcCanvas.test.js`

Expected: import failure because `computeQcLayerResize` is not exported.

- [ ] **Step 3: Implement the minimal local geometry helpers**

Restore only `computeQcLayerMove` and `computeQcLayerResize`. Keep values local to the dialog; do not add any mutation, cache write, or persistence code.

```js
export function computeQcLayerResize(layer, { dx = 0, dy = 0, minSize = 24 } = {}) {
  return {
    ...layer,
    width: Math.max(minSize, layer.width + dx),
    height: Math.max(minSize, layer.height + dy),
  }
}
```

- [ ] **Step 4: Add local compare state to the dialog**

Use one view mode and derive the paired source from the selected scaled layer:

```js
const [viewMode, setViewMode] = useState('single')
const baseLayer =
  layers.find((layer) => layer.sourceId === activeLayer?.sourceId && layer.kind === 'output') ||
  activeLayer
const overlayLayer =
  viewMode === 'compare'
    ? layers.find((layer) => layer.sourceId === baseLayer?.sourceId && layer.kind === 'input')
    : null
```

Default `activeLayerId` to a scaled output. Reset `viewMode`, viewport, overlay geometry, and opacity whenever the preview item changes.

- [ ] **Step 5: Render a predictable canvas**

Render one scaled `baseLayer` in single mode. In compare mode, render the matching source above it with local opacity, drag, and resize handles. Do not overlay unrelated slots, and disable Compare when no matching source exists.

- [ ] **Step 6: Restore view controls with unambiguous labels and tooltips**

Add `Compare`, `Fit`, `Center`, `1:1`, and `Reset` near the zoom controls. `Fit`, `Center`, and `1:1` operate on the base scaled file. `Reset` restores viewport and temporary overlay position, size, and opacity. Add one opacity slider only in compare mode.

- [ ] **Step 7: Add localized labels**

Add `compare`, `fit`, `center`, `actualSize`, `resetView`, and `sourceOverlayOpacity` under `qc.preview` in both locale files. Do not reuse copy that says the user is editing the asset.

- [ ] **Step 8: Run focused tests to verify green**

Run: `node --test src\\features\\qc\\utils\\qcCanvas.test.js src\\features\\qc\\utils\\qcApi.test.js src\\features\\qc\\pages\\qcPageComposition.test.js`

Expected: all focused QC tests pass.

### Task 3: Verify operator behavior and regression boundaries

**Files:**

- Modify: `src/features/qc/pages/qcPageComposition.test.js`

**Consumes:** The local compare implementation from Task 2.

**Produces:** Tests that protect UI intent and final verification evidence.

- [ ] **Step 1: Add assertions for local-only comparison behavior**

```js
assert.equal(source.includes('useSubmitProductionQcMutation'), false)
assert.equal(source.includes('await onSubmitDecision('), true)
assert.equal(source.includes('mutateAsync('), false)
```

Keep mutation assertions in `QcPage.jsx`: the dialog must continue calling its `onSubmitDecision` prop and must not own a new API request.

- [ ] **Step 2: Manually verify the primary flow on the local server**

1. Open `http://127.0.0.1:5173/portal/fulfillment/qc`.
2. Open a task that has one source and one scaled file for the same slot.
3. Confirm the scaled file is initially selected and `Compare` exposes the paired source overlay.
4. Drag/resize the source overlay, change opacity, then use Reset and confirm the initial fit is restored.
5. Switch back to single view and confirm only the selected file is visible.
6. Confirm Pass remains disabled without every required scaled output, and Reject requires a note.

- [ ] **Step 3: Run lint and production build**

Run: `npm.cmd run lint`

Expected: exit code 0.

Run: `npm.cmd run build`

Expected: exit code 0; the existing Vite chunk-size warning may remain.

- [ ] **Step 4: Review the scoped diff before commit**

Run: `git diff --check -- src/features/qc src/i18n/locales/en/common.json src/i18n/locales/vi/common.json`

Expected: no whitespace errors and no changes to backend contracts, routes, or unrelated layout files.
