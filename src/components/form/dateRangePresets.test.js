import dayjs from 'dayjs'
import assert from 'node:assert/strict'
import test from 'node:test'

import { DATE_RANGE_PRESETS, getDateRangePreset } from './dateRangePresets.js'

const NOW = dayjs('2026-07-14T12:00:00')

const CASES = [
  [DATE_RANGE_PRESETS.TODAY, '2026-07-14', '2026-07-14'],
  [DATE_RANGE_PRESETS.YESTERDAY, '2026-07-13', '2026-07-13'],
  [DATE_RANGE_PRESETS.LAST_7_DAYS, '2026-07-08', '2026-07-14'],
  [DATE_RANGE_PRESETS.LAST_30_DAYS, '2026-06-15', '2026-07-14'],
]

for (const [preset, expectedStart, expectedEnd] of CASES) {
  test(`getDateRangePreset maps ${preset} to the expected calendar range`, () => {
    const result = getDateRangePreset(preset, NOW)

    assert.equal(result.start.format('YYYY-MM-DD'), expectedStart)
    assert.equal(result.end.format('YYYY-MM-DD'), expectedEnd)
  })
}
