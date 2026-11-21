import { type Key, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { canUseScopedPermission, hasScopedPermission } from '@/shared/auth/permissions'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  FeedbackAlert,
  getDefaultDateRange,
  type DateRangeValue,
  UiButtonTabs,
  useFeedbackToast,
  useResourceSelection,
} from '@/shared/ui'

import {
  assignProductionTask,
  bulkAssignProductionTasks,
  claimProductionTask,
  deleteFileCheck,
  exportProductionQcTasks,
  exportProductionTasksCsv,
  type FileCheck,
  type FileDecision,
  getProductionTask,
  listProductionTasks,
  listScaleAssignees,
  type ProductionStatus,
  type ProductionTask,
  type QcStatus,
  recheckPsdBlockedTasks,
  submitProductionQc,
  submitScaleForQc,
  summarizeProductionQueueCounts,
  summarizeProductionTasks,
  updateDesignNote,
  uploadManualScaledOutput,
  uploadScaledOutput,
  type ManualScaledOutput,
} from '../api/productionApi'
import { productionKeys } from '../api/productionKeys'
import {
  InspectState,
  ManualSlotUploadState,
  ProductionWorkbenchActionModals,
} from '../components/ProductionWorkbenchActionModals'
import {
  type ProductionTab,
  useProductionTableColumns,
  type ViewMode,
} from '../components/ProductionWorkbenchColumns'
import { ProductionGroupedOrderRow } from '../components/ProductionGroupedOrderRow'
import { useProductionQueueSummary } from '../hooks/useProductionQueueSummary'
import { inspectionReference } from './inspectionReference'
import { ProductionWorkbenchFilterBar } from './ProductionWorkbenchFilterBar'
import { isForbiddenProductionError, isOwnProductionOutput } from './productionAuthorization'
import {
  formatProductionError,
  formatSlotLabel,
  validateScaledOutputFile,
} from '../utils/productionFeedback'
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
const SALES_CHANNEL_BY_QUERY: Record<string, 'AMAZON' | 'ETSY'> = {
  amazon: 'AMAZON',
  etsy: 'ETSY',
}

function permissions(account?: CurrentAccount) {
  return new Set(
    account
      ? [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)]
      : [],
  )
}

