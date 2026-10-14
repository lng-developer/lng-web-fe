/* eslint-disable react-hooks/preserve-manual-memoization -- stable permission callbacks are intentionally wrapped for memoized table columns */
import { type Key, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useRouteLoaderData, useSearchParams } from 'react-router-dom'
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  LinkOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  UserAddOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType, UploadFile } from 'antd'
import {
  Button,
  Checkbox,
  Descriptions,
  Empty,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  getListingOptions,
  type ListingOptions,
  listListings,
} from '@/features/portal/catalog/api/catalogApi'
import { canUseScopedPermission, hasScopedPermission } from '@/shared/auth/permissions'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { downloadMediaAsset, uploadMultipartAsset } from '@/shared/media'
import {
  CopyableAsin,
  CopyableListingId,
  CopyableSku,
  DetailDrawer,
  EmployeeAvatar,
  FileUpload,
  FilterBar,
  FormattedDateTime,
  MetricCard,
  SectionCard,
  StatusTag,
  useFeedbackToast,
  useResourceSelection,
  FeedbackAlert,
  ZoomableImage,
} from '@/shared/ui'

import {
  approveDesignTask,
  assignDesignTask,
  bulkAssignDesignTasks,
  cancelDesignTask,
  createDesignTask,
  type CreateDesignTaskInput,
  type DesignTask,
  type DesignTaskPriority,
  exportDesignTasksCsv,
  getDesignSummary,
  getDesignTask,
  getDesignWorkload,
  listDesignAssignees,
  listDesignSubmissions,
  listDesignTasks,
  rejectDesignTask,
  startDesignTask,
  submitDesignTask,
  updateDesignTaskPriority,
  uploadDesignAsset,
} from '../api/designApi'
import { designKeys } from '../api/designKeys'
import { type CreateDesignTaskDraft, CreateDesignTaskModal } from './CreateDesignTaskModal'
import styles from './DesignWorkbenchPage.module.scss'

