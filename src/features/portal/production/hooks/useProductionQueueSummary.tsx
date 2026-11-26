import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { type UiButtonTabItem, UiTabLabel } from '@/shared/ui'
import type { ProductionStatus, ProductionTask } from '../api/productionApi'
import type { ProductionTab, ViewMode } from '../components/ProductionWorkbenchColumns'

const SCALE_STATUSES: ProductionStatus[] = ['NEED_SCALE', 'QC_REJECTED', 'BLOCKED']

export interface QueueSummaryData {
  total?: number
  blocked?: number
  needScale?: number
  qcPending?: number
  qcRejected?: number
  ready?: number
  sent?: number
  cancelled?: number
  scaleQueue?: number
  qcQueue?: number
  unassigned?: number
  unclassified?: number
}

export interface UseProductionQueueSummaryOptions {
  tab: ProductionTab
  viewMode: ViewMode
  deferredSearch?: string
  summaryRows: ProductionTask[]
  tasksTotal?: number
  summaryTotal?: number
  summaryData?: QueueSummaryData
  queueCountsData?: QueueSummaryData
}

export function useProductionQueueSummary({
  tab,
  viewMode,
  deferredSearch,
  summaryRows,
  tasksTotal,
  summaryTotal,
  summaryData,
  queueCountsData,
}: UseProductionQueueSummaryOptions) {
  const { t } = useTranslation()

  const displaySummary = useMemo(() => {
    if ((summaryTotal ?? 0) > 0 || summaryRows.length === 0) return summaryData
    const orderMap = new Map<string, ProductionTask[]>()
    for (const task of summaryRows) {
      const orderKey = task.orderItem?.externalOrderId || task.order?.id || task.id
      const existing = orderMap.get(orderKey)
      if (!existing) {
        orderMap.set(orderKey, [task])
      } else {
        existing.push(task)
      }
    }
    const orders = Array.from(orderMap.values())
    return {
      total: tasksTotal ?? orders.length,
      blocked: orders.filter((items) => items.some((task) => task.status === 'BLOCKED')).length,
      needScale: orders.filter((items) => items.some((task) => task.status === 'NEED_SCALE'))
        .length,
      qcPending: orders.filter((items) =>
        items.some((task) => task.status === 'QC_PENDING' || task.qcStatus === 'PENDING'),
      ).length,
      qcRejected: orders.filter((items) =>
        items.some((task) => task.status === 'QC_REJECTED' || task.qcStatus === 'REJECTED'),
      ).length,
      ready: orders.filter((items) => items.some((task) => task.status === 'READY_TO_SEND_VENDOR'))
        .length,
      sent: orders.filter((items) => items.every((task) => task.status === 'SENT_TO_VENDOR'))
        .length,
      cancelled: orders.filter((items) => items.every((task) => task.status === 'CANCELLED'))
        .length,
      scaleQueue: orders.filter((items) =>
        items.some((task) => SCALE_STATUSES.includes(task.status)),
      ).length,
      qcQueue: orders.filter((items) => items.some((task) => task.qcStatus === 'PENDING')).length,
      unclassified: orders.filter((items) =>
        items.some((task) => !task.designType && SCALE_STATUSES.includes(task.status)),
      ).length,
    }
  }, [summaryData, summaryRows, summaryTotal, tasksTotal])

  const searchOrderSummary = useMemo(() => {
    if (!deferredSearch) return null
    const orderMap = new Map<string, ProductionTask[]>()
    for (const task of summaryRows) {
      const orderKey = task.orderItem?.externalOrderId || task.order?.id || task.id
      const existing = orderMap.get(orderKey)
      if (!existing) {
        orderMap.set(orderKey, [task])
      } else {
        existing.push(task)
      }
    }

    const orders = Array.from(orderMap.values())
    const total = orders.length
    const blocked = orders.filter((items) => items.some((it) => it.status === 'BLOCKED')).length
    const needScale = orders.filter((items) =>
      items.some((it) => it.status === 'NEED_SCALE'),
    ).length
    const qcPending = orders.filter((items) =>
      items.some((it) => it.status === 'QC_PENDING' || it.qcStatus === 'PENDING'),
    ).length
    const qcRejected = orders.filter((items) =>
      items.some((it) => it.status === 'QC_REJECTED' || it.qcStatus === 'REJECTED'),
    ).length
    const ready = orders.filter((items) =>
      items.some((it) => it.status === 'READY_TO_SEND_VENDOR'),
    ).length
    const sent = orders.filter((items) =>
      items.every((it) => it.status === 'SENT_TO_VENDOR'),
    ).length
    const cancelled = orders.filter((items) =>
      items.every((it) => it.status === 'CANCELLED'),
    ).length
    const scaleQueue = orders.filter((items) =>
      items.some((it) => SCALE_STATUSES.includes(it.status)),
    ).length
    const qcQueue = orders.filter((items) =>
      items.some(
        (it) =>
          it.status !== 'CANCELLED' && (it.qcStatus === 'PENDING' || it.status === 'QC_PENDING'),
      ),
    ).length
    const unclassified = orders.filter((items) =>
      items.some((it) => !it.designType && SCALE_STATUSES.includes(it.status)),
    ).length

    return {
      total,
      blocked,
      needScale,
      qcPending,
      qcRejected,
      ready,
      sent,
      cancelled,
      scaleQueue,
      qcQueue,
      unclassified,
    }
  }, [deferredSearch, summaryRows])

  const queueSummary = useMemo(() => {
    if (searchOrderSummary) {
      return searchOrderSummary
    }
    return {
      ...displaySummary,
      total: queueCountsData?.total ?? displaySummary?.total ?? 0,
      blocked: queueCountsData?.blocked ?? displaySummary?.blocked ?? 0,
      scaleQueue: queueCountsData?.scaleQueue ?? displaySummary?.scaleQueue ?? 0,
      qcQueue: queueCountsData?.qcQueue ?? displaySummary?.qcQueue ?? 0,
      qcPending:
        queueCountsData?.qcPending ?? displaySummary?.qcPending ?? queueCountsData?.qcQueue ?? 0,
      qcRejected: queueCountsData?.qcRejected ?? displaySummary?.qcRejected ?? 0,
      needScale: queueCountsData?.needScale ?? displaySummary?.needScale ?? 0,
      ready: queueCountsData?.ready ?? displaySummary?.ready ?? 0,
      sent: queueCountsData?.sent ?? displaySummary?.sent ?? 0,
      cancelled: queueCountsData?.cancelled ?? displaySummary?.cancelled ?? 0,
      unassigned: queueCountsData?.unassigned ?? 0,
      unclassified: queueCountsData?.unclassified ?? displaySummary?.unclassified ?? 0,
    }
  }, [displaySummary, queueCountsData, searchOrderSummary])

  const scaleTabItems = useMemo<UiButtonTabItem<ProductionTab>[]>(() => {
    const scaleTotal =
      (queueSummary.needScale ?? 0) +
      (queueSummary.qcRejected ?? 0) +
      (queueSummary.qcPending ?? 0) +
      (queueSummary.ready ?? 0) +
      (queueSummary.sent ?? 0) +
      (queueSummary.blocked ?? 0)
    return [
      {
        value: 'all',
        label: (
          <UiTabLabel count={scaleTotal} active={tab === 'all'}>
            {t('portal.production.allQueue', { defaultValue: 'Tất cả' })}
          </UiTabLabel>
        ),
      },
      {
        value: 'need_scale',
        label: (
          <UiTabLabel count={queueSummary.needScale ?? 0} active={tab === 'need_scale'}>
            {t('portal.production.needScaleQueue', { defaultValue: 'Cần Scale' })}
          </UiTabLabel>
        ),
      },
      {
        value: 'qc_rejected',
        label: (
          <UiTabLabel count={queueSummary.qcRejected ?? 0} active={tab === 'qc_rejected'}>
            {t('portal.production.qcRejectedQueue', { defaultValue: 'QC từ chối' })}
          </UiTabLabel>
        ),
      },
      {
        value: 'qc_pending',
        label: (
          <UiTabLabel count={queueSummary.qcPending ?? 0} active={tab === 'qc_pending'}>
            {t('portal.production.qcPendingQueue', { defaultValue: 'Đã nộp / Chờ QC' })}
          </UiTabLabel>
        ),
      },
      {
        value: 'sent',
        label: (
          <UiTabLabel
            count={(queueSummary.ready ?? 0) + (queueSummary.sent ?? 0)}
            active={tab === 'sent'}
          >
            {t('portal.production.completedQueue', { defaultValue: 'Đã hoàn thành' })}
          </UiTabLabel>
        ),
      },
      {
        value: 'blocked',
        label: (
          <UiTabLabel count={queueSummary.blocked ?? 0} active={tab === 'blocked'}>
            {t('portal.production.blockedQueue')}
          </UiTabLabel>
        ),
      },
    ]
  }, [
    queueSummary.blocked,
    queueSummary.needScale,
    queueSummary.qcPending,
    queueSummary.qcRejected,
    queueSummary.ready,
    queueSummary.sent,
    tab,
    t,
  ])

  const qcTabItems = useMemo<UiButtonTabItem<ProductionTab>[]>(() => {
    const qcTotal =
      (queueSummary.qcQueue ?? 0) +
      (queueSummary.ready ?? 0) +
      (queueSummary.sent ?? 0) +
      (queueSummary.qcRejected ?? 0)
    return [
      {
        value: 'all',
        label: (
          <UiTabLabel count={qcTotal} active={tab === 'all'}>
            {t('portal.production.allQueue', { defaultValue: 'Tất cả' })}
          </UiTabLabel>
        ),
      },
      {
        value: 'qc',
        label: (
          <UiTabLabel count={queueSummary.qcQueue ?? 0} active={tab === 'qc'}>
            {t('portal.production.qcQueue', { defaultValue: 'Chờ duyệt' })}
          </UiTabLabel>
        ),
      },
      {
        value: 'ready',
        label: (
          <UiTabLabel
            count={(queueSummary.ready ?? 0) + (queueSummary.sent ?? 0)}
            active={tab === 'ready'}
          >
            {t('portal.production.readyQueue', { defaultValue: 'QC đạt' })}
          </UiTabLabel>
        ),
      },
      {
        value: 'qc_rejected',
        label: (
          <UiTabLabel count={queueSummary.qcRejected ?? 0} active={tab === 'qc_rejected'}>
            {t('portal.production.qcRejectedQueue', { defaultValue: 'QC từ chối' })}
          </UiTabLabel>
        ),
      },
    ]
  }, [queueSummary.qcQueue, queueSummary.qcRejected, queueSummary.ready, queueSummary.sent, tab, t])

  const generalTabItems = useMemo<UiButtonTabItem<ProductionTab>[]>(
    () => [
      {
        value: 'all',
        label: (
          <UiTabLabel count={queueSummary.total ?? 0} active={tab === 'all'}>
            {t('portal.production.allQueue')}
          </UiTabLabel>
        ),
      },
      {
        value: 'scale',
        label: (
          <UiTabLabel count={queueSummary.scaleQueue ?? 0} active={tab === 'scale'}>
            {t('portal.production.scaleQueue')}
          </UiTabLabel>
        ),
      },
      {
        value: 'qc',
        label: (
          <UiTabLabel count={queueSummary.qcQueue ?? 0} active={tab === 'qc'}>
            {t('portal.production.qcQueue')}
          </UiTabLabel>
        ),
      },
      {
        value: 'ready',
        label: (
          <UiTabLabel count={queueSummary.ready ?? 0} active={tab === 'ready'}>
            {t('portal.production.readyQueue')}
          </UiTabLabel>
        ),
      },
      {
        value: 'sent',
        label: (
          <UiTabLabel count={queueSummary.sent ?? 0} active={tab === 'sent'}>
            {t('portal.production.sentQueue')}
          </UiTabLabel>
        ),
      },
      {
        value: 'blocked',
        label: (
          <UiTabLabel count={queueSummary.blocked ?? 0} active={tab === 'blocked'}>
            {t('portal.production.blockedQueue')}
          </UiTabLabel>
        ),
      },
      {
        value: 'cancelled',
        label: (
          <UiTabLabel count={queueSummary.cancelled ?? 0} active={tab === 'cancelled'}>
            {t('portal.production.cancelledQueue')}
          </UiTabLabel>
        ),
      },
    ],
    [
      queueSummary.blocked,
      queueSummary.cancelled,
      queueSummary.qcQueue,
      queueSummary.ready,
      queueSummary.scaleQueue,
      queueSummary.sent,
      queueSummary.total,
      tab,
      t,
    ],
  )

  const baseTabItems =
    viewMode === 'scale' ? scaleTabItems : viewMode === 'qc' ? qcTabItems : generalTabItems

  const activeTabItems =
    viewMode === 'qc'
      ? baseTabItems
      : [
          ...baseTabItems.slice(0, 2),
          {
            value: 'unassigned' as const,
            label: (
              <UiTabLabel count={queueCountsData?.unassigned} active={tab === 'unassigned'}>
                {t('taskQueue.unassigned')}
              </UiTabLabel>
            ),
          },
          ...baseTabItems.slice(2),
        ]

  return {
    queueSummary,
    activeTabItems,
  }
}
