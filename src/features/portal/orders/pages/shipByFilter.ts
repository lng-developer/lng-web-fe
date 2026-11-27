import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

export type ShipByFilter = 'all' | 'today' | 'tomorrow'
const AMAZON_US_TIME_ZONE = 'America/Los_Angeles'

export function getShipByRange(filter: ShipByFilter, now = new Date()) {
  if (filter === 'all') return {}
  const date = dayjs(now)
    .tz(AMAZON_US_TIME_ZONE)
    .add(filter === 'tomorrow' ? 1 : 0, 'day')
    .format('YYYY-MM-DD')
  // Resolve both calendar boundaries in Pacific time, including 23/25-hour DST days.
  const start = dayjs.tz(date, AMAZON_US_TIME_ZONE).startOf('day')
  return {
    shipByDateFrom: start.toISOString(),
    shipByDateTo: start.endOf('day').toISOString(),
  }
}
