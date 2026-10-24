/* eslint-disable react-hooks/preserve-manual-memoization -- stable React state setters are intentionally wrapped for memoized workbench children */
import { type Key, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Modal } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { canUseScopedPermission, hasScopedPermission } from '@/shared/auth/permissions'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  CopyableOrderId,
  FeedbackAlert,
  FormattedDateTime,
  StatusTag,
  type DateRangeValue,
  type UiButtonTabItem,
  UiButtonTabs,
  UiTabLabel,
  useFeedbackToast,
  useResourceSelection,
} from '@/shared/ui'

import {
  assignProductionTask,
  bulkAssignProductionTasks,
  exportProductionQcTasks,
  exportProductionTasksCsv,
  type FileCheck,
  type FileDecision,
  getProductionTask,
  listProductionTasks,
  listScaleAssignees,
  type ProductionStatus,
  type ProductionTask,
  recheckPsdBlockedTasks,
  submitProductionQc,
  submitScaleForQc,
  summarizeProductionQueueCounts,
  summarizeProductionTasks,
  updateDesignNote,
  uploadScaledOutput,
} from '../api/productionApi'
import { productionKeys } from '../api/productionKeys'
import { ArtworkInspector } from './ArtworkInspector'
import { inspectionReference } from './inspectionReference'
import { ProductionWorkbenchExpandedRow } from './ProductionWorkbenchExpandedRow'
import { ProductionWorkbenchFilterBar } from './ProductionWorkbenchFilterBar'
import { isForbiddenProductionError, isOwnProductionOutput } from './productionAuthorization'
import styles from './ProductionWorkbenchPage.module.scss'

const PAGE_SIZE = DEFAULT_PAGE_SIZE
const PRODUCTION_TABS = [
  'all',
  'scale',
  'need_scale',
  'qc_rejected',
  'unclassified',
  'qc_pending',
  'qc',
  'ready',
  'sent',
  'blocked',
  'cancelled',
] as const
type ProductionTab = (typeof PRODUCTION_TABS)[number]
type ViewMode = 'scale' | 'qc' | 'general'
const SALES_CHANNEL_BY_QUERY: Record<string, 'AMAZON' | 'ETSY'> = {
  amazon: 'AMAZON',
  etsy: 'ETSY',
}
const SCALE_STATUSES: ProductionStatus[] = ['NEED_SCALE', 'QC_REJECTED', 'BLOCKED']

function permissions(account?: CurrentAccount) {
  return new Set(
    account
      ? [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)]
      : [],
  )
}

function tone(status: string) {
  if (['PASSED', 'SENT_TO_VENDOR'].includes(status)) return 'operational'
  if (['READY_TO_SEND_VENDOR'].includes(status)) return 'ready'
  if (['QC_PENDING', 'PENDING', 'NEED_SCALE'].includes(status)) return 'processing'
  if (['QC_REJECTED', 'REJECTED', 'BLOCKED', 'CANCELLED'].includes(status)) return 'critical'
  return 'pending'
}

