import assert from 'node:assert/strict'
import test from 'node:test'

import { attendanceCode, attendanceTimes, stateClasses } from './attendanceDayCellUtils.js'

test('renders compact attendance codes and both recorded times for matrix cells', () => {
  assert.equal(attendanceCode('PRESENT'), 'P')
  assert.equal(attendanceCode('PAID_LEAVE'), 'L')
  assert.equal(attendanceCode('ERROR'), 'E')
  assert.match(stateClasses.ERROR, /text-rose-/)
  assert.equal(
    attendanceTimes({
      checkInAt: '2026-07-01T01:02:00.000Z',
      checkOutAt: '2026-07-01T10:03:00.000Z',
    }).length,
    2,
  )
})
