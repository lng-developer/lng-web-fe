import dayjs from 'dayjs'

function toDay(value) {
  const parsed = value ? dayjs(value) : null
  return parsed?.isValid() ? parsed : null
}

export function toReportDateRange({ dateFrom, dateTo } = {}) {
  return { start: toDay(dateFrom), end: toDay(dateTo) }
}

export function fromReportDateRange({ start, end } = {}) {
  return {
    dateFrom: start?.format?.('YYYY-MM-DD') || '',
    dateTo: end?.format?.('YYYY-MM-DD') || '',
  }
}
