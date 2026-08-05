import type { Dayjs } from 'dayjs'

export function serializeDateTimeValue(value: Dayjs | null, mode: 'date' | 'time' | 'datetime') {
  if (!value) return null
  if (mode === 'date') return value.format('YYYY-MM-DD')
  if (mode === 'time') return value.format('HH:mm')
  return value.format('YYYY-MM-DDTHH:mm:ss')
}
