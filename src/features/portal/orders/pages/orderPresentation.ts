import type { StatusTagProps } from '@/shared/ui/StatusTag'
import { humanizeCode } from '@/shared/ui'

export { humanizeCode }
type Translate = (key: string, options?: { defaultValue?: string }) => string

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
    defaultValue: humanizeCode(normalizedStatus),
  })
}

export function formatPsdStatusLabel(status: string | null | undefined, t: Translate) {
  if (!status) return '—'
  return t(`orders.psdStatuses.${status}`, {
    defaultValue: humanizeCode(status),
  })
}

export function formatAddressStatusLabel(status: string | null | undefined, t: Translate) {
  if (!status) return '—'
  return t(`orders.addressStatuses.${status}`, {
    defaultValue: humanizeCode(status),
  })
}

export function formatTimelineEventLabel(eventType: string | null | undefined, t: Translate) {
  if (!eventType) return '—'
  return t(`orders.history.events.${eventType}`, {
    defaultValue: humanizeCode(eventType),
  })
}

export function formatTimelineBlockerLabel(blocker: string | null | undefined, t: Translate) {
  if (!blocker) return '—'
  return t(`orders.history.blockersList.${blocker}`, {
    defaultValue: humanizeCode(blocker),
  })
}

export function formatCaseTypeLabel(caseType: string | null | undefined, t: Translate) {
  if (!caseType) return '—'
  return t(`orders.case.types.${caseType}`, {
    defaultValue: humanizeCode(caseType),
  })
}

export function formatCaseSeverityLabel(severity: string | null | undefined, t: Translate) {
  if (!severity) return '—'
  return t(`orders.case.severities.${severity}`, {
    defaultValue: humanizeCode(severity),
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
