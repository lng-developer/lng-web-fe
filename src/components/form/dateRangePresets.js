import dayjs from 'dayjs'

export const DATE_RANGE_PRESETS = Object.freeze({
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last7Days',
  LAST_30_DAYS: 'last30Days',
})

const PRESET_START_OFFSETS = Object.freeze({
  [DATE_RANGE_PRESETS.TODAY]: 0,
  [DATE_RANGE_PRESETS.YESTERDAY]: 1,
  [DATE_RANGE_PRESETS.LAST_7_DAYS]: 6,
  [DATE_RANGE_PRESETS.LAST_30_DAYS]: 29,
})

export function getDateRangePreset(preset, now = dayjs()) {
  const offset = PRESET_START_OFFSETS[preset]

  if (offset === undefined) {
    throw new RangeError(`Unsupported date range preset: ${preset}`)
  }

  const today = now.startOf('day')
  const end = preset === DATE_RANGE_PRESETS.YESTERDAY ? today.subtract(1, 'day') : today

  return {
    start: preset === DATE_RANGE_PRESETS.YESTERDAY ? end : today.subtract(offset, 'day'),
    end,
  }
}
