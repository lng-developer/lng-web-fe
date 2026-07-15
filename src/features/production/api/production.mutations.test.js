import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeBulkPushResult } from './productionApi.js'

test('normalizeBulkPushResult maps backend bulk push result to UI counters', () => {
  assert.deepEqual(
    normalizeBulkPushResult({
      sent: [{ id: 'task-1' }, { id: 'task-2' }],
      failed: [{ taskId: 'task-3', message: 'Not ready' }],
    }),
    {
      succeeded: 2,
      failed: 1,
      sent: [{ id: 'task-1' }, { id: 'task-2' }],
      failedItems: [{ taskId: 'task-3', message: 'Not ready' }],
    },
  )
})
