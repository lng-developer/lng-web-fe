import assert from 'node:assert/strict'
import test from 'node:test'

import { ENDPOINTS } from '../../../services/endpoints.js'

test('Scale endpoints expose the current CS and direct-output production contracts', () => {
  assert.equal(ENDPOINTS.SCALE.ASSIGNEES, '/api/production/tasks/scale-assignees')
  assert.equal(ENDPOINTS.SCALE.CS_ASSIGNEES, undefined)
  assert.equal(ENDPOINTS.SCALE.ASSIGN('task-1'), '/api/production/tasks/task-1/assign')
  assert.equal(ENDPOINTS.SCALE.ASSIGN_CS('task-1'), '/api/production/tasks/task-1/assign-cs')
  assert.equal(ENDPOINTS.SCALE.CS_NOTE('task-1'), '/api/production/tasks/task-1/cs-note')
  assert.equal(ENDPOINTS.SCALE.CS_STATUS('task-1'), '/api/production/tasks/task-1/cs-status')
  assert.equal(
    ENDPOINTS.SCALE.SCALED_OUTPUT_FILE('task-1', 'check-1'),
    '/api/production/tasks/task-1/file-checks/check-1/scaled-output-file',
  )
  assert.equal(
    ENDPOINTS.SCALE.MANUAL_SCALED_OUTPUT_FILE('task-1'),
    '/api/production/tasks/task-1/file-checks/manual/scaled-output-file',
  )
  assert.equal(ENDPOINTS.SCALE.SCALED_OUTPUT, undefined)
})
