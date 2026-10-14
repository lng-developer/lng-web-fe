/* eslint-disable react-hooks/preserve-manual-memoization -- stable React state setters are intentionally wrapped for memoized workbench children */
import { type Key, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useRouteLoaderData, useSearchParams } from 'react-router-dom'
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  ScissorOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Modal } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { canUseScopedPermission } from '@/shared/auth/permissions'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  CopyableOrderId,
  FeedbackAlert,
  FormattedDateTime,
  MetricCard,
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
  listProductionTasks,
  getProductionTask,
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
import { isForbiddenProductionError } from './productionAuthorization'
import styles from './ProductionWorkbenchPage.module.scss'

const PAGE_SIZE = DEFAULT_PAGE_SIZE
type ProductionTab = 'scale' | 'blocked' | 'qc'
const SALES_CHANNEL_BY_QUERY: Record<string, 'AMAZON' | 'ETSY'> = {
  amazon: 'AMAZON',
  etsy: 'ETSY',
}
const SCALE_STATUSES: ProductionStatus[] = ['NEED_SCALE', 'QC_REJECTED', 'BLOCKED']
const BLOCKED_STATUSES: ProductionStatus[] = ['BLOCKED']
const QC_STATUSES: ProductionStatus[] = [
  'QC_PENDING',
  'READY_TO_SEND_VENDOR',
  'SENT_TO_VENDOR',
  'BLOCKED',
  'CANCELLED',
]

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
  if (['QC_REJECTED', 'REJECTED', 'BLOCKED'].includes(status)) return 'critical'
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
  const requestedTab = searchParams.get('queue')
  const dedicatedTab: ProductionTab | undefined =
    dedicatedTabProp ??
    (['scale', 'blocked', 'qc'].includes(routeQueue ?? '')
      ? (routeQueue as ProductionTab)
      : undefined)
  const queryTab: ProductionTab | undefined = ['scale', 'blocked', 'qc'].includes(
    requestedTab ?? '',
  )
    ? (requestedTab as ProductionTab)
    : undefined
  const tab: ProductionTab = dedicatedTab ?? queryTab ?? 'scale'
  const isBlockedData = dedicatedTab ? queryTab === 'blocked' : tab === 'blocked'
  const salesChannelCode =
    SALES_CHANNEL_BY_QUERY[searchParams.get('salesChannelCode')?.toLowerCase() ?? '']
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState<ProductionStatus>()
  const [scaleDifficultyLevel, setScaleDifficultyLevel] = useState<'NORMAL' | 'HARD' | 'SPECIAL'>()
  const [createdDates, setCreatedDates] = useState<DateRangeValue>({})
  const [inspect, setInspect] = useState<{
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
      (canUseScopedPermission(account, 'PRODUCTION:SCALE_WORK', {
        scopeType: 'shop',
        scopeId: task.shopId ?? task.shop?.id,
      }) &&
        Boolean(currentAccountId) &&
        task.csAssigneeId === currentAccountId),
    [account, canWriteProductionTask, currentAccountId],
  )
  const canQcTask = useCallback(
    (task: ProductionTask) =>
      canWriteProductionTask(task) ||
      canUseScopedPermission(account, 'PRODUCTION:QC_REVIEW', {
        scopeType: 'shop',
        scopeId: task.shopId ?? task.shop?.id,
      }),
    [account, canWriteProductionTask],
  )
  const canAssignScale =
    tab === 'scale' && (allowed.has('PRODUCTION:WRITE') || allowed.has('PRODUCTION:SCALE_ASSIGN'))
  const canAssignProductionTask = useCallback(
    (task: ProductionTask) =>
      canWriteProductionTask(task) ||
      canUseScopedPermission(account, 'PRODUCTION:SCALE_ASSIGN', {
        scopeType: 'shop',
        scopeId: task.shopId ?? task.shop?.id,
      }),
    [account, canWriteProductionTask],
  )
  const filters = useMemo(
    () => ({
      search: deferredSearch || undefined,
      salesChannelCode,
      psdReadyOnly: tab !== 'blocked' && !isBlockedData,
      ...createdDates,
      scaleDifficultyLevel,
      status: isBlockedData ? ('BLOCKED' as const) : status,
      view: isBlockedData ? undefined : tab === 'qc' ? ('QC' as const) : ('SCALE' as const),
    }),
    [
      createdDates,
      deferredSearch,
      isBlockedData,
      salesChannelCode,
      scaleDifficultyLevel,
      status,
      tab,
    ],
  )
  const params = useMemo(() => ({ ...filters, page, limit: pageSize }), [filters, page, pageSize])
  const summaryFilters = useMemo(
    () => ({
      search: deferredSearch || undefined,
      salesChannelCode,
      psdReadyOnly: tab !== 'blocked' && !isBlockedData,
      ...createdDates,
      status: isBlockedData ? ('BLOCKED' as const) : status,
      view: isBlockedData ? undefined : ((tab === 'qc' ? 'QC' : 'SCALE') as 'QC' | 'SCALE'),
    }),
    [createdDates, deferredSearch, isBlockedData, salesChannelCode, status, tab],
  )
  const queueFilters = useMemo(
    () => ({ search: deferredSearch || undefined, salesChannelCode }),
    [deferredSearch, salesChannelCode],
  )
  const statusOptions = useMemo(
    () =>
      (tab === 'blocked' ? BLOCKED_STATUSES : tab === 'scale' ? SCALE_STATUSES : QC_STATUSES).map(
        (value) => ({
          value,
          label: t(`portal.production.statuses.${value}`),
        }),
      ),
    [tab, t],
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
      ready: summaryRows.filter((task) => task.status === 'READY_TO_SEND_VENDOR').length,
      scaleQueue: summaryRows.filter((task) => SCALE_STATUSES.includes(task.status)).length,
      qcQueue: summaryRows.filter((task) => task.qcStatus === 'PENDING').length,
    }
  }, [summary.data, summaryRows, tasks.data?.total])
  const queueSummary = useMemo(
    () => ({
      ...displaySummary,
      blocked: queueCounts.data?.blocked ?? 0,
      scaleQueue: queueCounts.data?.scaleQueue ?? 0,
      qcQueue: queueCounts.data?.qcQueue ?? 0,
      qcPending: queueCounts.data?.qcQueue ?? 0,
    }),
    [displaySummary, queueCounts.data],
  )
  const queueTabItems = useMemo<UiButtonTabItem<ProductionTab>[]>(
    () => [
      {
        value: 'scale',
        label: (
          <UiTabLabel count={queueSummary.scaleQueue ?? 0} active={tab === 'scale'}>
            {t('portal.production.scaleQueue')}
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
        value: 'qc',
        label: (
          <UiTabLabel count={queueSummary.qcQueue ?? 0} active={tab === 'qc'}>
            {t('portal.production.qcQueue')}
          </UiTabLabel>
        ),
      },
    ],
    [queueSummary.blocked, queueSummary.qcQueue, queueSummary.scaleQueue, tab, t],
  )
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
      if (value === 'scale') nextSearchParams.delete('queue')
      else nextSearchParams.set('queue', value)
      setSearchParams(nextSearchParams, { replace: true })
      setPage(1)
      setStatus(undefined)
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
  const handleStatusChange = useCallback((value?: ProductionStatus) => {
    setStatus(value)
    setPage(1)
  }, [])
  const handleSalesChannelChange = useCallback(
    (value: string | number) => {
      const nextSearchParams = new URLSearchParams(searchParams)
      if (value === 'AMAZON' || value === 'ETSY') {
        nextSearchParams.set('salesChannelCode', value.toLowerCase())
      } else {
        nextSearchParams.delete('salesChannelCode')
      }
      setSearchParams(nextSearchParams, { replace: true })
      setPage(1)
      setSelectedRowKeys([])
    },
    [searchParams, setSearchParams],
  )
  const handleBlockedMetricClick = useCallback(() => handleTabChange('blocked'), [handleTabChange])
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
        ...createdDates,
        scaleDifficultyLevel,
        status,
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
          const value = tab === 'qc' ? row.qcStatus : row.status
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
    [t, tab],
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
      <div className={styles.metrics}>
        <MetricCard
          icon={<AppstoreOutlined />}
          variant="neutral"
          label={t('portal.production.metrics.total')}
          value={displaySummary?.total ?? 0}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<ScissorOutlined />}
          variant="warning"
          label={t('portal.production.metrics.needScale')}
          value={displaySummary?.needScale ?? 0}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<ClockCircleOutlined />}
          variant="info"
          label={t('portal.production.metrics.qcPending')}
          value={queueSummary.qcPending ?? 0}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<WarningOutlined />}
          variant="danger"
          label={t('portal.production.metrics.block')}
          value={queueSummary.blocked ?? 0}
          loading={summary.isLoading}
          onClick={handleBlockedMetricClick}
        />
      </div>
      <div className={styles.workspace}>
        {dedicatedTab ? null : (
          <div className={styles.queueToolbar}>
            <UiButtonTabs
              className={styles.queueTabs}
              value={tab}
              onChange={handleTabChange}
              items={queueTabItems}
            />
            <UiButtonTabs
              className={styles.channelFilter}
              value={salesChannelCode ?? 'ALL'}
              items={[
                { label: t('portal.production.channelAll'), value: 'ALL' },
                { label: 'Amazon', value: 'AMAZON' },
                { label: 'Etsy', value: 'ETSY' },
              ]}
              onChange={handleSalesChannelChange}
            />
          </div>
        )}
        <section className={styles.queuePane} aria-label={t('portal.production.title')}>
          <ProductionWorkbenchFilterBar
            search={search}
            status={status}
            scaleDifficultyLevel={scaleDifficultyLevel}
            dates={createdDates}
            tab={tab}
            statusOptions={statusOptions}
            scaleAssigneeId={scaleAssigneeId}
            canAssignScale={canAssignScale}
            scaleAssigneeOptions={scaleAssigneeOptions}
            selectedRowCount={selectedRowKeys.length}
            exportCsvLoading={exportCsv.isPending}
            exportQcLoading={exportQc.isPending}
            recheckLoading={operations.isPending}
            reassignLoading={operations.isPending}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            onStatusChange={handleStatusChange}
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
