import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

function readDesignTasksPageSource() {
  return readFileSync(new URL('../pages/DesignTasksPage.jsx', import.meta.url), 'utf8')
}

function readDesignTaskColumnsSource() {
  const columnsUrl = new URL('../components/designTaskTableColumns.js', import.meta.url)
  assert.equal(existsSync(columnsUrl), true)
  return readFileSync(columnsUrl, 'utf8')
}

test('design tasks page consumes the shared operations layout system', () => {
  const source = readDesignTasksPageSource()

  assert.equal(source.includes("from '@/components/operations'"), true)
  assert.equal(source.includes('<OperationsPageShell'), true)
  assert.equal(source.includes('<OperationsToolbar'), true)
  assert.equal(source.includes('<OperationsTable'), true)
  assert.equal(source.includes('<OperationsTabs'), true)
  assert.equal(source.includes('<OperationsPagination'), true)
})

test('design task table declares columns as module config', () => {
  const source = readDesignTasksPageSource()
  const columnsSource = readDesignTaskColumnsSource()

  assert.equal(
    source.includes("from '@/features/design-tasks/components/designTaskTableColumns'"),
    true,
  )
  assert.equal(source.includes('const columns = ['), false)
  assert.equal(columnsSource.includes('export const DESIGN_TASK_TABLE_MIN_WIDTH'), true)
  assert.equal(columnsSource.includes('export function createDesignTaskColumns'), true)
  assert.equal(columnsSource.includes("key: 'orderId'"), true)
  assert.equal(columnsSource.includes("label: 'Order ID'"), true)
  assert.equal(columnsSource.includes("key: 'actions'"), true)
})

test('design order id cell does not render listing title as a subtitle', () => {
  const source = readDesignTasksPageSource()
  const cellSource = source.slice(
    source.indexOf("if (column.key === 'orderId')"),
    source.indexOf("if (column.key === 'type')"),
  )

  assert.equal(cellSource.includes('task.orderId'), true)
  assert.equal(cellSource.includes('task.listingTitle'), false)
  assert.equal(cellSource.includes('task.listingCode'), false)
})

test('design tasks keep BE-backed lifecycle actions wired', () => {
  const source = readDesignTasksPageSource()

  assert.equal(source.includes('useAssignDesignTaskMutation'), true)
  assert.equal(source.includes('useCancelDesignTaskMutation'), true)
  assert.equal(source.includes('useBulkCreatePsdTasksMutation'), true)
  assert.equal(source.includes('useSubmitDesignTaskMutation'), true)
  assert.equal(source.includes('useApproveDesignTaskMutation'), true)
  assert.equal(source.includes('useRejectDesignTaskMutation'), true)
  assert.equal(source.includes('mockDesignTasks'), false)
})

test('design task scoring is reviewer-gated and refreshes the active design task queries', () => {
  const pageSource = readDesignTasksPageSource()
  const mutationsSource = readFileSync(
    new URL('../api/designTasks.mutations.js', import.meta.url),
    'utf8',
  )

  assert.equal(
    pageSource.includes("hasAnyPermission(currentUser, ['DESIGN:REVIEW', 'DESIGN:WRITE'])"),
    true,
  )
  assert.equal(pageSource.includes('useOverrideSubmissionScoreMutation'), true)
  assert.equal(pageSource.includes('useVoidSubmissionScoreMutation'), true)
  assert.equal(pageSource.includes('canReview={canReviewScores}'), true)
  assert.equal(mutationsSource.includes('function invalidateDesignScores(queryClient)'), true)
  assert.equal(mutationsSource.includes('queryKey: designTasksKeys.all'), true)
  assert.equal(mutationsSource.includes('designTasksKeys.scoreSummary()'), true)
})

test('score editor remounts when backend score values change instead of resetting state in an effect', () => {
  const pageSource = readDesignTasksPageSource()
  const editorSource = readFileSync(
    new URL('../components/SubmissionScoreEditor.jsx', import.meta.url),
    'utf8',
  )

  assert.equal(
    pageSource.includes(
      "key={`${submission.score?.id || submission.id}:${submission.score?.finalPoints ?? ''}:${submission.score?.scoreLevel || ''}`}",
    ),
    true,
  )
  assert.equal(editorSource.includes('useEffect'), false)
})

test('design tasks no longer carry a parallel task type tabs component', () => {
  assert.equal(existsSync(new URL('../components/TaskTypeTabs.jsx', import.meta.url)), false)
  assert.equal(existsSync(new URL('../components/TaskTypeTabs.test.js', import.meta.url)), false)
  assert.equal(existsSync(new URL('../components/taskTypeTabsConfig.js', import.meta.url)), false)
})

test('design filters stay inside the operations toolbar with secondary filters collapsed', () => {
  const source = readDesignTasksPageSource()
  const filtersSource = source.slice(
    source.indexOf('function DesignFilters'),
    source.indexOf('const TaskTable'),
  )

  assert.equal(filtersSource.includes('<OperationsToolbar'), true)
  assert.equal(filtersSource.includes('More filters'), true)
  assert.equal(filtersSource.includes('secondaryFilterCount'), true)
  assert.equal(
    filtersSource.includes('xl:grid-cols-[minmax(260px,1fr)_170px_minmax(250px,340px)_auto_auto]'),
    false,
  )
})
