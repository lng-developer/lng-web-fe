export const numberOf = (value: number | undefined | null) => Number(value ?? 0)

export const money = (amount: number | undefined | null, currency = 'USD') =>
  amount == null
    ? '-'
    : new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100)

export function formatChartNumber(value: number) {
  return new Intl.NumberFormat().format(value)
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
