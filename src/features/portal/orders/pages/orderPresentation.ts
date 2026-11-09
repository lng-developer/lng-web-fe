import type { StatusTagProps } from '@/shared/ui/StatusTag'
import { humanizeCode } from '@/shared/ui'

export { humanizeCode }
type Translate = (key: string, options?: { defaultValue?: string }) => string

export const WORKFLOW_STAGE_PRIORITY: Record<string, number> = {
  // Urgent blockers:
  OPEN_CASE: 10,
  NEED_ADDRESS: 20,
  NEED_CUSTOMER_IMAGE: 25,
  QC_REJECTED: 30,
  NEEDS_ATTENTION: 35,
  // Customization & Mapping:
  NEED_CUSTOMIZATION: 40,
  CUSTOMIZATION_PENDING: 42,
  NEED_MAPPING: 50,
  MAPPING_PENDING: 52,
  NEED_TEMPLATE: 60,
  NEED_PSD: 70,
  // Production pipeline:
  NEED_PRODUCTION: 80,
  READY_FOR_SCALE: 90,
  IN_SCALE: 100,
  IN_PRODUCTION: 105,
  QC_PENDING: 110,
  // Fulfillment & Shipping:
  READY_TO_SEND_VENDOR: 120,
  FULFILLMENT_READY: 122,
  SENT_TO_VENDOR: 130,
  TRACKING_PENDING: 140,
  // Terminal / completed:
  SHIPPED: 200,
  DELIVERED: 210,
  CANCELLED: 300,
  REFUNDED: 310,
  FAILED: 320,
}

export function orderStatusTone(status?: string | null): StatusTagProps['status'] {
  const normalized = (status ?? '').toUpperCase()
  if (['SHIPPED', 'DELIVERED', 'FULFILLED'].includes(normalized)) return 'operational'
  if (['CANCELLED', 'REFUNDED'].includes(normalized)) return 'cancelled'
  if (
    [
      'OPEN_CASE',
      'NEED_ADDRESS',
      'QC_REJECTED',
      'FAILED',
      'ON_HOLD',
      'ADDRESS_INVALID',
      'INVALID',
    ].includes(normalized)
  ) {
    return 'critical'
  }
  if (
    [
      'READY_TO_SEND_VENDOR',
      'FULFILLMENT_READY',
      'READY',
      'APPROVED',
      'VALID',
      'OVERRIDDEN',
      'PRESENT',
    ].includes(normalized)
  ) {
    return 'approved'
  }
  if (
    ['IN_SCALE', 'READY_FOR_SCALE', 'SENT_TO_VENDOR', 'IN_PRODUCTION', 'PROCESSING'].includes(
      normalized,
    )
  ) {
    return 'processing'
  }
  return 'pending'
}

export function formatOrderStatusLabel(status: string | null | undefined, t?: Translate) {
  const normalizedStatus = status ?? 'OPEN'
  if (!t) return humanizeCode(normalizedStatus)

  return t(`orders.statuses.${normalizedStatus}`, {
    defaultValue: humanizeCode(normalizedStatus),
  })
}

export function formatStageLabel(stage: string | null | undefined, t?: Translate): string {
  if (!stage) return '—'
  const normalized = stage.toUpperCase()
  if (!t) return humanizeCode(normalized)
  return t(`orders.stages.${normalized}`, {
    defaultValue: t(`orders.statuses.${normalized}`, {
      defaultValue: humanizeCode(normalized),
    }),
  })
}

export interface OrderWorkbenchItemLike {
  item?: {
    id?: string
    sku?: string | null
    sourceSku?: string | null
    status?: string | null
  } | null
  workflow?: {
    stage?: string | null
    owner?: string | null
    blockers?: Array<{ code?: string }>
  } | null
}

export interface OrderBottleneckInfo {
  bottleneckStage: string
  stageCount: number
  totalItems: number
  isMixed: boolean
  displayLabel: string
  tone: StatusTagProps['status']
  itemsBreakdown: Array<{
    id: string
    sku: string
    stage: string
    stageLabel: string
    isBottleneck: boolean
  }>
}

export function getOrderBottleneckStage(
  items: OrderWorkbenchItemLike[] = [],
  t?: Translate,
): OrderBottleneckInfo | null {
  if (!items || items.length === 0) return null

  const isTerminal = (s: string) => ['CANCELLED', 'REFUNDED', 'FAILED'].includes(s)
  const getItemStage = (it: OrderWorkbenchItemLike) =>
    (it.workflow?.stage || it.item?.status || 'PROCESSING').toUpperCase()

  const activeItems = items.filter((it) => !isTerminal(getItemStage(it)))
  const targetItems = activeItems.length > 0 ? activeItems : items

  let minRank = Infinity
  let bottleneckStage = getItemStage(targetItems[0])

  for (const it of targetItems) {
    const stage = getItemStage(it)
    const rank = WORKFLOW_STAGE_PRIORITY[stage] ?? 85
    if (rank < minRank) {
      minRank = rank
      bottleneckStage = stage
    }
  }

  const stageCount = items.filter((it) => getItemStage(it) === bottleneckStage).length
  const totalItems = items.length
  const isMixed = totalItems > 1 && stageCount < totalItems
  const stageLabel = formatStageLabel(bottleneckStage, t)

  const displayLabel = isMixed ? `${stageLabel} (${stageCount}/${totalItems})` : stageLabel
  const tone = orderStatusTone(bottleneckStage)

  const itemsBreakdown = items.map((it, idx) => {
    const stage = getItemStage(it)
    return {
      id: it.item?.id || String(idx),
      sku: it.item?.sku || it.item?.sourceSku || `Item ${idx + 1}`,
      stage,
      stageLabel: formatStageLabel(stage, t),
      isBottleneck: stage === bottleneckStage,
    }
  })

  return {
    bottleneckStage,
    stageCount,
    totalItems,
    isMixed,
    displayLabel,
    tone,
    itemsBreakdown,
  }
}

export function formatPsdStatusLabel(status: string | null | undefined, t?: Translate) {
  if (!status) return '—'
  if (!t) return humanizeCode(status)
  return t(`orders.psdStatuses.${status}`, {
    defaultValue: humanizeCode(status),
  })
}

export function formatAddressStatusLabel(status: string | null | undefined, t?: Translate) {
  if (!status) return '—'
  if (!t) return humanizeCode(status)
  return t(`orders.addressStatuses.${status}`, {
    defaultValue: humanizeCode(status),
  })
}

export function formatTimelineEventLabel(eventType: string | null | undefined, t?: Translate) {
  if (!eventType) return '—'
  if (!t) return humanizeCode(eventType)
  return t(`orders.history.events.${eventType}`, {
    defaultValue: humanizeCode(eventType),
  })
}

export function formatTimelineBlockerLabel(blocker: string | null | undefined, t?: Translate) {
  if (!blocker) return '—'
  if (!t) return humanizeCode(blocker)
  return t(`orders.history.blockersList.${blocker}`, {
    defaultValue: humanizeCode(blocker),
  })
}

export function formatCaseTypeLabel(caseType: string | null | undefined, t?: Translate) {
  if (!caseType) return '—'
  if (!t) return humanizeCode(caseType)
  return t(`orders.case.types.${caseType}`, {
    defaultValue: humanizeCode(caseType),
  })
}

export function formatCaseSeverityLabel(severity: string | null | undefined, t?: Translate) {
  if (!severity) return '—'
  if (!t) return humanizeCode(severity)
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
