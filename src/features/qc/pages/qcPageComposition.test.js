import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function readPageSource() {
  return readFileSync(new URL('./QcPage.jsx', import.meta.url), 'utf8')
}

function readDetailSource() {
  return readFileSync(new URL('../components/QcDetailPanel.jsx', import.meta.url), 'utf8')
}

function readPreviewDialogSource() {
  return readFileSync(new URL('../components/QcImageReviewDialog.jsx', import.meta.url), 'utf8')
}

test('QC page uses the shared operations layout and table system', () => {
  const source = readPageSource()

  assert.equal(source.includes("from '@/components/operations'"), true)
  assert.equal(source.includes('<OperationsPageShell'), true)
  assert.equal(source.includes('<OperationsToolbar'), true)
  assert.equal(source.includes('<OperationsTabs'), true)
  assert.equal(source.includes('variant="underline"'), true)
  assert.equal(source.includes('grid w-full grid-cols-1 items-center gap-2'), true)
  assert.equal(source.includes('<OperationsTable'), true)
})

test('QC page keeps review actions focused on QC decisions', () => {
  const source = readPageSource()

  assert.equal(source.includes('usePushProductionTasksMutation'), false)
  assert.equal(source.includes('pushSelectedTasks'), false)
})

test('QC page does not render a platform filter', () => {
  const source = readPageSource()

  assert.equal(source.includes('platformTabs.map'), false)
  assert.equal(source.includes('onChange={handlePlatformChange}'), false)
  assert.equal(source.includes('readQcDashboardSearch'), true)
  assert.equal(source.includes('platform'), true)
})

test('QC refreshes only the current task and summary queries', () => {
  const source = readPageSource()

  assert.equal(source.includes('tasksQuery.refetch()'), true)
  assert.equal(source.includes('countsQuery.refetch()'), true)
  assert.equal(
    source.includes('queryClient.invalidateQueries({ queryKey: productionKeys.all })'),
    false,
  )
})

test('QC always renders each task detail without expand state', () => {
  const source = readPageSource()

  assert.equal(source.includes('function isQcRowExpanded()'), true)
  assert.equal(source.includes('getRowExpanded={isQcRowExpanded}'), true)
  assert.equal(source.includes('expandedTaskIds'), false)
  assert.equal(source.includes('KeyboardArrowDownIcon'), false)
})

test('QC keeps the queue subtree stable while users edit filters', () => {
  const source = readPageSource()
  const detailSource = readDetailSource()

  assert.equal(source.includes("import { useCallback, useMemo, useState } from 'react'"), true)
  assert.equal(source.includes('const tableColumns = useMemo('), true)
  assert.equal(source.includes('const renderQcCell = useCallback('), true)
  assert.equal(source.includes('const renderExpandedQcRow = useCallback('), true)
  assert.equal(source.includes('staleTime: 30_000'), true)
  assert.equal(source.includes('staleTime: 5 * 60_000'), true)
  assert.equal(detailSource.includes('export default memo(QcDetailPanel)'), true)
  assert.equal(detailSource.includes("contentVisibility: 'auto'"), true)
})

test('QC queue relies on backend row scope, URL-backed filters, and one page-level preview dialog', () => {
  const source = readPageSource()

  assert.equal(source.includes('const [statusTab, setStatusTab] = useState'), true)
  assert.equal(source.includes('{ value: QC_STATUS_TABS.ALL'), true)
  assert.equal(source.includes('{ value: QC_STATUS_TABS.PENDING'), true)
  assert.equal(source.includes('{ value: QC_STATUS_TABS.QC_REJECTED'), true)
  assert.equal(source.includes('{ value: QC_STATUS_TABS.FAILED'), true)
  assert.equal(source.includes('{ value: QC_STATUS_TABS.COMPLETED'), true)
  assert.equal(source.includes('{ value: QC_STATUS_TABS.ADDRESS_INVALID'), true)
  assert.equal(source.includes('onChange={handleStatusTabChange}'), true)
  assert.equal(source.includes('filterQcRowsByStatusTab'), false)
  assert.equal(source.includes('selectedTaskIds'), false)
  assert.equal(source.includes('import QcImageReviewDialog'), true)
  assert.equal(source.includes('<QcImageReviewDialog'), true)
  assert.equal(source.includes('const [previewTask, setPreviewTask] = useState(null)'), true)
  assert.equal(source.includes('onPreview={setPreviewTask}'), true)
  assert.equal(source.includes('onPreviewDecision'), false)
  assert.equal(
    source.includes("t('qc.actions.exportExcel', { count: selectedTaskIds.size })"),
    false,
  )
  assert.equal(source.includes('const total = Number(tasksQuery.data?.total) || 0'), true)
  assert.equal(source.includes('exportTasksMutation.mutateAsync(exportQuery)'), true)
  assert.equal(source.includes('setPage(1)'), true)
  assert.equal(source.includes('replaceQcUrl({ page: nextPage })'), true)
  assert.equal(source.includes('canPass={canSubmitQcPass(previewTask || {})}'), true)
  assert.equal(source.includes('canReject={canSubmitQcReject(previewTask || {})}'), true)
})

