import type { StatusTagProps } from '@/shared/ui/StatusTag'

export function orderStatusTone(status?: string | null): StatusTagProps['status'] {
  if (['SHIPPED', 'DELIVERED', 'FULFILLED'].includes(status ?? '')) return 'operational'
  if (status === 'CANCELLED') return 'cancelled'
  if (['ON_HOLD', 'FAILED', 'ADDRESS_INVALID', 'INVALID'].includes(status ?? '')) return 'critical'
  if (['READY', 'APPROVED', 'VALID', 'OVERRIDDEN'].includes(status ?? '')) return 'approved'
  return 'pending'
}

export function formatMinorMoney(
  amount: number | null | undefined,
  currency = 'USD',
  locale = 'en-US',
) {
  if (amount == null) return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100)
}
