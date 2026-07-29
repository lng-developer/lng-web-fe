import assert from 'node:assert/strict'
import test from 'node:test'

import { hrTimeKeys } from '../api/hrTime.keys.js'
import { buildMonthColumns, mapMatrixRow } from './monthMatrix.js'

test('builds every calendar day for the selected month', () => {
  assert.equal(buildMonthColumns(2026, 7).length, 31)
  assert.equal(buildMonthColumns(2026, 2).length, 28)
  assert.deepEqual(buildMonthColumns(2026, 7)[0], {
    dateKey: '2026-07-01',
    label: '1',
    isWeekend: false,
    weekday: 'Wed',
  })
})

test('maps sparse API cells without dropping an employee day', () => {
  assert.deepEqual(
    mapMatrixRow({
      profile: { id: 'profile-1', fullName: 'Nguyen An' },
      cells: [{ dateKey: '2026-07-01', status: 'PRESENT', capabilities: { adjust: true } }],
      totals: { present: 1 },
      capabilities: { view: true },
    }),
    {
      profile: { id: 'profile-1', fullName: 'Nguyen An' },
      cells: [{ dateKey: '2026-07-01', status: 'PRESENT', capabilities: { adjust: true } }],
      totals: { present: 1 },
      capabilities: { view: true },
    },
  )
})

test('keeps active month filters in the attendance matrix key', () => {
  const queryKey = hrTimeKeys.attendanceMonthMatrix({
    year: 2026,
    month: 7,
    exceptionsOnly: true,
  })

  assert.deepEqual(queryKey.at(-1), { exceptionsOnly: true, month: 7, year: 2026 })
})