test('QC detail exposes the staff review sections', () => {
  const source = readDetailSource()

  assert.equal(source.includes('qc.detail.productAndOrder'), true)
  assert.equal(source.includes('qc.detail.customization'), true)
  assert.equal(source.includes('qc.detail.scaledFiles'), true)
  assert.equal(source.includes('qc.detail.vendorWorkflow'), true)
  assert.equal(source.includes('qc.detail.notesAndDecision'), true)
  assert.equal(source.includes('pushSelectedTasks'), false)
  assert.equal(source.includes("from '@/components/common/ImagePreview'"), false)
  assert.equal(source.includes('AssetThumbnail'), false)
})

test('QC detail omits fields already visible in the queue row', () => {
  const source = readDetailSource()

  assert.equal(source.includes('qc.detail.orderId'), false)
  assert.equal(source.includes('qc.detail.seller'), false)
  assert.equal(source.includes('qc.detail.shop'), false)
  assert.equal(source.includes('qc.detail.scaleBy'), false)
})

test('QC detail relies on the task list payload instead of per-row detail fetches', () => {
  const source = readDetailSource()

  assert.equal(source.includes('useProductionTaskByOrderItemQuery'), false)
  assert.equal(source.includes('detailQuery'), false)
  assert.equal(source.includes('mergeQcTaskDetail'), false)
})

test('QC detail emits image preview intent without owning a dialog', () => {
  const source = readDetailSource()

  assert.equal(source.includes('import QcImageReviewDialog'), false)
  assert.equal(source.includes('previewOpen'), false)
  assert.equal(source.includes('onPreview(resolvedTask)'), true)
})

test('QC image preview keeps compare unavailable for an input with no output URL', () => {
  const source = readPreviewDialogSource()

  assert.match(
    source,
    /const outputLayer = layers\.find\(\s*\(layer\) =>\s*layer\.url && layer\.sourceId === activeLayer\?\.sourceId && layer\.kind === 'output',\s*\)/,
  )
  assert.match(
    source,
    /const inputLayer = layers\.find\(\s*\(layer\) =>\s*layer\.url && layer\.sourceId === activeLayer\?\.sourceId && layer\.kind === 'input',\s*\)/,
  )
  assert.equal(source.includes('const canCompare = Boolean(outputLayer && inputLayer)'), true)
  assert.equal(source.includes('const canCompare = layers.some('), false)
})

