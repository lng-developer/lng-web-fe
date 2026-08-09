import { type Key, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  AppstoreOutlined,
  AuditOutlined,
  EyeOutlined,
  MoreOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  UserAddOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UploadFile } from 'antd'
import {
  Button,
  Checkbox,
  Descriptions,
  Dropdown,
  Empty,
  Input,
  Modal,
  Pagination,
  Progress,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import {
  Bar,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  getListingOptions,
  type ListingOptions,
  listListings,
} from '@/features/portal/catalog/api/catalogApi'
import { AuthenticatedMediaImage, downloadMediaAsset, uploadMultipartAsset } from '@/shared/media'
import {
  DetailDrawer,
  EmployeeAvatar,
  FileUpload,
  FilterBar,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  approveDesignTask,
  assignDesignTask,
  bulkAssignDesignTasks,
  cancelDesignTask,
  createDesignTask,
  type CreateDesignTaskInput,
  type DesignTask,
  getDesignSummary,
  getDesignTask,
  getDesignWorkload,
  listDesignAssignees,
  listDesignSubmissions,
  listDesignTasks,
  rejectDesignTask,
  startDesignTask,
  submitDesignTask,
  uploadDesignAsset,
} from '../api/designApi'
import { designKeys } from '../api/designKeys'
import { type CreateDesignTaskDraft, CreateDesignTaskModal } from './CreateDesignTaskModal'
import styles from './DesignWorkbenchPage.module.scss'

const PAGE_SIZE = 20
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
type SortableAction = 'assign' | 'start' | 'submit' | 'review'

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
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  // Defer search to avoid network request on every keystroke
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState<DesignTaskStatus>()
  const [taskType, setTaskType] = useState<DesignTaskType>()
  const [selectedId, setSelectedId] = useState<string>()
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

  // R2: Memoize query params — prevents useQuery from seeing a new object ref every render
  // Uses deferredSearch so search only triggers fetch after typing pauses (not every keystroke)
  const params = useMemo(
    () => ({ page, limit: PAGE_SIZE, search: deferredSearch || undefined, status, taskType }),
    [page, deferredSearch, status, taskType],
  )
  const dashboardParams = useMemo(
    () => ({ search: deferredSearch || undefined, status, taskType }),
    [deferredSearch, status, taskType],
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
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: designKeys.all }),
    [queryClient],
  )
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])
  const handleStatusChange = useCallback((value?: DesignTaskStatus) => {
    setStatus(value)
    setPage(1)
  }, [])
  const handleTaskTypeChange = useCallback((value?: DesignTaskType) => {
    setTaskType(value)
    setPage(1)
  }, [])
  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage)
  }, [])
  const handleCreateTaskOpen = useCallback(() => {
    setCreateTaskOpen(true)
  }, [])
  const setTaskDraft = useCallback((id: string) => {
    setSelectedId(id)
  }, [])
  const closeTaskDrawer = useCallback(() => {
    setSelectedId(undefined)
  }, [])
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
      toast('error', error instanceof Error ? error.message : 'Could not update design task'),
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
      toast('error', error instanceof Error ? error.message : 'Could not create design task'),
  })
  const handleCreateTaskSubmit = useCallback(
    (draft: CreateDesignTaskDraft) => createTask.mutate(draft),
    [createTask],
  )

  const bulkAssign = useMutation({
    mutationFn: () => bulkAssignDesignTasks(selectedRowKeys.map(String), bulkDesignerId!),
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

  const canAssign = permissions.has('DESIGN:WRITE')
  const canWork = permissions.has('DESIGN:WRITE') || permissions.has('DESIGN:WORK')
  const canReview = permissions.has('DESIGN:WRITE') || permissions.has('DESIGN:REVIEW')
  const assigneeNames = useMemo(
    () => new Map((assignees.data ?? []).map(({ id, fullName, name }) => [id, fullName ?? name])),
    [assignees.data],
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
  const statusOptions = useMemo(() => STATUSES.map((value) => ({ value, label: value })), [])
  const typeOptions = useMemo(() => TYPES.map((value) => ({ value, label: value })), [])

  const openQuickAction = useCallback(
    (task: DesignTask, type: SortableAction) => {
      if (type === 'review') setSelectedId(task.id)
      if (type === 'assign') {
        setActiveTask(task)
        setAssignOpen(true)
      }
      if (type === 'start') action.mutate({ type: 'start', task })
      if (type === 'submit') {
        setActiveTask(task)
        setSubmitOpen(true)
      }
    },
    [action],
  )

  const handleBulkAssign = useCallback(() => {
    bulkAssign.mutate()
  }, [bulkAssign])
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

  const selectableTasks = useMemo(
    () =>
      (displayedTasks?.items ?? []).filter((row) =>
        ['REQUESTED', 'OPEN', 'ASSIGNED'].includes(row.status),
      ),
    [displayedTasks],
  )
  const selectedSet = useMemo(() => new Set(selectedRowKeys), [selectedRowKeys])

  const isAllSelected = useMemo(
    () => selectableTasks.length > 0 && selectableTasks.every((row) => selectedSet.has(row.id)),
    [selectableTasks, selectedSet],
  )

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedRowKeys((prev) =>
        checked
          ? [...new Set([...prev, ...selectableTasks.map((t) => t.id)])]
          : prev.filter((id) => !selectableTasks.some((t) => t.id === id)),
      )
    },
    [selectableTasks],
  )

  const toggleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedRowKeys((prev) => (checked ? [...prev, id] : prev.filter((key) => key !== id)))
  }, [])

  const task = detail.data

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.design.title')}
        description={t('portal.design.description')}
        actions={
          <Space>
            <Button href="/portal/design/files">PSD files</Button>
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
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              {t('portal.design.refresh')}
            </Button>
          </Space>
        }
      />

      <div className={styles.grid}>
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
          <div
            style={{ height: 160, width: '100%' }}
            role="img"
            aria-label={(workload.data?.byDesigner ?? [])
              .map(
                (item) =>
                  `${assigneeNames.get(item.assignedDesignerId) || t('portal.design.unknownDesigner', 'Unknown')}: ${item.totalActive}`,
              )
              .join(', ')}
          >
            {workload.data?.byDesigner && workload.data.byDesigner.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={workload.data.byDesigner.map((d) => ({
                    name:
                      assigneeNames.get(d.assignedDesignerId) ||
                      t('portal.design.unknownDesigner', 'Unknown'),
                    active: d.totalActive,
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="active" fill="#1890ff" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <Typography.Text type="secondary">
                  {t('portal.design.noWorkload', 'No active workload')}
                </Typography.Text>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t('portal.design.tasks', 'Design Tasks')}
          </Typography.Title>
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
                  placeholder={t('portal.design.selectDesigner')}
                  value={bulkDesignerId}
                  onChange={setBulkDesignerId}
                  options={assigneeOptions}
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
        </div>

        {canAssign && selectableTasks.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: '#f5f5f5',
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            <Checkbox
              aria-label={t(
                'portal.design.selectAllPage',
                'Select all selectable tasks on this page',
              )}
              checked={isAllSelected}
              onChange={(e) => toggleSelectAll(e.target.checked)}
            />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {t('portal.design.selectAllPage', 'Select all selectable tasks on this page')}
            </Typography.Text>
          </div>
        )}

        {tasks.isFetching ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Typography.Text type="secondary">
              {t('portal.design.loading', 'Loading tasks...')}
            </Typography.Text>
          </div>
        ) : (
          <div className={styles.taskList}>
            {displayedTasks?.items.map((row) => {
              const isSelected = selectedSet.has(row.id)
              const isSelectable =
                canAssign && ['REQUESTED', 'OPEN', 'ASSIGNED'].includes(row.status)
              const primaryAction =
                canAssign && ['REQUESTED', 'OPEN'].includes(row.status)
                  ? ([
                      'assign',
                      t('portal.design.assign'),
                      <UserAddOutlined key="assign" />,
                    ] as const)
                  : canWork && row.status === 'ASSIGNED'
                    ? ([
                        'start',
                        t('portal.design.start'),
                        <PlayCircleOutlined key="start" />,
                      ] as const)
                    : canWork && ['IN_PROGRESS', 'REJECTED'].includes(row.status)
                      ? ([
                          'submit',
                          t('portal.design.submit'),
                          <UploadOutlined key="submit" />,
                        ] as const)
                      : canReview && row.status === 'SUBMITTED'
                        ? ([
                            'review',
                            t('portal.design.review'),
                            <AuditOutlined key="review" />,
                          ] as const)
                        : null

              return (
                <div
                  key={row.id}
                  className={`${styles.taskCard} ${isSelected ? styles.taskCardSelected : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setTaskDraft(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setTaskDraft(row.id)
                    }
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}
                  >
                    {canAssign && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Checkbox
                          aria-label={`Select ${row.listing?.sku ?? row.id}`}
                          disabled={!isSelectable}
                          checked={isSelected}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => toggleSelectRow(row.id, event.target.checked)}
                        />
                      </div>
                    )}

                    <div className={styles.thumbnailContainer}>
                      {row.thumbnailAsset?.downloadUrl ? (
                        <AuthenticatedMediaImage
                          downloadUrl={row.thumbnailAsset.downloadUrl}
                          alt="Preview"
                          className={styles.thumbnailImg}
                          fallback="/favicon.svg"
                        />
                      ) : (
                        <div className={styles.thumbnailPlaceholder}>
                          <PictureOutlined style={{ fontSize: 20, color: '#bfbfbf' }} />
                        </div>
                      )}
                    </div>

                    <div className={styles.taskMeta}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                      >
                        <Typography.Text strong style={{ fontSize: 15 }}>
                          {row.listing?.sku ?? '-'}
                        </Typography.Text>
                        <Tag color="cyan" style={{ borderRadius: 4 }}>
                          {row.taskType}
                        </Tag>
                        <StatusTag status={priorityTone(row.priority)}>{row.priority}</StatusTag>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {row.listing?.productTypeName ?? '-'} · {row.shop?.name ?? '-'}
                        </Typography.Text>
                      </div>
                    </div>
                  </div>

                  <div className={styles.taskAssignee}>
                    <Space size="small">
                      <EmployeeAvatar
                        name={row.assignedDesigner?.fullName ?? t('portal.design.unassigned')}
                        avatarUrl={row.assignedDesigner?.avatarUrl}
                        size={28}
                      />
                      <Typography.Text style={{ fontSize: 13 }}>
                        {row.assignedDesigner?.fullName ?? t('portal.design.unassigned')}
                      </Typography.Text>
                    </Space>
                    <div style={{ marginTop: 4 }}>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(row.updatedAt).format('YYYY-MM-DD HH:mm')}
                      </Typography.Text>
                    </div>
                  </div>

                  <div className={styles.taskStatus}>
                    <StatusTag status={tone(row.status)}>{row.status}</StatusTag>
                  </div>

                  <div className={styles.taskActions}>
                    {primaryAction ? (
                      <Tooltip title={primaryAction[1]}>
                        <Button
                          aria-label={primaryAction[1]}
                          type="text"
                          icon={primaryAction[2]}
                          onClick={(event) => {
                            event.stopPropagation()
                            openQuickAction(row, primaryAction[0])
                          }}
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip title={t('portal.design.view')}>
                        <Button
                          aria-label={t('portal.design.view')}
                          type="text"
                          icon={<EyeOutlined />}
                          onClick={(event) => {
                            event.stopPropagation()
                            setTaskDraft(row.id)
                          }}
                        />
                      </Tooltip>
                    )}
                    {primaryAction && (
                      <Dropdown
                        menu={{
                          items: [{ key: 'view', label: t('portal.design.view') }],
                          onClick: () => setTaskDraft(row.id),
                        }}
                      >
                        <Button
                          aria-label={t('portal.design.moreActions', 'More actions')}
                          type="text"
                          icon={<MoreOutlined />}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </Dropdown>
                    )}
                  </div>
                </div>
              )
            })}
            {(displayedTasks?.items ?? []).length === 0 && (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        )}

        {displayedTasks && displayedTasks.pagination.total > PAGE_SIZE && (
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={displayedTasks.pagination.total}
              onChange={handlePageChange}
              showSizeChanger={false}
            />
          </div>
        )}
      </SectionCard>

      <DetailDrawer
        open={Boolean(selectedId)}
        width={720}
        title={task?.listing?.sku ?? t('portal.design.task')}
        onClose={closeTaskDrawer}
        footer={
          task ? (
            <div className={styles.actions}>
              {canAssign && ['REQUESTED', 'OPEN', 'ASSIGNED'].includes(task.status) ? (
                <Button onClick={() => handleOpenAssign(task)}>{t('portal.design.assign')}</Button>
              ) : null}
              {canWork && task.status === 'ASSIGNED' ? (
                <Button type="primary" onClick={() => handleStartWork(task)}>
                  {t('portal.design.start')}
                </Button>
              ) : null}
              {canWork && ['IN_PROGRESS', 'REJECTED'].includes(task.status) ? (
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => handleOpenSubmit(task)}
                >
                  {t('portal.design.submitFiles')}
                </Button>
              ) : null}
              {canReview && task.status === 'SUBMITTED' && task.latestSubmission?.assets.length ? (
                <>
                  <Button type="primary" onClick={() => setApproveOpen(true)}>
                    {t('portal.design.approve')}
                  </Button>
                  <Button danger onClick={() => setRejectOpen(true)}>
                    {t('portal.design.reject')}
                  </Button>
                </>
              ) : null}
              {canAssign && !['APPROVED', 'CANCELLED'].includes(task.status) ? (
                <Button danger onClick={() => setCancelOpen(true)}>
                  {t('portal.design.cancel')}
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      >
        {task ? (
          <div className={styles.detail}>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                { key: 'status', label: 'Status', children: task.status },
                { key: 'type', label: 'Task type', children: task.taskType },
                {
                  key: 'listing',
                  label: 'Listing',
                  children: task.listing?.sku ?? '-',
                },
                {
                  key: 'template',
                  label: 'Template',
                  children: task.internalTemplate?.name ?? '-',
                },
                {
                  key: 'productType',
                  label: 'Product type',
                  children: task.listing?.productTypeName ?? '-',
                },
                {
                  key: 'designer',
                  label: 'Designer',
                  children: task.assignedDesigner?.fullName ?? '-',
                },
                { key: 'brief', label: 'Brief', children: task.brief ?? '-' },
                {
                  key: 'outputs',
                  label: 'Expected outputs',
                  children: task.expectedOutputs.join(', ') || '-',
                },
                {
                  key: 'rejection',
                  label: 'Reject reason',
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
                    children: `v${submission.version} · ${submission.status}`,
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
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          value={designerId}
          onChange={setDesignerId}
          options={assigneeOptions}
        />
      </Modal>
      <Modal
        open={approveOpen}
        title={t('portal.design.approveConfirm')}
        okText={t('portal.design.approve')}
        confirmLoading={action.isPending}
        okButtonProps={{ disabled: !approvedAssetId }}
        onCancel={() => setApproveOpen(false)}
        onOk={() => task && action.mutate({ type: 'approve', task })}
      >
        <Select
          style={{ width: '100%' }}
          placeholder={t('portal.design.chooseApprovedFile')}
          value={approvedAssetId}
          onChange={setApprovedAssetId}
          options={(task?.latestSubmission?.assets ?? []).map(({ id, originalFilename }) => ({
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
                <Tag color="cyan">{activeTask?.taskType}</Tag>
                <StatusTag status={tone(activeTask?.status ?? '')}>{activeTask?.status}</StatusTag>
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
        onCancel={() => setRejectOpen(false)}
        onOk={() => task && action.mutate({ type: 'reject', task })}
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
        }}
        onOk={() => task && action.mutate({ type: 'cancel', task })}
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
