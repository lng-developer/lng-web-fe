import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UploadFile } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { type DateRangeValue, useDebouncedValue, useFeedbackToast } from '@/shared/ui'
import { listShops } from '@/features/portal/shops/api/shopApi'
import { shopKeys } from '@/features/portal/shops/api/shopKeys'

import {
  approveDesignTask,
  assignDesignTask,
  deleteDesignTask,
  type DesignTaskPriority,
  getDesignSummary,
  listDesignAssignees,
  listDesignTasks,
  rejectDesignTask,
  reopenDesignTask,
  startDesignTask,
  submitDesignTask,
  updateDesignTask,
  updateDesignTaskPriority,
  uploadDesignAsset,
} from '../api/designApi'
import { designKeys } from '../api/designKeys'
import { PsdTasksActionModals } from '../components/PsdTasksActionModals'
import { usePsdTasksColumns } from '../components/PsdTasksColumns'
import { PsdTasksFilterBar } from '../components/PsdTasksFilterBar'
import { STATUS_TABS } from '../constants/psdTasksConstants'
import styles from './PsdTasksPage.module.scss'

export function PsdTasksPage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const permissions = useMemo(
    () =>
      new Set([
        ...account.permissions,
        ...account.scopes.flatMap(({ permissions: perms }) => perms),
      ]),
    [account.permissions, account.scopes],
  )
  const canWrite = permissions.has('DESIGN:WRITE')
  const canWork = permissions.has('DESIGN:WORK') || permissions.has('DESIGN:WRITE')
  const canPsdRequest = permissions.has('DESIGN:PSD_REQUEST')
  const canReview = permissions.has('DESIGN:REVIEW') || permissions.has('DESIGN:WRITE')
  const canReprioritize = canPsdRequest || canWrite

  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const [searchParams] = useSearchParams()
  const rawSalesChannel = searchParams.get('salesChannelCode')?.toLowerCase()
  const salesChannelCode: 'AMAZON' | 'ETSY' | undefined =
    rawSalesChannel === 'amazon' ? 'AMAZON' : rawSalesChannel === 'etsy' ? 'ETSY' : undefined

  const [scaleSort, setScaleSort] = useState<string>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [etsyListingId, setEtsyListingId] = useState('')
  const debouncedEtsyListingId = useDebouncedValue(etsyListingId, 300)
  const [activeTabKey, setActiveTabKey] = useState<string>('all')
  const [selectedSellerId, setSelectedSellerId] = useState<string>()
  const [dateRange, setDateRange] = useState<DateRangeValue>({})

  const [prevChannel, setPrevChannel] = useState(salesChannelCode)
  if (prevChannel !== salesChannelCode) {
    setPrevChannel(salesChannelCode)
    setScaleSort(undefined)
    setPage(1)
  }

  // Modal target & control states
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>()
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [reopenModalOpen, setReopenModalOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [uploadNote, setUploadNote] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestNote, setRequestNote] = useState('')

  const activeTabConfig = useMemo(
    () => STATUS_TABS.find((tab) => tab.key === activeTabKey) || STATUS_TABS[0],
    [activeTabKey],
  )

  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      sortBy: scaleSort ? ('totalFileCount' as const) : ('urgency' as const),
      sortOrder: scaleSort
        ? scaleSort === 'asc'
          ? ('asc' as const)
          : ('desc' as const)
        : undefined,
      search: debouncedSearch || undefined,
      etsyListingId: debouncedEtsyListingId.trim() || undefined,
      taskType: 'PSD_TEMPLATE' as const,
      unassigned: activeTabKey === 'Unassigned' ? true : undefined,
      salesChannelCode,
      status: activeTabConfig.status,
      sellerId: selectedSellerId || undefined,
      shopId: selectedSellerId || undefined,
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
    }),
    [
      page,
      pageSize,
      scaleSort,
      activeTabKey,
      debouncedSearch,
      debouncedEtsyListingId,
      salesChannelCode,
      activeTabConfig.status,
      selectedSellerId,
      dateRange,
    ],
  )

  const tasksQuery = useQuery({
    queryKey: designKeys.list(queryParams),
    queryFn: ({ signal }) => listDesignTasks(queryParams, signal),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  const shopsParams = useMemo(() => ({ page: 1, limit: 100, status: 'ACTIVE' as const }), [])
  const shopsQuery = useQuery({
    queryKey: shopKeys.list(shopsParams),
    queryFn: () => listShops(shopsParams),
    staleTime: 5 * 60 * 1000,
    enabled: !canPsdRequest || canWrite,
  })

  const summaryParams = useMemo(
    () => ({
      taskType: 'PSD_TEMPLATE' as const,
      salesChannelCode,
      search: debouncedSearch || undefined,
      etsyListingId: debouncedEtsyListingId.trim() || undefined,
      sellerId: selectedSellerId || undefined,
      shopId: selectedSellerId || undefined,
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
    }),
    [salesChannelCode, debouncedSearch, debouncedEtsyListingId, selectedSellerId, dateRange],
  )

  const summaryQuery = useQuery({
    queryKey: designKeys.summary(summaryParams),
    queryFn: () => getDesignSummary(summaryParams),
    staleTime: 15_000,
  })

  const assigneesQuery = useQuery({
    queryKey: designKeys.assignees(),
    queryFn: listDesignAssignees,
    staleTime: 60_000,
    enabled: canWrite,
  })

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: designKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: designKeys.summaries() })
  }, [queryClient])

  const assignMutation = useMutation({
    mutationFn: ({ taskId, designerId }: { taskId: string; designerId: string }) =>
      assignDesignTask(taskId, designerId),
    onSuccess: () => {
      toast('success', 'Assigned designer successfully')
      setAssignModalOpen(false)
      setSelectedDesignerId(undefined)
      setTargetTaskId(null)
      invalidate()
    },
    onError: (err: unknown) => {
      toast('error', err instanceof Error ? err.message : 'Assign failed')
    },
  })

  const startMutation = useMutation({
    mutationFn: (taskId: string) => startDesignTask(taskId),
    onSuccess: () => {
      toast('success', 'Task started')
      invalidate()
    },
    onError: (err: unknown) => {
      toast('error', err instanceof Error ? err.message : 'Failed to start task')
    },
  })

  const submitMutation = useMutation({
    mutationFn: async ({
      taskId,
      files,
      note,
    }: {
      taskId: string
      files: UploadFile[]
      note?: string
    }) => {
      const uploadedAssets = await Promise.all(
        files
          .filter((f) => f.originFileObj)
          .map((f) =>
            uploadDesignAsset(f.originFileObj as File, { onProgress: setUploadProgress }),
          ),
      )
      return submitDesignTask(
        taskId,
        uploadedAssets.map((a) => a.id),
        note,
      )
    },
    onSuccess: () => {
      toast('success', 'Design submission uploaded successfully')
      setUploadModalOpen(false)
      setUploadFiles([])
      setUploadNote('')
      setUploadProgress(0)
      setTargetTaskId(null)
      invalidate()
    },
    onError: (err: unknown) => {
      toast('error', err instanceof Error ? err.message : 'Submit failed')
      setUploadProgress(0)
    },
  })

  const approveMutation = useMutation({
    mutationFn: ({ taskId, assetId }: { taskId: string; assetId: string }) =>
      approveDesignTask(taskId, assetId),
    onSuccess: () => {
      toast('success', 'Task approved')
      invalidate()
    },
    onError: (err: unknown) => {
      toast('error', err instanceof Error ? err.message : 'Approve failed')
    },
  })

  const priorityMutation = useMutation({
    mutationFn: ({ taskId, priority }: { taskId: string; priority: DesignTaskPriority }) =>
      updateDesignTaskPriority(taskId, priority),
    onSuccess: (_, { taskId, priority }) => {
      // Targeted cache update: reflect priority changes in 0ms without re-fetching entire list
      queryClient.setQueriesData<{ items?: Array<{ id: string; priority: DesignTaskPriority }> }>(
        { queryKey: designKeys.lists() },
        (old) => {
          if (!old?.items) return old
          return {
            ...old,
            items: old.items.map((task) => (task.id === taskId ? { ...task, priority } : task)),
          }
        },
      )
      toast('success', t('portal.design.priorityUpdated', { defaultValue: 'Priority updated' }))
    },
    onError: (err: unknown) => {
      toast('error', err instanceof Error ? err.message : t('portal.design.updateFailed'))
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      rejectDesignTask(taskId, reason),
    onSuccess: () => {
      toast('success', 'Task rejected')
      setRejectModalOpen(false)
      setRejectReason('')
      setTargetTaskId(null)
      invalidate()
    },
    onError: (err: unknown) => {
      toast('error', err instanceof Error ? err.message : 'Reject failed')
    },
  })

  const reopenMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      reopenDesignTask(taskId, reason),
    onSuccess: () => {
      toast('success', 'Task reopened for revision')
      setReopenModalOpen(false)
      setReopenReason('')
      setTargetTaskId(null)
      invalidate()
    },
    onError: (err: unknown) => {
      toast('error', err instanceof Error ? err.message : 'Failed to reopen task')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => deleteDesignTask(taskId),
    onSuccess: () => {
      toast('success', 'Task deleted successfully')
      setDeleteModalOpen(false)
      setTargetTaskId(null)
      invalidate()
    },
    onError: (err: unknown) => {
      toast('error', err instanceof Error ? err.message : 'Failed to delete task')
    },
  })

  const requestMutation = useMutation({
    mutationFn: ({ taskId, note }: { taskId: string; note: string }) =>
      updateDesignTask(taskId, { note }),
    onSuccess: () => {
      toast('success', 'Request upload submitted successfully')
      setRequestModalOpen(false)
      setRequestNote('')
      setTargetTaskId(null)
      invalidate()
    },
    onError: (err: unknown) => {
      toast('error', err instanceof Error ? err.message : 'Failed to request upload')
    },
  })

  const counts = useMemo(() => {
    const byStatus = summaryQuery.data?.byStatus || {}
    const total = summaryQuery.data?.total ?? 0
    return {
      all: total,
      Unassigned: summaryQuery.data?.unassigned ?? 0,
      New: byStatus.NEW ?? 0,
      Requested: byStatus.REQUESTED ?? 0,
      Assigned: byStatus.ASSIGNED ?? 0,
      'In Progress': byStatus.IN_PROGRESS ?? 0,
      Uploaded: byStatus.SUBMITTED ?? 0,
      'QC Rejected': byStatus.REJECTED ?? 0,
      'QC Passed': byStatus.APPROVED ?? 0,
    }
  }, [summaryQuery.data])

  const displayedTasks = useMemo(() => {
    let items = tasksQuery.data?.items || []
    if (salesChannelCode) {
      items = items.filter((item) => {
        const code = item.listing?.salesChannelCode?.toUpperCase()
        if (code) return code === salesChannelCode
        if (salesChannelCode === 'AMAZON') return Boolean(item.listing?.asin)
        if (salesChannelCode === 'ETSY') return Boolean(item.listing?.etsyListingId)
        return false
      })
    }
    if (selectedSellerId) {
      items = items.filter((item) => {
        const id = item.shop?.id || (item as { shopId?: string }).shopId || item.seller?.id
        return id === selectedSellerId
      })
    }
    return items
  }, [tasksQuery.data?.items, salesChannelCode, selectedSellerId])

  const paginationTotal = tasksQuery.data?.pagination?.total ?? displayedTasks.length
  const assignmentTask = tasksQuery.data?.items.find((task) => task.id === targetTaskId)
  const canConfirmAssignment = Boolean(
    selectedDesignerId &&
    assignmentTask &&
    (assignmentTask.status !== 'ASSIGNED' ||
      assignmentTask.assignedDesignerId !== selectedDesignerId),
  )

  const columns = usePsdTasksColumns({
    activeTabKey,
    salesChannelCode,
    currentAccountId: account.account.id,
    canWrite,
    canWork,
    canReview,
    canReprioritize,
    onOpenUploadModal: (taskId) => {
      setTargetTaskId(taskId)
      setUploadModalOpen(true)
    },
    onOpenRequestModal: (taskId) => {
      setTargetTaskId(taskId)
      setRequestModalOpen(true)
    },
    onOpenAssignModal: (taskId, currentDesignerId) => {
      setTargetTaskId(taskId)
      setSelectedDesignerId(currentDesignerId)
      setAssignModalOpen(true)
    },
    onStartTask: (taskId) => startMutation.mutate(taskId),
    isStartingTask: (taskId) => startMutation.isPending && startMutation.variables === taskId,
    onApproveTask: (taskId, assetId) => approveMutation.mutate({ taskId, assetId }),
    isApprovingTask: (taskId) =>
      approveMutation.isPending && approveMutation.variables?.taskId === taskId,
    onOpenRejectModal: (taskId) => {
      setTargetTaskId(taskId)
      setRejectModalOpen(true)
    },
    onOpenReopenModal: (taskId) => {
      setTargetTaskId(taskId)
      setReopenModalOpen(true)
    },
    onOpenDeleteModal: (taskId) => {
      setTargetTaskId(taskId)
      setDeleteModalOpen(true)
    },
    onChangePriority: (taskId, priority) => priorityMutation.mutate({ taskId, priority }),
    isChangingPriority: (taskId) =>
      priorityMutation.isPending && priorityMutation.variables?.taskId === taskId,
  })

  return (
    <section className={styles.page}>
      <PsdTasksFilterBar
        activeTabKey={activeTabKey}
        onTabChange={(key) => {
          setActiveTabKey(key)
          setPage(1)
        }}
        counts={counts}
        salesChannelCode={salesChannelCode}
        search={search}
        onSearchChange={(val) => {
          setSearch(val)
          setPage(1)
        }}
        etsyListingId={etsyListingId}
        onEtsyListingIdChange={(val) => {
          setEtsyListingId(val)
          setPage(1)
        }}
        selectedSellerId={selectedSellerId}
        onSellerChange={(val) => {
          setSelectedSellerId(val)
          setPage(1)
        }}
        shopOptions={(shopsQuery.data?.items || []).map((shop) => ({
          label: shop.name,
          value: shop.id,
        }))}
        dateRange={dateRange}
        onDateRangeChange={(val) => {
          setDateRange(val)
          setPage(1)
        }}
        onRefresh={invalidate}
        isRefreshing={tasksQuery.isFetching}
      />

      <div className={styles.tableArea}>
        <CoreDataTable
          fillViewport
          rowKey="id"
          columns={columns}
          serverSorting={{
            enabled: true,
            value: scaleSort,
            columns: { scaleFileSummary: { asc: 'asc', desc: 'desc' } },
            onChange: (value) => {
              setScaleSort(value)
              setPage(1)
            },
          }}
          dataSource={displayedTasks}
          loading={tasksQuery.isLoading}
          pagination={{
            current: page,
            pageSize,
            total: paginationTotal,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
          scroll={{ x: 1380 }}
        />
      </div>

      <PsdTasksActionModals
        assignModalOpen={assignModalOpen}
        onCloseAssignModal={() => {
          setAssignModalOpen(false)
          setTargetTaskId(null)
          setSelectedDesignerId(undefined)
        }}
        onConfirmAssign={() => {
          if (targetTaskId && selectedDesignerId && canConfirmAssignment) {
            assignMutation.mutate({ taskId: targetTaskId, designerId: selectedDesignerId })
          }
        }}
        selectedDesignerId={selectedDesignerId}
        onSelectDesignerId={setSelectedDesignerId}
        assignees={assigneesQuery.data || []}
        isAssigning={assignMutation.isPending}
        isReassign={assignmentTask?.status === 'ASSIGNED'}
        canConfirmAssignment={canConfirmAssignment}
        rejectModalOpen={rejectModalOpen}
        onCloseRejectModal={() => {
          setRejectModalOpen(false)
          setTargetTaskId(null)
          setRejectReason('')
        }}
        onConfirmReject={() => {
          if (targetTaskId && rejectReason) {
            rejectMutation.mutate({ taskId: targetTaskId, reason: rejectReason })
          }
        }}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        isRejecting={rejectMutation.isPending}
        reopenModalOpen={reopenModalOpen}
        onCloseReopenModal={() => {
          setReopenModalOpen(false)
          setTargetTaskId(null)
          setReopenReason('')
        }}
        onConfirmReopen={() => {
          if (targetTaskId && reopenReason.trim()) {
            reopenMutation.mutate({ taskId: targetTaskId, reason: reopenReason.trim() })
          }
        }}
        reopenReason={reopenReason}
        onReopenReasonChange={setReopenReason}
        isReopening={reopenMutation.isPending}
        uploadModalOpen={uploadModalOpen}
        onCloseUploadModal={() => {
          setUploadModalOpen(false)
          setTargetTaskId(null)
          setUploadFiles([])
          setUploadNote('')
          setUploadProgress(0)
        }}
        onConfirmUpload={() => {
          if (targetTaskId && uploadFiles.length > 0) {
            setUploadProgress(0)
            submitMutation.mutate({
              taskId: targetTaskId,
              files: uploadFiles,
              note: uploadNote,
            })
          }
        }}
        uploadFiles={uploadFiles}
        onUploadFilesChange={setUploadFiles}
        uploadNote={uploadNote}
        onUploadNoteChange={setUploadNote}
        uploadProgress={uploadProgress}
        isSubmittingUpload={submitMutation.isPending}
        requestModalOpen={requestModalOpen}
        onCloseRequestModal={() => {
          setRequestModalOpen(false)
          setRequestNote('')
          setTargetTaskId(null)
        }}
        onConfirmRequest={() => {
          if (targetTaskId) {
            requestMutation.mutate({ taskId: targetTaskId, note: requestNote })
          }
        }}
        requestNote={requestNote}
        onRequestNoteChange={setRequestNote}
        isRequesting={requestMutation.isPending}
        deleteModalOpen={deleteModalOpen}
        onCloseDeleteModal={() => {
          setDeleteModalOpen(false)
          setTargetTaskId(null)
        }}
        onConfirmDelete={() => {
          if (targetTaskId) {
            deleteMutation.mutate(targetTaskId)
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </section>
  )
}

export default PsdTasksPage
