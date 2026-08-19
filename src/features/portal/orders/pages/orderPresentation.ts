import type { StatusTagProps } from '@/shared/ui/StatusTag'

type Translate = (key: string, options?: { defaultValue?: string }) => string

function normalizeStatusLabel(status: string) {
  return status.replaceAll('_', ' ')
}

export function orderStatusTone(status?: string | null): StatusTagProps['status'] {
  if (['SHIPPED', 'DELIVERED', 'FULFILLED'].includes(status ?? '')) return 'operational'
  if (status === 'CANCELLED') return 'cancelled'
  if (['ON_HOLD', 'FAILED', 'ADDRESS_INVALID', 'INVALID'].includes(status ?? '')) return 'critical'
  if (['READY', 'APPROVED', 'VALID', 'OVERRIDDEN', 'PRESENT'].includes(status ?? ''))
    return 'approved'
  return 'pending'
}

export function formatOrderStatusLabel(status: string | null | undefined, t: Translate) {
  const normalizedStatus = status ?? 'OPEN'

  return t(`orders.statuses.${normalizedStatus}`, {
    defaultValue: normalizeStatusLabel(normalizedStatus),
  })
}

export function formatMinorMoney(
  amount: number | null | undefined,
  currency = 'USD',
  locale = 'en-US',
) {
  if (amount == null) return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100)
}
