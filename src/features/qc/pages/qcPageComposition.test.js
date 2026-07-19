import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function readPageSource() {
  return readFileSync(new URL('./QcPage.jsx', import.meta.url), 'utf8')
}

function readDetailSource() {
  return readFileSync(new URL('../components/QcDetailPanel.jsx', import.meta.url), 'utf8')
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

  assert.equal(source.includes('getRowExpanded={() => true}'), true)
  assert.equal(source.includes('expandedTaskIds'), false)
  assert.equal(source.includes('KeyboardArrowDownIcon'), false)
})

test('QC queue is restricted to pending tasks', () => {
  const source = readPageSource()

  assert.equal(source.includes('const statusTab = QC_STATUS_TABS.PENDING'), true)
  assert.equal(source.includes('{ value: QC_STATUS_TABS.ALL'), false)
  assert.equal(source.includes('{ value: QC_STATUS_TABS.PENDING'), true)
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