test('QC image preview compares only a selected source with URL-backed input and output layers', () => {
  const source = readPreviewDialogSource()

  assert.equal(source.includes("const [viewMode, setViewMode] = useState('single')"), true)
  assert.equal(source.includes("layer.kind === 'output'"), true)
  assert.equal(source.includes("layer.kind === 'input'"), true)
  assert.equal(source.includes('layer.sourceId === activeLayer?.sourceId'), true)
  assert.equal(source.includes("viewMode === 'compare' && canCompare ? inputLayer : null"), true)
  assert.equal(source.includes('const displayOverlay ='), true)
  assert.equal(source.includes('onMouseDown={startOverlayMove}'), true)
  assert.equal(source.includes('onResizeMouseDown'), true)
  assert.equal(source.includes('computeQcLayerMove'), true)
  assert.equal(source.includes('computeQcLayerResize'), true)
  assert.equal(source.includes("t('qc.preview.compare')"), true)
  assert.equal(source.includes("t('qc.preview.fit')"), false)
  assert.equal(source.includes("t('qc.preview.center')"), false)
  assert.equal(source.includes("t('qc.preview.actualSize')"), false)
  assert.equal(source.includes("t('qc.preview.resetView')"), true)
  assert.equal(source.includes("t('qc.preview.sourceOverlayOpacity')"), true)
  assert.equal(source.includes('setOverlayGeometry(null)'), true)
  assert.equal(source.includes('setOverlayOpacity(DEFAULT_OVERLAY_OPACITY)'), true)
  assert.equal(source.includes("submitDecision('PASSED')"), true)
  assert.equal(source.includes('await onSubmitDecision('), true)
  assert.equal(source.includes('mutateAsync('), false)
  assert.equal(source.includes('const slotLayers = resolvedSlotLayers'), true)
  assert.equal(source.includes('const sourceLayers = slotLayers.filter'), true)
  assert.equal(source.includes('const scaledLayers = slotLayers.filter'), true)
  assert.equal(
    source.includes('resolvedSlotLayers.filter((layer) => layer.url).map(createInitialLayer)'),
    true,
  )
  assert.equal(source.includes('createQcPreviewImageSource'), true)
  assert.equal(source.includes("responseType: 'blob'"), true)
  assert.equal(source.includes("nextLayers.find((layer) => layer.kind === 'output')"), true)
  assert.equal(source.includes('{baseLayer ? ('), true)
  assert.equal(source.includes('max-h-56 flex-col gap-1.5 overflow-auto'), false)
  assert.equal(source.includes("t('qc.preview.fileUnavailable')"), true)
})

test('QC image preview resets compare state when selection moves to another source pair', () => {
  const source = readPreviewDialogSource()

  assert.match(
    source,
    /function selectLayer\(layerId\) \{\s*const nextLayer = layers\.find\(\(layer\) => layer\.id === layerId\)\s*if \(nextLayer\?\.sourceId !== activeLayer\?\.sourceId\) \{\s*setViewMode\('single'\)\s*setOverlayGeometry\(null\)\s*setOverlayOpacity\(DEFAULT_OVERLAY_OPACITY\)[\s\S]*?setActiveLayerId\(layerId\)\s*\}/,
  )
  assert.match(
    source,
    /onClick=\{\s*group\.selectable && image\.url \? \(\) => selectLayer\(image\.id\) : undefined\s*\}/,
  )
})

test('QC image preview batches drag geometry updates to animation frames', () => {
  const source = readPreviewDialogSource()

  assert.equal(source.includes('requestAnimationFrame(() => {'), true)
  assert.equal(source.includes('pendingOverlayGeometryRef.current = next'), true)
  assert.equal(source.includes('cancelAnimationFrame(dragFrameRef.current)'), true)
})

test('QC image preview updates canvas background without re-rendering the dialog', () => {
  const source = readPreviewDialogSource()

  assert.equal(source.includes('const [bgColor, setBgColor] = useState'), false)
  assert.equal(source.includes('const backgroundInputRef = useRef(null)'), true)
  assert.equal(source.includes('function handleBackgroundInput(event)'), true)
  assert.equal(source.includes('stageRef.current.style.backgroundColor = color'), true)
  assert.equal(source.includes('onInput={handleBackgroundInput}'), true)
})

test('QC image preview renders sibling selection, preview, and open controls', () => {
  const source = readPreviewDialogSource()
  const thumbnailCardSource = source.slice(
    source.indexOf('function ThumbnailCard'),
    source.indexOf('function LayerNode'),
  )
  const thumbnailListSource = source.slice(
    source.indexOf('{group.images.map'),
    source.indexOf('</section>', source.indexOf('{group.images.map')),
  )

  assert.equal(thumbnailCardSource.includes('<ImagePreview'), false)
  assert.equal(thumbnailCardSource.includes('<a'), false)
  assert.match(thumbnailCardSource, /<button\s+type="button"/)
  assert.equal(thumbnailCardSource.includes('aria-label={`Select ${image.label}`}'), true)
  assert.equal(thumbnailListSource.includes('<ThumbnailCard'), true)
  assert.equal(thumbnailListSource.includes('<ImagePreview'), true)
  assert.equal(thumbnailListSource.includes('component="a"'), true)
  assert.equal(
    thumbnailListSource.includes("aria-label={`${t('qc.preview.openImage')}: ${image.label}`}"),
    true,
  )
})
