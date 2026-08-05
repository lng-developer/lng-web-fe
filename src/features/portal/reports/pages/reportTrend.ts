import dayjs from 'dayjs'

import type { FinanceDaily } from '../api/reportApi'

export const buildRevenueTrend = (rows: FinanceDaily[], dateFrom?: string, dateTo?: string) => {
  const weekly = Boolean(dateFrom && dateTo && dayjs(dateTo).diff(dayjs(dateFrom), 'day') >= 60)
  return Object.entries(
    rows.reduce<Record<string, number>>((result, row) => {
      const period = weekly ? dayjs(row.date).startOf('week').format('YYYY-MM-DD') : row.date
      result[period] = (result[period] || 0) + row.revenueAmount
      return result
    }, {}),
  )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({ label: date.slice(5), value }))
}