export function ProductionWorkbenchPage({
  account: accountProp,
  dedicatedTab: dedicatedTabProp,
}: {
  readonly account?: CurrentAccount
  readonly dedicatedTab?: ProductionTab
}) {
  const { t } = useTranslation()
  const loadedAccount = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const account = accountProp ?? loadedAccount
  const allowed = permissions(account)
  const currentAccountId = account?.account.id
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [targetId, selectTarget] = useResourceSelection()
  const target = useQuery({
    queryKey: ['production', 'notification-target', targetId],
    queryFn: () => getProductionTask(targetId!),
    enabled: Boolean(targetId),
    retry: false,
  })
  const [searchParams, setSearchParams] = useSearchParams()
  const { queue: routeQueue } = useParams()
  const requestedTab = searchParams.get('queue') as ProductionTab | null
  const viewMode: ViewMode = useMemo(() => {
    if (dedicatedTabProp === 'scale' || routeQueue === 'scale') return 'scale'
    if (dedicatedTabProp === 'qc' || routeQueue === 'qc') return 'qc'
    return 'general'
  }, [dedicatedTabProp, routeQueue])

  const tab: ProductionTab = useMemo(() => {
    if (viewMode === 'scale') {
      const validTabs: ProductionTab[] = [
        'all',
        'need_scale',
        'qc_rejected',
        'unclassified',
        'qc_pending',
        'ready',
        'sent',
        'blocked',
        'cancelled',
      ]
      return requestedTab && validTabs.includes(requestedTab) ? requestedTab : 'all'
    }
    if (viewMode === 'qc') {
      const validTabs: ProductionTab[] = [
        'all',
        'qc',
        'ready',
        'qc_rejected',
        'sent',
        'blocked',
        'cancelled',
      ]
      return requestedTab && validTabs.includes(requestedTab) ? requestedTab : 'all'
    }
    if (requestedTab && PRODUCTION_TABS.includes(requestedTab)) {
      return requestedTab
    }
    if (routeQueue && PRODUCTION_TABS.includes(routeQueue as ProductionTab)) {
      return routeQueue as ProductionTab
    }
    return 'all'
  }, [viewMode, requestedTab, routeQueue])
  const salesChannelCode =
    SALES_CHANNEL_BY_QUERY[searchParams.get('salesChannelCode')?.toLowerCase() ?? '']
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [scaleDifficultyLevel, setScaleDifficultyLevel] = useState<'NORMAL' | 'HARD' | 'SPECIAL'>()
  const [createdDates, setCreatedDates] = useState<DateRangeValue>({})
  const [inspect, setInspect] = useState<{
    task?: ProductionTask
    check: FileCheck
    originalInputUrl?: string | null
    originalInputLabel?: string | null
    listingReferenceUrl?: string | null
    readonly?: boolean
  }>()
  const [decisions, setDecisions] = useState<Record<string, FileDecision>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [scaleAssigneeId, setScaleAssigneeId] = useState<string>()
  const [uploadingFileCheckIds, setUploadingFileCheckIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const canWriteProductionTask = useCallback(
    (task: ProductionTask) =>
      canUseScopedPermission(account, 'PRODUCTION:WRITE', {
        scopeType: 'shop',
        scopeId: task.shopId ?? task.shop?.id,
      }),
    [account],
  )
  const canScaleTask = useCallback(
    (task: ProductionTask) =>
      canWriteProductionTask(task) ||
      canUseScopedPermission(account, 'PRODUCTION:SCALE_WORK', {
        scopeType: 'shop',
        scopeId: task.shopId ?? task.shop?.id,
      }) ||
      (allowed.has('DESIGN:WORK') &&
        Boolean(currentAccountId) &&
        (task.assignedDesignUserId === currentAccountId || !task.assignedDesignUserId)),
    [account, allowed, canWriteProductionTask, currentAccountId],
  )
  const canQcTask = useCallback(
    (task: ProductionTask) =>
      !isOwnProductionOutput(task, currentAccountId) &&
      (canWriteProductionTask(task) ||
        hasScopedPermission(account, 'PRODUCTION:QC_REVIEW', 'team') ||
        canUseScopedPermission(account, 'PRODUCTION:QC_REVIEW', {
          scopeType: 'shop',
          scopeId: task.shopId ?? task.shop?.id,
        })),
    [account, canWriteProductionTask, currentAccountId],
  )
  const isScaleTab = tab === 'need_scale' || tab === 'qc_rejected' || tab === 'unclassified'
  const canAssignScale =
    viewMode === 'scale' &&
    (isScaleTab || tab === 'all' || tab === 'blocked') &&
    (allowed.has('PRODUCTION:WRITE') || allowed.has('PRODUCTION:SCALE_ASSIGN'))
  const canAssignProductionTask = useCallback(
    (task: ProductionTask) =>
      canWriteProductionTask(task) ||
      hasScopedPermission(account, 'PRODUCTION:SCALE_ASSIGN', 'team') ||
      canUseScopedPermission(account, 'PRODUCTION:SCALE_ASSIGN', {
        scopeType: 'shop',
        scopeId: task.shopId ?? task.shop?.id,
      }),
    [account, canWriteProductionTask],
  )
  const filters = useMemo(() => {
    let filterStatus: ProductionStatus | undefined = undefined
    let filterDesignType: 'NORMAL' | 'UNCLASSIFIED' | undefined = undefined
    let filterView: 'SCALE' | 'QC' | undefined = undefined
    let psdReadyOnly = false

    if (viewMode === 'scale') {
      if (tab === 'need_scale') {
        filterView = 'SCALE'
        filterStatus = 'NEED_SCALE'
        filterDesignType = 'NORMAL'
        psdReadyOnly = true
      } else if (tab === 'qc_rejected') {
        filterView = 'SCALE'
        filterStatus = 'QC_REJECTED'
        filterDesignType = 'NORMAL'
        psdReadyOnly = true
      } else if (tab === 'unclassified') {
        filterView = 'SCALE'
        filterDesignType = 'UNCLASSIFIED'
        psdReadyOnly = true
      } else if (tab === 'blocked') {
        filterStatus = 'BLOCKED'
        psdReadyOnly = false
      } else if (tab === 'qc_pending') {
        filterStatus = 'QC_PENDING'
        psdReadyOnly = false
      } else if (tab === 'ready') {
        filterStatus = 'READY_TO_SEND_VENDOR'
        psdReadyOnly = false
      } else if (tab === 'sent') {
        filterStatus = 'SENT_TO_VENDOR'
        psdReadyOnly = false
      } else if (tab === 'cancelled') {
        filterStatus = 'CANCELLED'
        psdReadyOnly = false
      } else {
        filterStatus = undefined
        filterDesignType = undefined
        psdReadyOnly = false
      }
    } else if (viewMode === 'qc') {
      if (tab === 'qc') {
        filterView = 'QC'
        psdReadyOnly = true
      } else if (tab === 'ready') {
        filterStatus = 'READY_TO_SEND_VENDOR'
        psdReadyOnly = false
      } else if (tab === 'qc_rejected') {
        filterStatus = 'QC_REJECTED'
        psdReadyOnly = false
      } else if (tab === 'sent') {
        filterStatus = 'SENT_TO_VENDOR'
        psdReadyOnly = false
      } else if (tab === 'blocked') {
        filterStatus = 'BLOCKED'
        psdReadyOnly = false
      } else if (tab === 'cancelled') {
        filterStatus = 'CANCELLED'
        psdReadyOnly = false
      } else {
        filterStatus = undefined
        psdReadyOnly = false
      }
    } else {
      if (tab === 'scale') {
        filterView = 'SCALE'
        psdReadyOnly = true
      } else if (tab === 'qc') {
        filterView = 'QC'
        psdReadyOnly = true
      } else if (tab === 'ready') {
        filterStatus = 'READY_TO_SEND_VENDOR'
      } else if (tab === 'sent') {
        filterStatus = 'SENT_TO_VENDOR'
      } else if (tab === 'blocked') {
        filterStatus = 'BLOCKED'
      } else if (tab === 'cancelled') {
        filterStatus = 'CANCELLED'
      }
    }

    return {
      search: deferredSearch || undefined,
      salesChannelCode,
      psdReadyOnly: tab !== 'blocked' && psdReadyOnly,
      ...createdDates,
      scaleDifficultyLevel,
      designType: filterDesignType,
      status: filterStatus,
      view: filterView,
    }
  }, [createdDates, deferredSearch, salesChannelCode, scaleDifficultyLevel, tab, viewMode])
  const params = useMemo(() => ({ ...filters, page, limit: pageSize }), [filters, page, pageSize])
  const summaryFilters = useMemo(
    () => ({
      search: deferredSearch || undefined,
      salesChannelCode,
      scaleDifficultyLevel,
      ...createdDates,
    }),
    [createdDates, deferredSearch, salesChannelCode, scaleDifficultyLevel],
  )
  const queueFilters = useMemo(
    () => ({ search: deferredSearch || undefined, salesChannelCode }),
    [deferredSearch, salesChannelCode],
  )
  const tasks = useQuery({
    queryKey: productionKeys.list(params),
    queryFn: () => listProductionTasks(params),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const queueCounts = useQuery({
    queryKey: productionKeys.queueSummary(queueFilters),
    queryFn: () => summarizeProductionQueueCounts(queueFilters),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const summary = useQuery({
    queryKey: productionKeys.summary(summaryFilters),
    queryFn: () => summarizeProductionTasks(summaryFilters),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const summaryRows = useMemo(() => tasks.data?.items ?? [], [tasks.data?.items])
  const displaySummary = useMemo(() => {
    if ((summary.data?.total ?? 0) > 0 || summaryRows.length === 0) return summary.data
    return {
      total: tasks.data?.total ?? summaryRows.length,
      blocked: summaryRows.filter((task) => task.status === 'BLOCKED').length,
      needScale: summaryRows.filter((task) => task.status === 'NEED_SCALE').length,
      qcPending: summaryRows.filter((task) => task.status === 'QC_PENDING').length,
      qcRejected: summaryRows.filter((task) => task.status === 'QC_REJECTED').length,
      ready: summaryRows.filter((task) => task.status === 'READY_TO_SEND_VENDOR').length,
      sent: summaryRows.filter((task) => task.status === 'SENT_TO_VENDOR').length,
      cancelled: summaryRows.filter((task) => task.status === 'CANCELLED').length,
      scaleQueue: summaryRows.filter((task) => SCALE_STATUSES.includes(task.status)).length,
      qcQueue: summaryRows.filter((task) => task.qcStatus === 'PENDING').length,
      unclassified: summaryRows.filter(
        (task) => !task.designType && SCALE_STATUSES.includes(task.status),
      ).length,
    }
  }, [summary.data, summaryRows, tasks.data?.total])
  const queueSummary = useMemo(
    () => ({
      ...displaySummary,
      total: queueCounts.data?.total ?? displaySummary?.total ?? 0,
      blocked: queueCounts.data?.blocked ?? displaySummary?.blocked ?? 0,
      scaleQueue: queueCounts.data?.scaleQueue ?? displaySummary?.scaleQueue ?? 0,
      qcQueue: queueCounts.data?.qcQueue ?? displaySummary?.qcQueue ?? 0,
      qcPending:
        queueCounts.data?.qcPending ?? displaySummary?.qcPending ?? queueCounts.data?.qcQueue ?? 0,
      qcRejected: queueCounts.data?.qcRejected ?? displaySummary?.qcRejected ?? 0,
      needScale: queueCounts.data?.needScale ?? displaySummary?.needScale ?? 0,
      ready: queueCounts.data?.ready ?? displaySummary?.ready ?? 0,
      sent: queueCounts.data?.sent ?? displaySummary?.sent ?? 0,
      cancelled: queueCounts.data?.cancelled ?? displaySummary?.cancelled ?? 0,
      unclassified: queueCounts.data?.unclassified ?? displaySummary?.unclassified ?? 0,
    }),
    [displaySummary, queueCounts.data],
  )
  const scaleTabItems = useMemo<UiButtonTabItem<ProductionTab>[]>(
    () => [
      {
        value: 'all',
        label: (
          <UiTabLabel count={queueSummary.total ?? 0} active={tab === 'all'}>
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
        value: 'unclassified',
        label: (
          <UiTabLabel count={queueSummary.unclassified ?? 0} active={tab === 'unclassified'}>
            {t('portal.production.unclassifiedQueue', { defaultValue: 'Chưa phân loại' })}
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
        value: 'ready',
        label: (
          <UiTabLabel count={queueSummary.ready ?? 0} active={tab === 'ready'}>
            {t('portal.production.readyQueue', { defaultValue: 'QC đạt' })}
          </UiTabLabel>
        ),
      },
      {
        value: 'sent',
        label: (
          <UiTabLabel count={queueSummary.sent ?? 0} active={tab === 'sent'}>
            {t('portal.production.sentQueue', { defaultValue: 'Đã gửi Vendor (Xong)' })}
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
            {t('portal.production.cancelledQueue', { defaultValue: 'Đã hủy' })}
          </UiTabLabel>
        ),
      },
    ],
    [
      queueSummary.blocked,
      queueSummary.cancelled,
      queueSummary.needScale,
      queueSummary.qcPending,
      queueSummary.qcRejected,
      queueSummary.ready,
      queueSummary.sent,
      queueSummary.total,
      queueSummary.unclassified,
      tab,
      t,
    ],
  )
  const qcTabItems = useMemo<UiButtonTabItem<ProductionTab>[]>(
    () => [
      {
        value: 'all',
        label: (
          <UiTabLabel count={queueSummary.total ?? 0} active={tab === 'all'}>
            {t('portal.production.allQueue', { defaultValue: 'Tất cả' })}
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
        value: 'qc_rejected',
        label: (
          <UiTabLabel count={queueSummary.qcRejected ?? 0} active={tab === 'qc_rejected'}>
            {t('portal.production.qcRejectedQueue', { defaultValue: 'QC từ chối' })}
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
            {t('portal.production.cancelledQueue', { defaultValue: 'Đã hủy' })}
          </UiTabLabel>
        ),
      },
    ],
    [
      queueSummary.blocked,
      queueSummary.cancelled,
      queueSummary.qcQueue,
      queueSummary.qcRejected,
      queueSummary.ready,
      queueSummary.sent,
      queueSummary.total,
      tab,
      t,
    ],
  )
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
  const activeTabItems =
    viewMode === 'scale' ? scaleTabItems : viewMode === 'qc' ? qcTabItems : generalTabItems
  const scaleAssignees = useQuery({
    queryKey: productionKeys.scaleAssignees(),
    queryFn: () => listScaleAssignees({ limit: 100 }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: canAssignScale,
    retry: false,
  })
  const scaleAssigneeOptions = useMemo(
    () =>
      (scaleAssignees.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.fullName || item.employeeCode || item.id}${item.employeeCode ? ` · ${item.employeeCode}` : ''}`,
      })),
    [scaleAssignees.data?.items],
  )
  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['production', 'notification-target'] }),
      queryClient.invalidateQueries({ queryKey: productionKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: productionKeys.queueSummaries() }),
      queryClient.invalidateQueries({ queryKey: productionKeys.summaries() }),
    ])
  }, [queryClient])
  const handleMutationError = useCallback(
    async (error: unknown) => {
      if (isForbiddenProductionError(error)) {
        setSelectedRowKeys([])
        setDecisions({})
        await refresh()
      }
      toast('error', error instanceof Error ? error.message : t('portal.production.actionFailed'))
    },
    [refresh, t, toast],
  )
  const handleTabChange = useCallback(
    (value: ProductionTab) => {
      const nextSearchParams = new URLSearchParams(searchParams)
      const isDefault = value === 'all'
      if (isDefault) {
        nextSearchParams.delete('queue')
      } else {
        nextSearchParams.set('queue', value)
      }
      setSearchParams(nextSearchParams, { replace: true })
      setPage(1)
      setScaleDifficultyLevel(undefined)
      setSelectedRowKeys([])
      setDecisions({})
    },
    [searchParams, setSearchParams],
  )
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])
  const handleScaleDifficultyChange = useCallback((value?: 'NORMAL' | 'HARD' | 'SPECIAL') => {
    setScaleDifficultyLevel(value)
    setPage(1)
  }, [])
  const handleCreatedDatesChange = useCallback((value: DateRangeValue) => {
    setCreatedDates(value)
    setPage(1)
  }, [])
  const handlePageChange = useCallback(
    (nextPage: number, nextPageSize: number) => {
      setPage(nextPageSize === pageSize ? nextPage : 1)
      setPageSize(nextPageSize)
    },
    [pageSize],
  )
  const handleScaleAssigneeChange = useCallback((value?: string) => {
    setScaleAssigneeId(value)
  }, [])
  const handleSetInspectionDecision = useCallback(
    (fileCheckId: string, decision: FileDecision['decision'], note?: string) => {
      setDecisions((current) => ({
        ...current,
        [fileCheckId]: {
          fileCheckId,
          decision,
          note,
        },
      }))
    },
    [],
  )
  const action = useMutation({
    mutationFn: async (input: { task: ProductionTask; fileDecisions: FileDecision[] }) => {
      return submitProductionQc(input.task.id, input.fileDecisions)
    },
    onSuccess: async () => {
      await refresh()
      toast('success', t('portal.production.updated'))
    },
    onError: handleMutationError,
  })
  const submitScale = useMutation({
    mutationFn: (taskId: string) => submitScaleForQc(taskId),
    onSuccess: async () => {
      await refresh()
      toast('success', t('portal.production.updated'))
    },
    onError: handleMutationError,
  })
  const saveNote = useMutation({
    mutationFn: (input: { taskId: string; note: string }) =>
      updateDesignNote(input.taskId, input.note),
    onSuccess: async () => {
      await refresh()
      toast('success', t('portal.production.updated'))
    },
    onError: handleMutationError,
  })
  const operations = useMutation({
    mutationFn: async (input: { kind: 'bulk-assign' | 'recheck' }) => {
      const taskIds = selectedTasks.filter(canAssignProductionTask).map((task) => task.id)
      if (input.kind === 'bulk-assign') {
        if (taskIds.length === 1) return assignProductionTask(taskIds[0], scaleAssigneeId!)
        return bulkAssignProductionTasks(taskIds, scaleAssigneeId!)
      }
      return recheckPsdBlockedTasks({ limit: 100 })
    },
    onSuccess: async () => {
      setSelectedRowKeys([])
      await refresh()
      toast('success', t('portal.production.updated'))
    },
    onError: handleMutationError,
  })
  const exportQc = useMutation({
    mutationFn: () =>
      exportProductionQcTasks({
        search: search || undefined,
        salesChannelCode,
        ...createdDates,
        scaleDifficultyLevel,
      }),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result as unknown as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'production-qc-tasks.xls'
      link.click()
      URL.revokeObjectURL(url)
    },
    onError: handleMutationError,
  })
  const exportCsv = useMutation({
    mutationFn: () => exportProductionTasksCsv(params),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result as unknown as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'production-tasks.csv'
      link.click()
      URL.revokeObjectURL(url)
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.production.actionFailed')),
  })
  const handleRecheck = useCallback(() => operations.mutate({ kind: 'recheck' }), [operations])
  const handleExportQc = useCallback(() => exportQc.mutate(), [exportQc])
  const handleExportCsv = useCallback(() => exportCsv.mutate(), [exportCsv])
  const handleBulkAssign = useCallback(
    () => operations.mutate({ kind: 'bulk-assign' }),
    [operations],
  )
  const handleInspectSlot = useCallback(
    (task: ProductionTask, check: FileCheck, readonly = false) => {
      const reference = inspectionReference(task, check)
      setInspect({
        task,
        check,
        originalInputUrl: reference?.url,
        originalInputLabel:
          reference?.type === 'CUSTOMIZATION_ARTWORK'
            ? t('portal.production.customizationArtwork')
            : t('portal.production.customerArtwork'),
        listingReferenceUrl: task.mainListingImageUrl ?? task.productImageUrl,
        readonly,
      })
    },
    [t],
  )
  const handleSaveNote = useCallback(
    (taskId: string, note: string) => saveNote.mutate({ taskId, note }),
    [saveNote],
  )
  const handleSubmitQc = useCallback(
    (task: ProductionTask, fileDecisions: FileDecision[]) => action.mutate({ task, fileDecisions }),
    [action],
  )
  const handleSubmitScaleForQc = useCallback(
    (taskId: string) => submitScale.mutate(taskId),
    [submitScale],
  )
  const handleUploadScaledOutput = useCallback(
    async (taskId: string, fileCheckId: string, file: File) => {
      setUploadingFileCheckIds((current) => new Set(current).add(fileCheckId))
      try {
        await uploadScaledOutput(taskId, fileCheckId, file)
        await refresh()
        toast('success', t('portal.production.updated'))
      } catch (error) {
        await handleMutationError(error)
      } finally {
        setUploadingFileCheckIds((current) => {
          const next = new Set(current)
          next.delete(fileCheckId)
          return next
        })
      }
    },
    [handleMutationError, refresh, t, toast],
  )
  const handleInspectClose = useCallback(() => setInspect(undefined), [])
  const handleInspectionPass = useCallback(
    (note?: string) => {
      if (!inspect) return
      handleSetInspectionDecision(inspect.check.id, 'PASSED', note)
      setInspect(undefined)
    },
    [handleSetInspectionDecision, inspect],
  )
  const handleInspectionReject = useCallback(
    (note: string) => {
      if (!inspect) return
      handleSetInspectionDecision(inspect.check.id, 'REJECTED', note)
      setInspect(undefined)
    },
    [handleSetInspectionDecision, inspect],
  )
  const handleSearchSubmit = useCallback(
    (value: string) => {
      handleSearchChange(value)
    },
    [handleSearchChange],
  )
  const handleInspectionSlotAction = useCallback(
    (task: ProductionTask, check: FileCheck, readonly?: boolean) => {
      handleInspectSlot(task, check, readonly)
    },
    [handleInspectSlot],
  )
  const handleQcSlotPass = useCallback(
    (fileCheckId: string) => handleSetInspectionDecision(fileCheckId, 'PASSED'),
    [handleSetInspectionDecision],
  )
  const renderExpandedRow = useCallback(
    (task: ProductionTask) => (
      <ProductionWorkbenchExpandedRow
        task={task}
        tab={tab}
        viewMode={viewMode}
        canScale={canScaleTask(task)}
        canQc={canQcTask(task)}
        decisions={decisions}
        savingNoteTaskId={saveNote.variables?.taskId}
        submittingQc={action.isPending}
        submittingScale={submitScale.isPending && submitScale.variables === task.id}
        uploadingFileCheckIds={uploadingFileCheckIds}
        onSaveNote={handleSaveNote}
        onSubmitQc={handleSubmitQc}
        onSubmitScaleForQc={handleSubmitScaleForQc}
        onUploadScaledOutput={handleUploadScaledOutput}
        onInspectSlot={handleInspectionSlotAction}
        onPassSlot={handleQcSlotPass}
        onManualSlotUploaded={refresh}
      />
    ),
    [
      action.isPending,
      canQcTask,
      canScaleTask,
      decisions,
      handleInspectionSlotAction,
      handleQcSlotPass,
      handleSaveNote,
      handleSubmitQc,
      handleSubmitScaleForQc,
      handleUploadScaledOutput,
      refresh,
      saveNote.variables?.taskId,
      submitScale.isPending,
      submitScale.variables,
      tab,
      uploadingFileCheckIds,
      viewMode,
    ],
  )
  const displayedTasks = useDeferredValue(tasks.data)
  const rows = useMemo(() => displayedTasks?.items ?? [], [displayedTasks?.items])
  const expandedRowKeys = useMemo(() => rows.map((row) => row.id), [rows])
  const selectedTasks = useMemo(
    () => rows.filter((row) => selectedRowKeys.map(String).includes(row.id)),
    [rows, selectedRowKeys],
  )
  const columns: TableColumnsType<ProductionTask> = useMemo(
    () => [
      {
        title: t('portal.production.columns.order'),
        width: 196,
        render: (_, row) => <CopyableOrderId value={row.orderItem?.externalOrderId} />,
      },
      {
        title: t('portal.production.columns.shop'),
        width: 150,
        render: (_, row) => row.shop?.name || '-',
      },
      {
        title: t('portal.production.requiredSlots'),
        width: 118,
        render: (_, row) => {
          const checks = row.qcPreviewFileChecks || row.fileChecks || []
          return (
            checks
              .filter((check) => check.required && check.sourceType !== 'PSD_TEMPLATE')
              .map((check) => check.slotLabel || check.slotKey)
              .join(', ') || '-'
          )
        },
      },
      {
        title: t('portal.production.psdStatus'),
        width: 132,
        render: (_, row) => {
          const hasInput = (row.qcPreviewFileChecks || row.fileChecks || []).some(
            (check) => check.sourceType === 'PSD_TEMPLATE' && check.inputAssetDownloadUrl,
          )
          return (
            <StatusTag status={hasInput ? 'operational' : 'pending'}>
              {hasInput ? t('portal.production.psdReady') : t('portal.production.psdMissing')}
            </StatusTag>
          )
        },
      },
      {
        title: t('portal.production.blockers'),
        width: 180,
        render: (_, row) => (row.blockers || []).join(', ') || '-',
      },
      {
        title: t('portal.production.columns.scaleDifficulty'),
        width: 96,
        render: (_, row) => {
          const level = row.scaleContext?.use?.listing?.scaleDifficulty?.level || 'NORMAL'
          return (
            <StatusTag status={level === 'NORMAL' ? 'pending' : 'critical'}>
              {t(`portal.production.scaleDifficulties.${level}`, { defaultValue: level })}
            </StatusTag>
          )
        },
      },
      {
        title: t('portal.production.assignedTo'),
        width: 138,
        render: (_, row) =>
          row.assignedDesigner?.fullName ||
          row.assignedDesigner?.employeeCode ||
          t('portal.production.unassigned'),
      },
      {
        title: t('portal.production.columns.status'),
        width: 126,
        render: (_, row) => {
          const value = viewMode === 'qc' || tab === 'qc' ? row.qcStatus : row.status
          return (
            <StatusTag status={tone(value)}>{t(`portal.production.statuses.${value}`)}</StatusTag>
          )
        },
      },
      {
        title: t('portal.production.columns.updated'),
        width: 148,
        render: (_, row) => <FormattedDateTime value={row.updatedAt} />,
      },
    ],
    [t, tab, viewMode],
  )
  return (
    <section className={styles.page}>
      <Modal
        open={Boolean(targetId)}
        loading={target.isLoading}
        onCancel={() => selectTarget(undefined)}
        footer={null}
        width="90vw"
        title={t('notifications.openResource')}
      >
        {target.isError ? (
          <FeedbackAlert type="error" title={t('notifications.resourceUnavailable')} />
        ) : null}
        {target.data ? renderExpandedRow(target.data) : null}
      </Modal>
      {tasks.error || summary.error ? (
        <FeedbackAlert type="error" title={t('portal.production.unavailable')} />
      ) : null}
      <div className={styles.workspace}>
        <div className={styles.queueToolbar}>
          <UiButtonTabs
            className={styles.queueTabs}
            value={tab}
            onChange={handleTabChange}
            items={activeTabItems}
          />
        </div>
        <section className={styles.queuePane} aria-label={t('portal.production.title')}>
          <ProductionWorkbenchFilterBar
            search={search}
            scaleDifficultyLevel={scaleDifficultyLevel}
            dates={createdDates}
            tab={tab}
            viewMode={viewMode}
            scaleAssigneeId={scaleAssigneeId}
            canAssignScale={canAssignScale}
            canRecheckBlocked={allowed.has('PRODUCTION:WRITE')}
            scaleAssigneeOptions={scaleAssigneeOptions}
            selectedRowCount={selectedRowKeys.length}
            exportCsvLoading={exportCsv.isPending}
            exportQcLoading={exportQc.isPending}
            recheckLoading={operations.isPending}
            reassignLoading={operations.isPending}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            onScaleDifficultyChange={handleScaleDifficultyChange}
            onDatesChange={handleCreatedDatesChange}
            onExportCsv={handleExportCsv}
            onExportQc={handleExportQc}
            onRecheck={handleRecheck}
            onScaleAssigneeChange={handleScaleAssigneeChange}
            onBulkAssign={handleBulkAssign}
          />
          <CoreDataTable
            fillViewport
            className={styles.table}
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={tasks.isFetching}
            rowSelection={
              canAssignScale
                ? {
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                    preserveSelectedRowKeys: true,
                    getCheckboxProps: (row) => ({ disabled: !canAssignProductionTask(row) }),
                  }
                : undefined
            }
            pagination={{
              current: page,
              pageSize,
              total: displayedTasks?.total,
              showSizeChanger: true,
              onChange: handlePageChange,
            }}
            scroll={{ x: '100%' }}
            expandable={{
              expandedRowKeys,
              showExpandColumn: false,
              expandedRowRender: (row) => renderExpandedRow(row),
            }}
          />
        </section>
      </div>
      {inspect ? (
        <ArtworkInspector
          task={inspect.task}
          check={inspect.check}
          originalInputUrl={inspect.originalInputUrl}
          originalInputLabel={inspect.originalInputLabel}
          listingReferenceUrl={inspect.listingReferenceUrl}
          readonly={inspect.readonly}
          onClose={handleInspectClose}
          onPass={handleInspectionPass}
          onReject={handleInspectionReject}
        />
      ) : null}
    </section>
  )
}

export default ProductionWorkbenchPage
