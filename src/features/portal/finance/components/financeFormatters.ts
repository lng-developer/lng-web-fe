export const formatFinanceMoney = (amount: number | null | undefined, currency = 'USD'): string => {
  if (amount == null) return '—'
  const symbol = currency === 'USD' ? '$' : currency === 'VND' ? '₫' : `${currency} `
  const value = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    .formatToParts(amount / 100)
    .filter((part) => part.type !== 'currency')
    .map((part) => part.value)
    .join('')
    .trim()
  return `${symbol}${value}`
}