const STATUSES = [
  'REQUESTED',
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const
const TYPES = ['PSD_TEMPLATE', 'MOCKUP', 'PNG_ASSET', 'IDEA', 'CLONE'] as const
type DesignTaskStatus = (typeof STATUSES)[number]
type DesignTaskType = (typeof TYPES)[number]

const designEnumLabelKey = (
  group: 'statuses' | 'taskTypes' | 'priorities' | 'outputTypes',
  value: string,
) => `portal.design.${group}.${value}`

const tone = (status: string) =>
  status === 'APPROVED'
    ? 'approved'
    : status === 'REJECTED'
      ? 'rejected'
      : status === 'CANCELLED'
        ? 'cancelled'
        : status === 'SUBMITTED'
          ? 'ready'
          : 'processing'

const priorityTone = (priority: string) =>
  priority === 'URGENT'
    ? 'critical'
    : priority === 'HIGH'
      ? 'warning'
      : priority === 'NORMAL'
        ? 'ready'
        : 'cancelled'

function listingUrl(listing: DesignTask['listing']) {
  if (!listing) return null
  if (listing.salesChannelCode === 'ETSY' && listing.etsyListingId) {
    return `https://www.etsy.com/listing/${listing.etsyListingId}`
  }
  if (listing.asin) return `https://www.amazon.com/dp/${listing.asin}`
  return null
}

export function DesignWorkbenchPage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  // R1: Memoize permissions Set — avoid new Set() on every render
  const permissions = useMemo(
    () =>
      new Set([
        ...account.permissions,
        ...account.scopes.flatMap(({ permissions }) => permissions),
      ]),
    [account.permissions, account.scopes],
  )
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const { salesChannel } = useParams()
  const taskType = TYPES.find((value) => value === searchParams.get('taskType'))
  const salesChannelCode: 'AMAZON' | 'ETSY' | undefined =
    salesChannel === 'amazon' ? 'AMAZON' : salesChannel === 'etsy' ? 'ETSY' : undefined
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  // Defer search to avoid network request on every keystroke
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState<DesignTaskStatus>()
  const [selectedId, setSelectedId] = useResourceSelection()
  const [activeTask, setActiveTask] = useState<DesignTask>()
  const [assignOpen, setAssignOpen] = useState(false)
  const [designerId, setDesignerId] = useState<string>()
  const [bulkDesignerId, setBulkDesignerId] = useState<string>()
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [submitOpen, setSubmitOpen] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [packageFile, setPackageFile] = useState<File>()
  const [previewFile, setPreviewFile] = useState<File>()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadController, setUploadController] = useState<AbortController>()
  const [note, setNote] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [approveOpen, setApproveOpen] = useState(false)
  const [approvedAssetId, setApprovedAssetId] = useState<string>()
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [priorityDraft, setPriorityDraft] = useState<DesignTaskPriority>()

  // R2: Memoize query params — prevents useQuery from seeing a new object ref every render
  // Uses deferredSearch so search only triggers fetch after typing pauses (not every keystroke)
  const params = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      search: deferredSearch || undefined,
      salesChannelCode,
      status,
      taskType,
    }),
    [page, deferredSearch, salesChannelCode, status, taskType],
  )
  const dashboardParams = useMemo(
    () => ({ search: deferredSearch || undefined, salesChannelCode, status, taskType }),
    [deferredSearch, salesChannelCode, status, taskType],
  )

  const tasks = useQuery({
    queryKey: designKeys.list(params),
    queryFn: () => listDesignTasks(params),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const detail = useQuery({
    queryKey: designKeys.detail(selectedId ?? ''),
    queryFn: () => getDesignTask(selectedId!),
    enabled: Boolean(selectedId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const assignees = useQuery({
    queryKey: designKeys.assignees(),
    queryFn: listDesignAssignees,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const summary = useQuery({
    queryKey: designKeys.summary(dashboardParams),
    queryFn: () => getDesignSummary(dashboardParams),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const workload = useQuery({
    queryKey: designKeys.workload(dashboardParams),
    queryFn: () => getDesignWorkload(dashboardParams),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const submissions = useQuery({
    queryKey: designKeys.submissions(selectedId ?? ''),
    queryFn: () => listDesignSubmissions(selectedId!),
    enabled: Boolean(selectedId),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const createListings = useQuery({
    queryKey: ['catalog', 'listings', 'design-task-create'],
    queryFn: () => listListings({ page: 1, limit: 100 }),
    enabled: createTaskOpen,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const createOptions = useQuery({
    queryKey: ['catalog', 'listing-options', 'design-task-create'],
    queryFn: getListingOptions,
    enabled: createTaskOpen,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const displayedTasks = useDeferredValue(tasks.data)
  // R3: Stable refresh reference — prevent child components seeing new fn ref on each render
  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: designKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: designKeys.summaries() }),
      queryClient.invalidateQueries({ queryKey: designKeys.workloads() }),
    ])
  }, [queryClient])
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])
  const handleStatusChange = useCallback((value?: DesignTaskStatus) => {
    setStatus(value)
    setPage(1)
  }, [])
  const handleTaskTypeChange = useCallback(
    (value?: DesignTaskType) => {
      const nextSearchParams = new URLSearchParams(searchParams)
      if (value) nextSearchParams.set('taskType', value)
      else nextSearchParams.delete('taskType')
      setSearchParams(nextSearchParams, { replace: true })
      setPage(1)
    },
    [searchParams, setSearchParams],
  )
  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage)
  }, [])
  const handleCreateTaskOpen = useCallback(() => {
    setCreateTaskOpen(true)
  }, [])
  const setTaskDraft = useCallback(
    (id: string) => {
      setPriorityDraft(undefined)
      setSelectedId(id)
    },
    [setSelectedId],
  )
  const closeTaskDrawer = useCallback(() => {
    setPriorityDraft(undefined)
    setSelectedId(undefined)
  }, [setSelectedId])
  // W2: Prefetch catalog data on hover over "Create Task" button
  const prefetchCreateData = useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: ['catalog', 'listings', 'design-task-create'],
      queryFn: () => listListings({ page: 1, limit: 100 }),
      staleTime: 60_000,
    })
    void queryClient.prefetchQuery({
      queryKey: ['catalog', 'listing-options', 'design-task-create'],
      queryFn: getListingOptions,
      staleTime: 60_000,
    })
  }, [queryClient])

  const action = useMutation({
    mutationFn: async ({ type, task }: { type: string; task: DesignTask }) => {
      if (type === 'assign') return assignDesignTask(task.id, designerId!)
      if (type === 'start') return startDesignTask(task.id)
      if (type === 'approve') return approveDesignTask(task.id, approvedAssetId!)
      if (type === 'reject') return rejectDesignTask(task.id, rejectReason.trim())
      if (type === 'cancel') return cancelDesignTask(task.id, cancelReason.trim())
      if (task.taskType === 'PSD_TEMPLATE') {
        if (!packageFile) throw new Error(t('portal.design.designPackageRequired'))
        const controller = new AbortController()
        setUploadController(controller)
        const packageAsset = await uploadMultipartAsset(packageFile, {
          assetPurpose: 'DESIGN_PACKAGE',
          signal: controller.signal,
          onProgress: setUploadProgress,
        })
        const previewAsset = previewFile ? await uploadDesignAsset(previewFile) : undefined
        return submitDesignTask(
          task.id,
          [packageAsset.id, ...(previewAsset ? [previewAsset.id] : [])],
          note.trim() || undefined,
        )
      }
      const assets = await Promise.all(
        files.map(({ originFileObj }) => uploadDesignAsset(originFileObj as File)),
      )
      return submitDesignTask(
        task.id,
        assets.map(({ id }) => id),
        note.trim() || undefined,
      )
    },
    onSuccess: async () => {
      setAssignOpen(false)
      setSubmitOpen(false)
      setRejectOpen(false)
      setApproveOpen(false)
      setApprovedAssetId(undefined)
      setFiles([])
      setPackageFile(undefined)
      setPreviewFile(undefined)
      setUploadProgress(0)
      setUploadController(undefined)
      setNote('')
      setRejectReason('')
      setCancelReason('')
      setCancelOpen(false)
      setActiveTask(undefined)
      await refresh()
      toast('success', t('portal.design.updated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.design.updateFailed')),
  })

  const createTask = useMutation({
    mutationFn: async (draft: CreateDesignTaskDraft) => {
      const { referenceFiles, ...input } = draft
      const assets = await Promise.all(
        referenceFiles.map(({ originFileObj }) => uploadDesignAsset(originFileObj as File)),
      )
      return createDesignTask({
        ...(input as CreateDesignTaskInput),
        ...(assets.length ? { referenceAssetIds: assets.map(({ id }) => id) } : {}),
      })
    },
    onSuccess: async () => {
      setCreateTaskOpen(false)
      await refresh()
      toast('success', t('portal.design.tasksCreated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.design.createFailed')),
  })
  const updatePriority = useMutation({
    mutationFn: ({ taskId, priority }: { taskId: string; priority: DesignTaskPriority }) =>
      updateDesignTaskPriority(taskId, priority),
    onSuccess: async (_, { taskId, priority }) => {
      setPriorityDraft(priority)
      await Promise.all([
        refresh(),
        queryClient.invalidateQueries({ queryKey: designKeys.detail(taskId) }),
      ])
      toast('success', t('portal.design.priorityUpdated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.design.updateFailed')),
  })
  const handleCreateTaskSubmit = useCallback(
    (draft: CreateDesignTaskDraft) => createTask.mutate(draft),
    [createTask],
  )

  const bulkAssign = useMutation({
    mutationFn: () =>
      bulkAssignDesignTasks(
        selectableTasks
          .filter((task) => selectedRowKeys.map(String).includes(task.id))
          .filter(canAssignTask)
          .map((task) => task.id),
        bulkDesignerId!,
      ),
    onSuccess: async ({ failed }) => {
      setSelectedRowKeys([])
      await refresh()
      toast(
        failed.length ? 'warning' : 'success',
        failed.length
          ? t('portal.design.bulkAssignPartial', { count: failed.length })
          : t('portal.design.bulkAssigned'),
      )
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.design.actionFailed')),
  })
  const exportCsv = useMutation({
    mutationFn: () => exportDesignTasksCsv(params),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result as unknown as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'design-tasks.csv'
      link.click()
      URL.revokeObjectURL(url)
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.design.actionFailed')),
  })

  const canAssign = permissions.has('DESIGN:WRITE')
  const currentAccountId = account.account?.id
  const canAssignTask = useCallback(
    (task: DesignTask) =>
      canUseScopedPermission(account, 'DESIGN:WRITE', {
        scopeType: 'shop',
        scopeId: task.shop?.id,
      }) || hasScopedPermission(account, 'DESIGN:WRITE', 'team'),
    [account],
  )
  const canWorkTask = useCallback(
    (task: DesignTask) =>
      canAssignTask(task) ||
      (Boolean(currentAccountId) &&
        task.assignedDesignerId === currentAccountId &&
        permissions.has('DESIGN:WORK')),
    [canAssignTask, currentAccountId, permissions],
  )
  const canReviewTask = useCallback(
    (task: DesignTask) =>
      canAssignTask(task) ||
      canUseScopedPermission(account, 'DESIGN:REVIEW', {
        scopeType: 'shop',
        scopeId: task.shop?.id,
      }) ||
      hasScopedPermission(account, 'DESIGN:REVIEW', 'team'),
    [account, canAssignTask],
  )
  const assigneeOptions = useMemo(
    () =>
      (assignees.data ?? []).map(({ id, fullName, name, avatarUrl }) => ({
        value: id,
        label: (
          <Space size="small">
            <EmployeeAvatar name={fullName ?? name ?? id} avatarUrl={avatarUrl} size={24} />
            <span>{fullName ?? name ?? id}</span>
          </Space>
        ),
      })),
    [assignees.data],
  )
  const statusOptions = useMemo(
    () => STATUSES.map((value) => ({ value, label: t(designEnumLabelKey('statuses', value)) })),
    [t],
  )
  const typeOptions = useMemo(
    () => TYPES.map((value) => ({ value, label: t(designEnumLabelKey('taskTypes', value)) })),
    [t],
  )

  const handleBulkAssign = useCallback(() => {
    bulkAssign.mutate()
  }, [bulkAssign])
  const handleExportCsv = useCallback(() => exportCsv.mutate(), [exportCsv])
  const handleOpenAssign = useCallback((task: DesignTask) => {
    setActiveTask(task)
    setAssignOpen(true)
  }, [])
  const handleStartWork = useCallback(
    (task: DesignTask) => action.mutate({ type: 'start', task }),
    [action],
  )
  const handleOpenSubmit = useCallback((task: DesignTask) => {
    setActiveTask(task)
    setSubmitOpen(true)
  }, [])
  const handleOpenApprove = useCallback((task: DesignTask) => {
    setActiveTask(task)
    setApprovedAssetId(task.latestSubmission?.assets[0]?.id)
    setApproveOpen(true)
  }, [])
  const handleOpenReject = useCallback((task: DesignTask) => {
    setActiveTask(task)
    setRejectOpen(true)
  }, [])
  const handleOpenCancel = useCallback((task: DesignTask) => {
    setActiveTask(task)
    setCancelOpen(true)
  }, [])

  const selectableTasks = (displayedTasks?.items ?? []).filter(
    (row) => canAssignTask(row) && ['REQUESTED', 'OPEN', 'ASSIGNED'].includes(row.status),
  )
  const selectableTaskIds = new Set(selectableTasks.map((row) => row.id))

  const renderTaskActions = useCallback(
    (row: DesignTask) => (
      <div className={styles.taskActions}>
        {listingUrl(row.listing) ? (
          <Tooltip title={t('portal.design.openProduct', 'Open SP')}>
            <Button
              aria-label={t('portal.design.openProduct', 'Open SP')}
              type="text"
              icon={<LinkOutlined />}
              onClick={() => window.open(listingUrl(row.listing)!, '_blank', 'noopener,noreferrer')}
            />
          </Tooltip>
        ) : null}
        {canAssignTask(row) && ['REQUESTED', 'OPEN', 'ASSIGNED'].includes(row.status) ? (
          <Tooltip title={t('portal.design.assign')}>
            <Button
              aria-label={t('portal.design.assign')}
              type="text"
              icon={<UserAddOutlined />}
              onClick={() => handleOpenAssign(row)}
            />
          </Tooltip>
        ) : null}
        {canWorkTask(row) && row.status === 'ASSIGNED' ? (
          <Tooltip title={t('portal.design.start')}>
            <Button
              aria-label={t('portal.design.start')}
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartWork(row)}
            />
          </Tooltip>
        ) : null}
        {canWorkTask(row) && ['IN_PROGRESS', 'REJECTED'].includes(row.status) ? (
          <Tooltip title={t('portal.design.submit')}>
            <Button
              aria-label={t('portal.design.submit')}
              type="text"
              icon={<UploadOutlined />}
              onClick={() => handleOpenSubmit(row)}
            />
          </Tooltip>
        ) : null}
        {canReviewTask(row) && row.status === 'SUBMITTED' && row.latestSubmission?.assets.length ? (
          <Tooltip title={t('portal.design.approve')}>
            <Button
              className={styles.approveAction}
              aria-label={t('portal.design.approve')}
              type="text"
              icon={<CheckCircleOutlined />}
              onClick={() => handleOpenApprove(row)}
            />
          </Tooltip>
        ) : null}
        {canReviewTask(row) && row.status === 'SUBMITTED' ? (
          <Tooltip title={t('portal.design.reject')}>
            <Button
              danger
              className={styles.rejectAction}
              aria-label={t('portal.design.reject')}
              type="text"
              icon={<CloseCircleOutlined />}
              onClick={() => handleOpenReject(row)}
            />
          </Tooltip>
        ) : null}
        {canAssignTask(row) && !['APPROVED', 'CANCELLED'].includes(row.status) ? (
          <Tooltip title={t('portal.design.cancel')}>
            <Button
              danger
              aria-label={t('portal.design.cancel')}
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => handleOpenCancel(row)}
            />
          </Tooltip>
        ) : null}
        <Tooltip title={t('portal.design.view')}>
          <Button
            aria-label={t('portal.design.view')}
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setTaskDraft(row.id)}
          />
        </Tooltip>
      </div>
    ),
    [
      canAssignTask,
      canReviewTask,
      canWorkTask,
      handleOpenApprove,
      handleOpenAssign,
      handleOpenCancel,
      handleOpenReject,
      handleOpenSubmit,
      handleStartWork,
      setTaskDraft,
      t,
    ],
  )

  const taskColumns: TableColumnsType<DesignTask> = useMemo(
    () => [
      {
        title: t('portal.design.image', 'Image'),
        key: 'image',
        width: 92,
        render: (_, row) => (
          <div className={styles.thumbnailContainer}>
            <div className={styles.thumbnailFrame}>
              {row.thumbnailAsset?.downloadUrl ? (
                <ZoomableImage
                  downloadUrl={row.thumbnailAsset.downloadUrl}
                  alt={t('portal.design.preview')}
                  className={styles.thumbnailImg}
                  fallback="/favicon.svg"
                />
              ) : row.listing?.productImageUrl ? (
                <ZoomableImage
                  src={row.listing.productImageUrl}
                  alt={t('portal.design.preview')}
                  className={styles.thumbnailImg}
                  loading="lazy"
                />
              ) : (
                <div className={styles.thumbnailPlaceholder}>
                  <PictureOutlined className={styles.thumbnailPlaceholderIcon} />
                </div>
              )}
            </div>
            {(row.thumbnailAsset?.downloadUrl || row.listing?.productImageUrl) && (
              <Button
                aria-label={t('portal.design.downloadMainImage')}
                className={styles.thumbnailDownload}
                icon={<DownloadOutlined />}
                size="small"
                type="text"
                onClick={(event) => {
                  event.stopPropagation()
                  if (row.thumbnailAsset?.downloadUrl) {
                    void downloadMediaAsset(
                      row.thumbnailAsset.downloadUrl,
                      row.thumbnailAsset.originalFilename ?? undefined,
                    )
                    return
                  }
                  window.open(row.listing?.productImageUrl ?? '', '_blank', 'noopener,noreferrer')
                }}
              />
            )}
          </div>
        ),
      },
      {
        title: t('portal.design.task', 'Task'),
        key: 'task',
        width: 260,
        render: (_, row) => (
          <div className={styles.taskMeta}>
            <CopyableSku value={row.listing?.sku} strong />
            {row.listing?.asin ? (
              <CopyableAsin value={row.listing.asin} />
            ) : row.listing?.etsyListingId ? (
              <CopyableListingId value={row.listing.etsyListingId} />
            ) : null}
            {row.taskType === 'PSD_TEMPLATE' ? (
              <Typography.Text className={styles.metaSecondary} type="secondary">
                {row.targetScope === 'LISTING_VARIANT'
                  ? t('portal.design.listingVariant', 'Listing variant')
                  : t('portal.design.listing', 'Listing')}
                {row.orderContext?.orderId ? ` · ${row.orderContext.orderId}` : ''}
              </Typography.Text>
            ) : null}
          </div>
        ),
      },
      {
        title: t('portal.design.type', 'Type'),
        key: 'type',
        width: 130,
        render: (_, row) => (
          <Tag className={styles.typeTag} color="cyan">
            {t(designEnumLabelKey('taskTypes', row.taskType))}
          </Tag>
        ),
      },
      {
        title: t('portal.design.priority', 'Priority'),
        key: 'priority',
        width: 110,
        render: (_, row) => (
          <StatusTag status={priorityTone(row.priority)}>
            {t(designEnumLabelKey('priorities', row.priority))}
          </StatusTag>
        ),
      },
      {
        title: t('portal.design.shop', 'Shop'),
        key: 'shop',
        width: 150,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Typography.Text className={styles.metaPrimary} type="secondary">
              {row.shop?.name ?? '-'}
            </Typography.Text>
            <Typography.Text className={styles.metaSecondary} type="secondary">
              {row.listing?.salesChannelCode ?? '-'}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: t('portal.design.designer', 'Designer'),
        key: 'designer',
        width: 220,
        render: (_, row) => (
          <div className={styles.taskAssignee}>
            <Space size="small">
              <EmployeeAvatar
                name={row.assignedDesigner?.fullName ?? t('portal.design.unassigned')}
                avatarUrl={row.assignedDesigner?.avatarUrl}
                size={28}
              />
              <Typography.Text className={styles.assigneeName}>
                {row.assignedDesigner?.fullName ?? t('portal.design.unassigned')}
              </Typography.Text>
            </Space>
            <FormattedDateTime value={row.updatedAt} />
          </div>
        ),
      },
      {
        title: t('portal.design.status', 'Status'),
        key: 'status',
        width: 120,
        align: 'center',
        render: (_, row) => (
          <StatusTag status={tone(row.status)}>
            {t(designEnumLabelKey('statuses', row.status))}
          </StatusTag>
        ),
      },
      {
        title: t('portal.design.actions', 'Actions'),
        key: 'actions',
        width: 190,
        align: 'right',
        render: (_, row) => renderTaskActions(row),
      },
    ],
    [renderTaskActions, t],
  )

  const task = detail.data
  const modalTask = activeTask ?? task

  return (
    <section className={styles.page}>
      <div className={styles.metricsList}>
        <MetricCard
          icon={<AppstoreOutlined />}
          variant="neutral"
          label={t('portal.design.total', 'Total Tasks')}
          value={summary.data?.total ?? 0}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<ThunderboltOutlined />}
          variant="info"
          label={t('portal.design.active', 'Active Tasks')}
          value={summary.data?.active ?? 0}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<WarningOutlined />}
          variant="warning"
          label={t('portal.design.unassigned', 'Unassigned')}
          value={workload.data?.totals.unassignedCount ?? 0}
          loading={workload.isLoading}
        />
      </div>

      <SectionCard>
        <div className={styles.taskToolbar}>
          <div className={styles.taskHeader}>
            <Typography.Title className={styles.taskToolbarTitle} level={4}>
              {t('portal.design.tasks', 'Design Tasks')}
            </Typography.Title>
          </div>
          <div className={styles.taskActionBar}>
            <Space className={styles.taskToolbarActions}>
              <Button
                icon={<DownloadOutlined />}
                loading={exportCsv.isPending}
                onClick={handleExportCsv}
              >
                {t('portal.design.exportCsv')}
              </Button>
              <Button href="/portal/design/files">{t('portal.design.psdFiles')}</Button>
              {canAssign ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onMouseEnter={prefetchCreateData}
                  onClick={handleCreateTaskOpen}
                >
                  {t('portal.design.createDesignTask')}
                </Button>
              ) : null}
            </Space>
          </div>
        </div>
        <FilterBar label={t('portal.design.filters')} contentClassName={styles.filters}>
          <Input.Search
            className={styles.search}
            allowClear
            placeholder={t('portal.design.search')}
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            onSearch={() => handlePageChange(1)}
          />
          <Select
            className={styles.filter}
            allowClear
            placeholder={t('portal.design.allStatuses')}
            value={status}
            onChange={handleStatusChange}
            options={statusOptions}
          />
          <Select
            className={styles.filter}
            allowClear
            placeholder={t('portal.design.allTypes')}
            value={taskType}
            onChange={handleTaskTypeChange}
            options={typeOptions}
          />
          {canAssign ? (
            <>
              <Select
                showSearch
                optionFilterProp="label"
                className={styles.filter}
                placeholder={t('portal.design.selectEligibleDesigner')}
                value={bulkDesignerId}
                onChange={setBulkDesignerId}
                options={assigneeOptions}
                notFoundContent={t('portal.design.noEligibleDesigners')}
              />
              <Button
                disabled={!selectedRowKeys.length || !bulkDesignerId}
                loading={bulkAssign.isPending}
                onClick={handleBulkAssign}
              >
                {t('portal.design.bulkAssign', { count: selectedRowKeys.length })}
              </Button>
            </>
          ) : null}
        </FilterBar>

        <CoreDataTable
          fillViewport
          className={styles.taskTable}
          columns={taskColumns}
          dataSource={displayedTasks?.items ?? []}
          loading={tasks.isFetching}
          rowKey="id"
          rowSelection={
            canAssign
              ? {
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                  getCheckboxProps: (row) => ({
                    disabled: !selectableTaskIds.has(row.id),
                    'aria-label': `Select ${row.listing?.sku ?? row.id}`,
                  }),
                }
              : undefined
          }
          pagination={{
            current: page,
            pageSize: DEFAULT_PAGE_SIZE,
            total: displayedTasks?.pagination.total ?? 0,
            showSizeChanger: true,
            hideOnSinglePage: false,
            onChange: handlePageChange,
          }}
          scroll={{ x: 1270 }}
        />
      </SectionCard>

      <DetailDrawer
        open={Boolean(selectedId)}
        width={720}
        title={task?.listing?.sku ?? t('portal.design.task')}
        onClose={closeTaskDrawer}
        footer={
          task ? (
            <div className={styles.actions}>
              {canAssignTask(task) && ['REQUESTED', 'OPEN', 'ASSIGNED'].includes(task.status) ? (
                <Button onClick={() => handleOpenAssign(task)}>{t('portal.design.assign')}</Button>
              ) : null}
              {canWorkTask(task) && task.status === 'ASSIGNED' ? (
                <Button type="primary" onClick={() => handleStartWork(task)}>
                  {t('portal.design.start')}
                </Button>
              ) : null}
              {canWorkTask(task) && ['IN_PROGRESS', 'REJECTED'].includes(task.status) ? (
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => handleOpenSubmit(task)}
                >
                  {t('portal.design.submitFiles')}
                </Button>
              ) : null}
              {canReviewTask(task) &&
              task.status === 'SUBMITTED' &&
              task.latestSubmission?.assets.length ? (
                <>
                  <Button type="primary" onClick={() => handleOpenApprove(task)}>
                    {t('portal.design.approve')}
                  </Button>
                  <Button danger onClick={() => handleOpenReject(task)}>
                    {t('portal.design.reject')}
                  </Button>
                </>
              ) : null}
              {canAssignTask(task) && !['APPROVED', 'CANCELLED'].includes(task.status) ? (
                <Button danger onClick={() => handleOpenCancel(task)}>
                  {t('portal.design.cancel')}
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      >
        {detail.isError ? (
          <FeedbackAlert type="error" title={t('notifications.resourceUnavailable')} />
        ) : null}
        {task ? (
          <div className={styles.detail}>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                {
                  key: 'status',
                  label: t('portal.design.status'),
                  children: t(designEnumLabelKey('statuses', task.status)),
                },
                {
                  key: 'type',
                  label: t('portal.design.taskType'),
                  children: t(designEnumLabelKey('taskTypes', task.taskType)),
                },
                {
                  key: 'priority',
                  label: t('portal.design.priority'),
                  children:
                    canAssignTask(task) && !['APPROVED', 'CANCELLED'].includes(task.status) ? (
                      <Space.Compact>
                        <Select
                          aria-label={t('portal.design.priority')}
                          value={priorityDraft ?? task.priority}
                          onChange={(value) => setPriorityDraft(value as DesignTaskPriority)}
                          options={['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((value) => ({
                            value,
                            label: t(designEnumLabelKey('priorities', value)),
                          }))}
                        />
                        <Button
                          loading={updatePriority.isPending}
                          disabled={(priorityDraft ?? task.priority) === task.priority}
                          onClick={() =>
                            updatePriority.mutate({
                              taskId: task.id,
                              priority: priorityDraft ?? task.priority,
                            })
                          }
                        >
                          {t('portal.design.savePriority')}
                        </Button>
                      </Space.Compact>
                    ) : (
                      <StatusTag status={priorityTone(task.priority)}>
                        {t(designEnumLabelKey('priorities', task.priority))}
                      </StatusTag>
                    ),
                },
                {
                  key: 'listing',
                  label: t('portal.design.listing'),
                  children: task.listing?.sku ?? '-',
                },
                {
                  key: 'template',
                  label: t('portal.design.template'),
                  children: task.internalTemplate?.name ?? '-',
                },
                {
                  key: 'productType',
                  label: t('portal.design.productType'),
                  children: task.listing?.productTypeName ?? '-',
                },
                {
                  key: 'designer',
                  label: t('portal.design.designer'),
                  children: task.assignedDesigner?.fullName ?? '-',
                },
                { key: 'brief', label: t('portal.design.brief'), children: task.brief ?? '-' },
                {
                  key: 'outputs',
                  label: t('portal.design.expectedOutputs'),
                  children:
                    task.expectedOutputs
                      .map((output) => t(designEnumLabelKey('outputTypes', output)))
                      .join(', ') || '-',
                },
                {
                  key: 'rejection',
                  label: t('portal.design.rejectReason'),
                  children: task.rejectReason ?? task.latestSubmission?.rejectReason ?? '-',
                },
              ]}
            />
            {task.latestSubmission?.assets.map((asset) => (
              <Button
                key={asset.id}
                disabled={!asset.downloadUrl}
                onClick={() =>
                  asset.downloadUrl &&
                  void downloadMediaAsset(asset.downloadUrl, asset.originalFilename ?? undefined)
                }
              >
                {asset.originalFilename ?? asset.id}
              </Button>
            ))}
            <Typography.Title level={5}>{t('portal.design.submissionHistory')}</Typography.Title>
            {(submissions.data ?? []).map((submission) => (
              <Descriptions
                key={submission.id}
                bordered
                size="small"
                column={1}
                items={[
                  {
                    key: 'version',
                    label: t('portal.design.version'),
                    children: `v${submission.version} · ${t(designEnumLabelKey('statuses', submission.status))}`,
                  },
                  { key: 'note', label: t('portal.design.note'), children: submission.note ?? '-' },
                  {
                    key: 'reason',
                    label: t('portal.design.rejectReason'),
                    children: submission.rejectReason ?? '-',
                  },
                  {
                    key: 'files',
                    label: t('portal.design.files'),
                    children: submission.assets.map((asset) => (
                      <Button
                        type="link"
                        key={asset.id}
                        disabled={!asset.downloadUrl}
                        onClick={() =>
                          asset.downloadUrl &&
                          void downloadMediaAsset(
                            asset.downloadUrl,
                            asset.originalFilename ?? undefined,
                          )
                        }
                      >
                        {asset.originalFilename ?? asset.id}
                      </Button>
                    )),
                  },
                ]}
              />
            ))}
          </div>
        ) : null}
      </DetailDrawer>
      <CreateDesignTaskModal
        open={createTaskOpen}
        listings={createListings.data?.items ?? []}
        templates={(createOptions.data as ListingOptions | undefined)?.internalTemplates ?? []}
        saving={createTask.isPending}
        onClose={() => setCreateTaskOpen(false)}
        onSubmit={handleCreateTaskSubmit}
      />
      <Modal
        open={assignOpen}
        title={t('portal.design.assignDesigner')}
        okText={t('portal.design.assign')}
        confirmLoading={action.isPending}
        okButtonProps={{ disabled: !designerId }}
        onCancel={() => {
          setAssignOpen(false)
          setActiveTask(undefined)
        }}
        onOk={() => activeTask && action.mutate({ type: 'assign', task: activeTask })}
      >
        <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
          {(assignees.data ?? []).length ? (
            (assignees.data ?? []).map(({ id, fullName, name, avatarUrl }) => {
              const displayName = fullName ?? name ?? id
              return (
                <Checkbox
                  key={id}
                  checked={designerId === id}
                  onChange={(event) => setDesignerId(event.target.checked ? id : undefined)}
                >
                  <Space size="small">
                    <EmployeeAvatar name={displayName} avatarUrl={avatarUrl} size={24} />
                    <span>{displayName}</span>
                  </Space>
                </Checkbox>
              )
            })
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('portal.design.noEligibleDesigners')}
            />
          )}
        </div>
      </Modal>
      <Modal
        open={approveOpen}
        title={t('portal.design.approveConfirm')}
        okText={t('portal.design.approve')}
        confirmLoading={action.isPending}
        okButtonProps={{ disabled: !approvedAssetId }}
        onCancel={() => {
          setApproveOpen(false)
          setActiveTask(undefined)
          setApprovedAssetId(undefined)
        }}
        onOk={() => modalTask && action.mutate({ type: 'approve', task: modalTask })}
      >
        <Select
          style={{ width: '100%' }}
          placeholder={t('portal.design.chooseApprovedFile')}
          value={approvedAssetId}
          onChange={setApprovedAssetId}
          options={(modalTask?.latestSubmission?.assets ?? []).map(({ id, originalFilename }) => ({
            value: id,
            label: originalFilename ?? id,
          }))}
        />
      </Modal>
      <Modal
        open={submitOpen}
        title={t('portal.design.submitFiles')}
        width={560}
        okText={t('portal.design.submit')}
        confirmLoading={action.isPending}
        okButtonProps={{
          disabled: activeTask?.taskType === 'PSD_TEMPLATE' ? !packageFile : !files.length,
        }}
        onCancel={() => {
          uploadController?.abort()
          setSubmitOpen(false)
          setActiveTask(undefined)
        }}
        onOk={() => activeTask && action.mutate({ type: 'submit', task: activeTask })}
      >
        <Space direction="vertical" size={20} style={{ width: '100%', padding: '4px 0' }}>
          <div className={styles.submitContext}>
            <div className={styles.submitContextMain}>
              <Typography.Text strong>{activeTask?.listing?.sku ?? '-'}</Typography.Text>
              <Space size={6} wrap>
                {activeTask?.taskType ? (
                  <Tag color="cyan">{t(designEnumLabelKey('taskTypes', activeTask.taskType))}</Tag>
                ) : null}
                {activeTask?.status ? (
                  <StatusTag status={tone(activeTask.status)}>
                    {t(designEnumLabelKey('statuses', activeTask.status))}
                  </StatusTag>
                ) : null}
              </Space>
            </div>
            <Space size="small">
              <EmployeeAvatar
                name={activeTask?.assignedDesigner?.fullName ?? t('portal.design.unassigned')}
                avatarUrl={activeTask?.assignedDesigner?.avatarUrl}
                size={36}
              />
              <div>
                <Typography.Text type="secondary" className={styles.submitContextLabel}>
                  {t('portal.design.designer')}
                </Typography.Text>
                <Typography.Text strong className={styles.submitContextName}>
                  {activeTask?.assignedDesigner?.fullName ?? t('portal.design.unassigned')}
                </Typography.Text>
              </div>
            </Space>
          </div>
          {activeTask?.taskType === 'PSD_TEMPLATE' ? (
            <>
              <div
                style={{
                  background: 'var(--ant-color-fill-quaternary)',
                  border: '1px solid var(--ant-color-border-secondary)',
                  borderRadius: 10,
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div>
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {t('portal.design.designPackage')}
                    <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>
                  </Typography.Text>
                  <Typography.Text
                    type="secondary"
                    style={{ display: 'block', fontSize: 12, marginBottom: 8 }}
                  >
                    .psd or .zip — max 2 GB
                  </Typography.Text>
                  <input
                    aria-label={t('portal.design.designPackage')}
                    type="file"
                    accept=".psd,.zip"
                    disabled={action.isPending}
                    style={{ display: 'block', width: '100%' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      if (file.size > 2 * 1024 * 1024 * 1024) {
                        toast('error', t('portal.design.designPackageTooLarge'))
                        event.target.value = ''
                        return
                      }
                      setPackageFile(file)
                    }}
                  />
                  {packageFile && (
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 12, marginTop: 4, display: 'block' }}
                    >
                      ✓ {packageFile.name} ({(packageFile.size / 1024 / 1024).toFixed(1)} MB)
                    </Typography.Text>
                  )}
                </div>

                <div>
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {t('portal.design.previewImage')}
                  </Typography.Text>
                  <Typography.Text
                    type="secondary"
                    style={{ display: 'block', fontSize: 12, marginBottom: 8 }}
                  >
                    PNG / JPEG / WebP — optional
                  </Typography.Text>
                  <input
                    aria-label="Preview image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={action.isPending}
                    style={{ display: 'block', width: '100%' }}
                    onChange={(event) => setPreviewFile(event.target.files?.[0])}
                  />
                  {previewFile && (
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 12, marginTop: 4, display: 'block' }}
                    >
                      ✓ {previewFile.name}
                    </Typography.Text>
                  )}
                </div>
              </div>

              {action.isPending && (
                <div>
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 12, marginBottom: 6, display: 'block' }}
                  >
                    Uploading package…
                  </Typography.Text>
                  <Progress
                    percent={uploadProgress}
                    status={uploadProgress < 100 ? 'active' : 'success'}
                  />
                </div>
              )}
            </>
          ) : (
            <FileUpload
              multiple
              fileList={files}
              title={t('portal.design.dropFiles')}
              description="PNG, JPEG, WebP, SVG, PDF…"
              onChange={({ fileList }) => setFiles(fileList)}
            />
          )}

          <div>
            <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
              {t('portal.design.note')}
            </Typography.Text>
            <Input.TextArea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('portal.design.note')}
            />
          </div>
        </Space>
      </Modal>
      <Modal
        open={rejectOpen}
        title={t('portal.design.rejectSubmission')}
        okText={t('portal.design.reject')}
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        confirmLoading={action.isPending}
        onCancel={() => {
          setRejectOpen(false)
          setActiveTask(undefined)
        }}
        onOk={() => modalTask && action.mutate({ type: 'reject', task: modalTask })}
      >
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder={t('portal.design.reasonRequired')}
        />
      </Modal>
      <Modal
        open={cancelOpen}
        title={t('portal.design.cancelTask')}
        okText={t('portal.design.cancel')}
        confirmLoading={action.isPending}
        okButtonProps={{ danger: true, disabled: !cancelReason.trim() }}
        onCancel={() => {
          setCancelOpen(false)
          setCancelReason('')
          setActiveTask(undefined)
        }}
        onOk={() => modalTask && action.mutate({ type: 'cancel', task: modalTask })}
      >
        <Input.TextArea
          rows={3}
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder={t('portal.design.cancelReason')}
        />
      </Modal>
    </section>
  )
}
