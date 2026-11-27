const formatters = new Map<string, Intl.NumberFormat>()

export const formatReportMoney = (amount: number | null | undefined, currency: string): string => {
  if (amount == null) return '—'
  let formatter = formatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    formatters.set(currency, formatter)
  }
  return formatter.format(amount / 100)
}

export const formatReportPercent = (bps: number | null): string =>
  bps === null ? '—' : `${(bps / 100).toFixed(1)}%`
