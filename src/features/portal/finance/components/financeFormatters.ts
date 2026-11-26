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

export function settlementBankReceiptStatus(t: (key: string) => string, status?: string) {
  if (status === 'RECONCILED') return t('finance.settlements.bankReceiptConfirmed')
  if (status === 'NEEDS_REVIEW') return t('finance.settlements.bankReceiptNeedsReview')
  return t('finance.settlements.bankReceiptPending')
}
