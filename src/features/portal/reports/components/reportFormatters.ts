export const formatReportMoney = (amount: number, currency: string): string =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100)

export const formatReportPercent = (bps: number | null): string =>
  bps === null ? '—' : `${(bps / 100).toFixed(1)}%`
