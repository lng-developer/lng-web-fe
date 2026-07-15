import assert from 'node:assert/strict'
import test from 'node:test'

import { TASK_TYPES } from '../../../constants/app.js'
import { TASK_TYPE_TAB_OPTIONS } from './taskTypeTabsConfig.js'

test('TASK_TYPE_TAB_OPTIONS maps task type constants to i18n tab labels', () => {
  assert.deepEqual(TASK_TYPE_TAB_OPTIONS, [
    { value: TASK_TYPES.IDEA, labelKey: 'tasks.tabs.idea' },
    { value: TASK_TYPES.PSD, labelKey: 'tasks.tabs.psd' },
    { value: TASK_TYPES.PNG, labelKey: 'tasks.tabs.png' },
  ])
})