export function ProductionWorkbenchPage({
  account: accountProp,
  dedicatedTab: dedicatedTabProp,
  designType: designTypeProp,
}: {
  readonly account?: CurrentAccount
  readonly dedicatedTab?: ProductionTab
  readonly designType?: 'CUSTOM_IMAGE' | 'NORMAL' | 'UNCLASSIFIED'
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
  const [createdDates, setCreatedDates] = useState<DateRangeValue>(getDefaultDateRange)
  const [inspect, setInspect] = useState<InspectState>()
  const [decisions, setDecisions] = useState<Record<string, FileDecision>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [scaleAssigneeId, setScaleAssigneeId] = useState<string>()
  const [uploadingFileCheckIds, setUploadingFileCheckIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [manualSlotUploadTask, setManualSlotUploadTask] = useState<ManualSlotUploadState | null>(
    null,
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
  const hasTeamDesignReview = hasScopedPermission(account, 'DESIGN:REVIEW', 'team')
  const hasScopedDesignReview =
    hasTeamDesignReview || hasScopedPermission(account, 'DESIGN:REVIEW', 'shop')
  const canAssignScale =
    viewMode === 'scale' &&
    (isScaleTab || tab === 'all' || tab === 'blocked') &&
    (allowed.has('PRODUCTION:WRITE') ||
      allowed.has('PRODUCTION:SCALE_ASSIGN') ||
      allowed.has('DESIGN:REVIEW') ||
      hasScopedDesignReview)
  const canAssignProductionTask = useCallback(
    (task: ProductionTask) =>
      canWriteProductionTask(task) ||
      hasScopedPermission(account, 'PRODUCTION:SCALE_ASSIGN', 'team') ||
      canUseScopedPermission(account, 'PRODUCTION:SCALE_ASSIGN', {
        scopeType: 'shop',
        scopeId: task.shopId ?? task.shop?.id,
      }) ||
      hasScopedPermission(account, 'DESIGN:REVIEW', 'team') ||
      canUseScopedPermission(account, 'DESIGN:REVIEW', {
        scopeType: 'shop',
        scopeId: task.shopId ?? task.shop?.id,
      }),
    [account, canWriteProductionTask],
  )

  const filters = useMemo(() => {
    let filterStatus: ProductionStatus | undefined = undefined
    let filterQcStatus: QcStatus | undefined = undefined
    let filterDesignType: 'NORMAL' | 'UNCLASSIFIED' | undefined = undefined
    let filterView: 'SCALE' | 'QC' | undefined = undefined
    let psdReadyOnly = false

    if (viewMode === 'scale') {
      filterView = 'SCALE'
      if (tab === 'need_scale') {
        filterStatus = 'NEED_SCALE'
        filterDesignType = undefined
        psdReadyOnly = true
      } else if (tab === 'qc_rejected') {
        filterStatus = 'QC_REJECTED'
        filterDesignType = undefined
        psdReadyOnly = true
      } else if (tab === 'blocked') {
        filterStatus = 'BLOCKED'
        psdReadyOnly = false
      } else if (tab === 'qc_pending') {
        filterStatus = 'QC_PENDING'
        psdReadyOnly = false
      } else if (tab === 'sent' || tab === 'ready') {
        filterStatus = 'READY_TO_SEND_VENDOR,SENT_TO_VENDOR' as ProductionStatus
        psdReadyOnly = false
      } else {
        filterStatus = undefined
        filterDesignType = undefined
        psdReadyOnly = false
      }
    } else if (viewMode === 'qc') {
      filterView = 'QC'
      if (tab === 'qc') {
        filterQcStatus = 'PENDING'
        psdReadyOnly = true
      } else if (tab === 'ready' || tab === 'sent') {
        filterQcStatus = 'PASSED'
        psdReadyOnly = false
      } else if (tab === 'qc_rejected') {
        filterQcStatus = 'REJECTED'
        psdReadyOnly = false
      } else {
        filterStatus = undefined
        filterQcStatus = undefined
        psdReadyOnly = false
      }
    } else {
      if (tab === 'scale') {
        filterView = 'SCALE'
        psdReadyOnly = true
      } else if (tab === 'qc') {
        filterView = 'QC'
        filterQcStatus = 'PENDING'
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
      designType: designTypeProp ?? filterDesignType,
      status: filterStatus,
      qcStatus: filterQcStatus,
      view: filterView,
    }
  }, [
    createdDates,
    deferredSearch,
    designTypeProp,
    salesChannelCode,
    scaleDifficultyLevel,
    tab,
    viewMode,
  ])

  const params = useMemo(() => ({ ...filters, page, limit: pageSize }), [filters, page, pageSize])
  const summaryFilters = useMemo(
    () => ({
      search: deferredSearch || undefined,
      salesChannelCode,
      scaleDifficultyLevel,
      designType: designTypeProp,
      ...createdDates,
    }),
    [createdDates, deferredSearch, designTypeProp, salesChannelCode, scaleDifficultyLevel],
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
    queryKey: productionKeys.queueSummary(summaryFilters),
    queryFn: () => summarizeProductionQueueCounts(summaryFilters),
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
  const { activeTabItems } = useProductionQueueSummary({
    tab,
    viewMode,
    deferredSearch,
    summaryRows,
    tasksTotal: tasks.data?.total,
    summaryTotal: summary.data?.total,
    summaryData: summary.data,
    queueCountsData: queueCounts.data,
  })

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
    async (error: unknown, defaultAction?: string) => {
      if (isForbiddenProductionError(error)) {
        setSelectedRowKeys([])
        setDecisions({})
        await refresh()
      }
      const actionName =
        typeof defaultAction === 'string' ? defaultAction : t('portal.production.actionFailed')
      const { title, description } = formatProductionError(error, actionName)
      toast('error', title, description)
    },
    [refresh, t, toast],
  )

  const handleTabChange = useCallback(
    (value: ProductionTab) => {
      const nextSearchParams = new URLSearchParams(searchParams)
      if (value === 'all') {
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
        [fileCheckId]: { fileCheckId, decision, note },
      }))
    },
    [],
  )

  const action = useMutation({
    mutationFn: async (input: { task: ProductionTask; fileDecisions: FileDecision[] }) =>
      submitProductionQc(input.task.id, input.fileDecisions),
    onSuccess: async (_, variables) => {
      await refresh()
      const isAllPassed = variables.fileDecisions.every((d) => d.decision === 'PASSED')
      toast(
        'success',
        t('portal.production.feedback.qcReviewedSuccessTitle'),
        isAllPassed
          ? t('portal.production.feedback.qcPassedDescription')
          : t('portal.production.feedback.qcRejectedDescription'),
      )
    },
    onError: (error) => handleMutationError(error),
  })

  const submitScale = useMutation({
    mutationFn: (taskId: string) => submitScaleForQc(taskId),
    onSuccess: async () => {
      await refresh()
      toast(
        'success',
        t('portal.production.feedback.submitQcSuccessTitle'),
        t('portal.production.feedback.submitQcSuccessDescription'),
      )
    },
    onError: (error) => handleMutationError(error),
  })

  const saveNote = useMutation({
    mutationFn: (input: { taskId: string; note: string }) =>
      updateDesignNote(input.taskId, input.note),
    onSuccess: async () => {
      await refresh()
      toast(
        'success',
        t('portal.production.feedback.saveNoteSuccessTitle'),
        t('portal.production.feedback.saveNoteSuccessDescription'),
      )
    },
    onError: (error) => handleMutationError(error),
  })

  const claimTask = useMutation({
    mutationFn: (taskId: string) => claimProductionTask(taskId),
    onSuccess: async () => {
      await refresh()
      toast(
        'success',
        t('portal.production.taskClaimed', { defaultValue: 'Đã nhận việc thành công' }),
      )
    },
    onError: handleMutationError,
  })

  const displayedTasks = useDeferredValue(tasks.data)
  const rows = useMemo(() => {
    const items = displayedTasks?.items ?? []
    let filtered = items
    if (viewMode === 'qc') {
      filtered = items.filter(
        (task) =>
          task.qcStatus !== 'NOT_READY' &&
          task.status !== 'NEED_SCALE' &&
          task.status !== 'BLOCKED' &&
          task.status !== 'CANCELLED',
      )
    } else if (viewMode === 'scale') {
      if (designTypeProp === 'CUSTOM_IMAGE') {
        filtered = items.filter(
          (task) => task.designType === 'CUSTOM_IMAGE' && task.status !== 'CANCELLED',
        )
      } else {
        filtered = items.filter(
          (task) => task.designType !== 'CUSTOM_IMAGE' && task.status !== 'CANCELLED',
        )
      }
    }

    const orderMap = new Map<string, ProductionTask & { orderTasks: ProductionTask[] }>()
    for (const task of filtered) {
      const orderKey = task.orderItem?.externalOrderId || task.order?.id || task.id
      const existing = orderMap.get(orderKey)
      if (!existing) {
        orderMap.set(orderKey, { ...task, orderTasks: [task] })
      } else {
        existing.orderTasks.push(task)
      }
    }
    return Array.from(orderMap.values())
  }, [designTypeProp, displayedTasks?.items, viewMode])

  const selectedTasks = useMemo(
    () =>
      rows
        .filter((row) => selectedRowKeys.map(String).includes(row.id))
        .flatMap(
          (row) => (row as unknown as { orderTasks?: ProductionTask[] }).orderTasks || [row],
        ),
    [rows, selectedRowKeys],
  )

  const operations = useMutation({
    mutationFn: async (input: { kind: 'bulk-assign' | 'recheck' }) => {
      const taskIds = selectedTasks.filter(canAssignProductionTask).map((task) => task.id)
      if (input.kind === 'bulk-assign') {
        if (taskIds.length === 1) return assignProductionTask(taskIds[0], scaleAssigneeId!)
        return bulkAssignProductionTasks(taskIds, scaleAssigneeId!)
      }
      return recheckPsdBlockedTasks({ limit: 100 })
    },
    onSuccess: async (_, variables) => {
      setSelectedRowKeys([])
      await refresh()
      if (variables.kind === 'bulk-assign') {
        toast(
          'success',
          t('portal.production.feedback.bulkAssignSuccessTitle'),
          t('portal.production.feedback.bulkAssignSuccessDescription'),
        )
      } else {
        toast(
          'success',
          t('portal.production.feedback.recheckBlockedSuccessTitle'),
          t('portal.production.feedback.recheckBlockedSuccessDescription'),
        )
      }
    },
    onError: (error) => handleMutationError(error),
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
    onError: (error) => handleMutationError(error),
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
    onError: (error) => handleMutationError(error),
  })

  const uploadManualSlot = useMutation({
    mutationFn: (input: ManualScaledOutput) =>
      manualSlotUploadTask
        ? uploadManualScaledOutput(manualSlotUploadTask.taskId, input)
        : Promise.reject(new Error('No task selected for upload')),
    onSuccess: async (_, variables) => {
      setManualSlotUploadTask(null)
      await refresh()
      const slotName = formatSlotLabel(variables.slotKey, variables.slotLabel)
      toast(
        'success',
        t('portal.production.feedback.addSlotSuccessTitle'),
        t('portal.production.feedback.addSlotSuccessDescription', { slot: slotName }),
      )
    },
    onError: (error) => {
      const { title, description } = formatProductionError(
        error,
        t('portal.production.feedback.defaultFailedTitle'),
      )
      toast('error', title, description)
    },
  })

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

  const handleUploadScaledOutput = useCallback(
    async (taskId: string, fileCheckId: string, file: File) => {
      const validation = validateScaledOutputFile(file)
      if (!validation.valid) {
        toast('error', validation.errorTitle!, validation.errorDescription)
        return
      }
      setUploadingFileCheckIds((current) => new Set(current).add(fileCheckId))
      try {
        await uploadScaledOutput(taskId, fileCheckId, file)
        await refresh()
        toast(
          'success',
          t('portal.production.feedback.uploadSuccessTitle'),
          t('portal.production.feedback.uploadSuccessDescription'),
        )
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

  const handleDeleteSlot = useCallback(
    async (taskId: string, fileCheckId: string) => {
      try {
        await deleteFileCheck(taskId, fileCheckId)
        await refresh()
        toast(
          'success',
          t('portal.production.feedback.deleteSlotSuccessTitle'),
          t('portal.production.feedback.deleteSlotSuccessDescription'),
        )
      } catch (error) {
        await handleMutationError(error)
      }
    },
    [handleMutationError, refresh, t, toast],
  )

  const columns = useProductionTableColumns({
    tab,
    viewMode,
    allowed,
    claimTask: {
      isPending: claimTask.isPending,
      variables: claimTask.variables,
      mutate: (taskId) => claimTask.mutate(taskId),
    },
  })

  const expandedRowKeys = useMemo(() => rows.map((row) => row.id), [rows])

  const renderExpandedRow = useCallback(
    (rowTask: ProductionTask) => (
      <ProductionGroupedOrderRow
        rowTask={rowTask}
        tab={tab}
        viewMode={viewMode}
        currentUserId={currentAccountId}
        canScaleTask={canScaleTask}
        canQcTask={canQcTask}
        decisions={decisions}
        savingNoteTaskId={saveNote.variables?.taskId}
        submittingQc={action.isPending}
        submittingScaleTaskId={
          submitScale.isPending ? (submitScale.variables as string) : undefined
        }
        claimingTaskId={claimTask.isPending ? (claimTask.variables as string) : undefined}
        uploadingFileCheckIds={uploadingFileCheckIds}
        onSaveNote={(taskId, note) => saveNote.mutate({ taskId, note })}
        onSubmitQc={(task, fileDecisions) => action.mutate({ task, fileDecisions })}
        onSubmitScaleForQc={(taskId) => submitScale.mutate(taskId)}
        onUploadScaledOutput={handleUploadScaledOutput}
        onInspectSlot={handleInspectSlot}
        onPassSlot={(fileCheckId) => handleSetInspectionDecision(fileCheckId, 'PASSED')}
        onManualSlotUploaded={refresh}
        onOpenManualSlotUpload={(taskId, existingSlotKeys) =>
          setManualSlotUploadTask({ taskId, existingSlotKeys })
        }
        onDeleteSlot={handleDeleteSlot}
        onClaimTask={(taskId) => claimTask.mutate(taskId)}
      />
    ),
    [
      action,
      canQcTask,
      canScaleTask,
      claimTask,
      currentAccountId,
      decisions,
      handleDeleteSlot,
      handleInspectSlot,
      handleSetInspectionDecision,
      handleUploadScaledOutput,
      refresh,
      saveNote,
      submitScale,
      tab,
      uploadingFileCheckIds,
      viewMode,
    ],
  )

  return (
    <section className={styles.page}>
      <ProductionWorkbenchActionModals
        targetId={targetId}
        isTargetLoading={target.isLoading}
        isTargetError={target.isError}
        targetData={target.data}
        onCloseTargetModal={() => selectTarget(undefined)}
        renderExpandedRow={renderExpandedRow}
        inspect={inspect}
        onCloseInspect={() => setInspect(undefined)}
        onPassInspect={(note) => {
          if (!inspect) return
          handleSetInspectionDecision(inspect.check.id, 'PASSED', note)
          setInspect(undefined)
        }}
        onRejectInspect={(note) => {
          if (!inspect) return
          handleSetInspectionDecision(inspect.check.id, 'REJECTED', note)
          setInspect(undefined)
        }}
        manualSlotUploadTask={manualSlotUploadTask}
        isManualSlotSaving={uploadManualSlot.isPending}
        onCloseManualSlotUpload={() => setManualSlotUploadTask(null)}
        onSubmitManualSlotUpload={(input) => uploadManualSlot.mutate(input)}
      />

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
            onSearchSubmit={handleSearchChange}
            onScaleDifficultyChange={handleScaleDifficultyChange}
            onDatesChange={handleCreatedDatesChange}
            onExportCsv={() => exportCsv.mutate()}
            onExportQc={() => exportQc.mutate()}
            onRecheck={() => operations.mutate({ kind: 'recheck' })}
            onScaleAssigneeChange={handleScaleAssigneeChange}
            onBulkAssign={() => operations.mutate({ kind: 'bulk-assign' })}
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
                    getCheckboxProps: (row) => {
                      const allTasks = (row as unknown as { orderTasks?: ProductionTask[] })
                        .orderTasks || [row]
                      return {
                        disabled: !allTasks.some((it) => canAssignProductionTask(it)),
                      }
                    },
                  }
                : undefined
            }
            pagination={{
              current: page,
              pageSize,
              total: deferredSearch ? rows.length : displayedTasks?.total,
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
    </section>
  )
}

export default ProductionWorkbenchPage
