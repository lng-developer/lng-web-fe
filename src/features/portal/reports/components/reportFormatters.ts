const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatReportMoney = (amount: number, _currency: string): string => {
  void _currency
  return moneyFormatter.format(amount / 100)
}

export const formatReportPercent = (bps: number | null): string =>
  bps === null ? '—' : `${(bps / 100).toFixed(1)}%`
