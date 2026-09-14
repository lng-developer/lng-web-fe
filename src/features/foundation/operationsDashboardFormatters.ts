export const numberOf = (value: number | undefined | null) => Number(value ?? 0)

export const money = (amount: number | undefined | null, currency = 'USD') =>
  amount == null
    ? '-'
    : new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100)

export function formatChartNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return new Intl.NumberFormat().format(value)
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDashboardDate(value: Date, language: string) {
  if (language === 'vi') {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(value)
  }

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value)
}
