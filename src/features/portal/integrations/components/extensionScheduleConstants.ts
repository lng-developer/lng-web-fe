import type { IntervalOption } from './ExtensionSchedulePopover'

export const ORDER_INTERVAL_OPTIONS: IntervalOption[] = [60, 120, 180, 240].map((value) => ({
  value,
  label: `Every ${value / 60} hour${value === 60 ? '' : 's'}`,
}))

export const ADS_INTERVAL_OPTIONS: IntervalOption[] = [
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Every 24 hours (Daily)' },
  { value: 2880, label: 'Every 2 days' },
]

export const SETTLEMENT_INTERVAL_OPTIONS: IntervalOption[] = [
  { value: 1440, label: 'Daily (Every 24h)' },
  { value: 10080, label: 'Weekly (Every 7 days)' },
]

export const TRANSACTION_INTERVAL_OPTIONS: IntervalOption[] = [
  { value: 1440, label: 'Daily (Every 24h)' },
]

export const TRACKING_INTERVAL_OPTIONS: IntervalOption[] = [
  { value: 60, label: 'Every 1 hour' },
  { value: 120, label: 'Every 2 hours' },
  { value: 240, label: 'Every 4 hours' },
  { value: 360, label: 'Every 6 hours' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Daily (Every 24h)' },
]

export function formatCompactScheduleTiming(
  schedule?: {
    enabled?: boolean
    scheduleType?: 'INTERVAL' | 'FIXED_TIMES'
    intervalMinutes?: number
    fixedTimes?: string[]
    nextRunAt?: string | null
  } | null,
  defaultIntervalMinutes = 120,
) {
  if (!schedule?.enabled) return ''
  const nextDate = schedule.nextRunAt ? new Date(schedule.nextRunAt) : null
  const validNext = nextDate && !isNaN(nextDate.getTime())

  let nextText = ''
  if (validNext) {
    const isToday = nextDate.toDateString() === new Date().toDateString()
    const timeStr = nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    nextText = isToday
      ? `Next: ${timeStr}`
      : `Next: ${nextDate.toLocaleDateString([], { month: 'numeric', day: 'numeric' })} ${timeStr}`
  }

  let freqText = ''
  if (
    schedule.scheduleType === 'FIXED_TIMES' ||
    (schedule.fixedTimes && schedule.fixedTimes.length > 0)
  ) {
    freqText = `Daily (${schedule.fixedTimes?.join(', ')})`
  } else {
    const hours = (schedule.intervalMinutes ?? defaultIntervalMinutes) / 60
    freqText = hours >= 24 ? `Daily (${hours}h)` : `Every ${hours}h`
  }

  return nextText ? `${freqText} · ${nextText}` : freqText
}
