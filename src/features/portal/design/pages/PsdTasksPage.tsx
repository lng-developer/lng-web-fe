import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  HistoryOutlined,
  HourglassOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SolutionOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType, UploadFile } from 'antd'
import { Button, Input, Modal, Popover, Select, Space, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { downloadMediaAsset } from '@/shared/media'
import {
  ConfirmDangerModal,
  DATA_COLORS,
  DateRangePicker,
  type DateRangeValue,
  FileUpload,
  StatusPill,
  UiTabLabel,
  UiTabs,
  useFeedbackToast,
  ZoomableImage,
} from '@/shared/ui'

import { listShops } from '@/features/portal/shops/api/shopApi'
import {
  approveDesignTask,
  assignDesignTask,
  deleteDesignTask,
  type DesignTask,
  type DesignTaskPriority,
  getDesignSummary,
  listDesignAssignees,
  listDesignTasks,
  rejectDesignTask,
  startDesignTask,
  submitDesignTask,
  updateDesignTask,
  updateDesignTaskPriority,
  uploadDesignAsset,
} from '../api/designApi'
import { designKeys } from '../api/designKeys'
import styles from './PsdTasksPage.module.scss'

dayjs.extend(relativeTime)

const { Text } = Typography

const STATUS_TABS = [
  { key: 'all', title: 'All', status: undefined },
  { key: 'New', title: 'New', status: 'NEW' },
  { key: 'Requested', title: 'Requested', status: 'REQUESTED' },
  { key: 'Assigned', title: 'Assigned', status: 'ASSIGNED' },
  { key: 'In Progress', title: 'In Progress', status: 'IN_PROGRESS' },
  { key: 'Uploaded', title: 'Uploaded', status: 'SUBMITTED' },
  { key: 'QC Rejected', title: 'QC Rejected', status: 'REJECTED' },
  { key: 'QC Passed', title: 'QC Passed', status: 'APPROVED' },
] as const

type TaskHistoryItem = {
  action?: string
  status?: string
  from?: string
  to?: string
  at?: string
  createdAt?: string
}

function renderHistoryContent(history: TaskHistoryItem[] = []) {
  if (!history || history.length === 0) {
    return (
      <div style={{ color: 'var(--ant-color-text-secondary)', padding: '4px 8px' }}>
        No history recorded
      </div>
    )
  }
  return (
    <div style={{ maxHeight: 240, overflowY: 'auto', padding: '4px 0' }}>
      {history.map((item, idx) => (
        <div key={idx} style={{ marginBottom: 8, minWidth: 180 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {item.from ? <span style={{ fontWeight: 500 }}>{item.from}</span> : null}
            <span style={{ color: DATA_COLORS.success, fontSize: 13 }}>➔</span>
            <span style={{ fontWeight: 500 }}>
              {item.to || item.action || item.status || 'Updated'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ant-color-text-tertiary)', marginLeft: 16 }}>
            {item.at
              ? dayjs(item.at).format('YYYY-MM-DD HH:mm')
              : item.createdAt
                ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')
                : '-'}
          </div>
        </div>
      ))}
    </div>
  )
}

function getStatusInfo(status?: string) {
  switch (status) {
    case 'NEW':
    case 'New':
      return { label: 'New', color: DATA_COLORS.success }
    case 'REQUESTED':
    case 'Requested':
      return { label: 'Requested', color: DATA_COLORS.process }
    case 'ASSIGNED':
    case 'Assigned':
      return { label: 'Assigned', color: DATA_COLORS.process }
    case 'IN_PROGRESS':
    case 'In Progress':
      return { label: 'In Progress', color: DATA_COLORS.process }
    case 'SUBMITTED':
    case 'Uploaded':
      return { label: 'Uploaded', color: DATA_COLORS.success }
    case 'REJECTED':
    case 'QC Rejected':
      return { label: 'QC Rejected', color: DATA_COLORS.cancelled }
    case 'APPROVED':
    case 'QC Passed':
      return { label: 'QC Passed', color: DATA_COLORS.success }
    default:
      return { label: status || '-', color: DATA_COLORS.default }
  }
}

function getPriorityInfo(priority?: string) {
  switch (priority) {
    case 'LOW':
    case 'Low':
      return { label: 'Low', color: DATA_COLORS.yellow }
    case 'NORMAL':
    case 'Normal':
      return { label: 'Normal', color: DATA_COLORS.process }
    case 'HIGH':
    case 'High':
      return { label: 'High', color: DATA_COLORS.process }
    case 'URGENT':
    case 'Urgent':
      return { label: 'Urgent', color: DATA_COLORS.purple }
    case 'EASY':
    case 'Easy':
      return { label: 'Easy', color: DATA_COLORS.success }
    case 'HARD':
    case 'Hard':
      return { label: 'Hard', color: DATA_COLORS.pink }
    case 'EXTREMELY':
    case 'Extremely':
      return { label: 'Extremely', color: DATA_COLORS.purple }
    default:
      return { label: priority || 'Normal', color: DATA_COLORS.default }
  }
}

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

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [activeTabKey, setActiveTabKey] = useState<string>('all')
  const [selectedSellerId, setSelectedSellerId] = useState<string>()
  const [dateRange, setDateRange] = useState<DateRangeValue>({})

  const [prevChannel, setPrevChannel] = useState(salesChannelCode)
  if (prevChannel !== salesChannelCode) {
    setPrevChannel(salesChannelCode)
    setPage(1)
  }

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null)
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>()

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [uploadNote, setUploadNote] = useState('')

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
      search: deferredSearch || undefined,
      taskType: 'PSD_TEMPLATE' as const,
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
      deferredSearch,
      salesChannelCode,
      activeTabConfig.status,
      selectedSellerId,
      dateRange.dateFrom,
      dateRange.dateTo,
    ],
  )

  const tasksQuery = useQuery({
    queryKey: designKeys.list(queryParams),
    queryFn: () => listDesignTasks(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  const shopsQuery = useQuery({
    queryKey: ['shops', 'active'],
    queryFn: () => listShops({ page: 1, limit: 100, status: 'ACTIVE' }),
    staleTime: 5 * 60 * 1000,
    enabled: !canPsdRequest || canWrite,
  })

  const summaryQuery = useQuery({
    queryKey: designKeys.summary({ taskType: 'PSD_TEMPLATE', salesChannelCode }),
    queryFn: () => getDesignSummary({ taskType: 'PSD_TEMPLATE', salesChannelCode }),
    staleTime: 30_000,
    enabled: !canPsdRequest || canWrite,
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
      const msg = err instanceof Error ? err.message : 'Assign failed'
      toast('error', msg)
    },
  })

  const startMutation = useMutation({
    mutationFn: (taskId: string) => startDesignTask(taskId),
    onSuccess: () => {
      toast('success', 'Task started')
      invalidate()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to start task'
      toast('error', msg)
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
        files.filter((f) => f.originFileObj).map((f) => uploadDesignAsset(f.originFileObj as File)),
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
      setTargetTaskId(null)
      invalidate()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Submit failed'
      toast('error', msg)
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
      const msg = err instanceof Error ? err.message : 'Approve failed'
      toast('error', msg)
    },
  })

  const priorityMutation = useMutation({
    mutationFn: ({ taskId, priority }: { taskId: string; priority: DesignTaskPriority }) =>
      updateDesignTaskPriority(taskId, priority),
    onSuccess: invalidate,
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
      const msg = err instanceof Error ? err.message : 'Reject failed'
      toast('error', msg)
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
      const msg = err instanceof Error ? err.message : 'Failed to delete task'
      toast('error', msg)
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
      const msg = err instanceof Error ? err.message : 'Failed to request upload'
      toast('error', msg)
    },
  })

  const counts = useMemo(() => {
    const byStatus = summaryQuery.data?.byStatus || {}
    const total = summaryQuery.data?.total ?? 0
    return {
      all: total,
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
        return !code || code === salesChannelCode
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

  const columns = useMemo<TableColumnsType<DesignTask>>(() => {
    const baseColumns: TableColumnsType<DesignTask> = [
      {
        title: t('portal.design.createdAt', { defaultValue: 'Created At' }),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 140,
        align: 'center',
        render: (val: string) => {
          if (!val) return '-'
          const d = dayjs(val)
          if (!d.isValid()) return '-'
          const primary = d.format('MMM D, YYYY')
          const relative = d
            .fromNow()
            .replace(/^about /, '')
            .replace(/^less than /, '')
          return (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{primary}</span>
              <span style={{ fontSize: 12, whiteSpace: 'nowrap', color: DATA_COLORS.title }}>
                ({relative})
              </span>
            </div>
          )
        },
      },
      {
        title: t('portal.design.productImage', { defaultValue: 'Product Image' }),
        key: 'image',
        width: 120,
        align: 'center',
        render: (_, record) => {
          const img =
            record.image ||
            record.imageUrl ||
            record.thumbnailAsset?.downloadUrl ||
            record.listing?.productImageUrl ||
            record.latestSubmission?.assets?.[0]?.downloadUrl ||
            undefined
          return (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 8,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--ant-color-fill-quaternary, #f8fafc)',
                  boxShadow:
                    'var(--ui-surface-elevate-shadow, rgba(9, 30, 66, 0.25) 0px 4px 8px -2px)',
                }}
              >
                <ZoomableImage
                  src={img}
                  alt={record.title || 'Product Image'}
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover', borderRadius: 8, width: 100, height: 100 }}
                />
              </div>
            </div>
          )
        },
      },
      {
        title:
          salesChannelCode === 'ETSY'
            ? 'Listing ID'
            : t('portal.design.asin', { defaultValue: 'Asin' }),
        key: 'asin',
        width: 130,
        align: 'center',
        render: (_, record) => {
          const asin =
            record.listing?.asin ||
            record.listing?.etsyListingId ||
            (record as { asin?: string }).asin
          return <StatusPill title={asin || '-'} color={DATA_COLORS.pending} />
        },
      },
      {
        title: t('portal.design.statusTask', { defaultValue: 'Status Task' }),
        key: 'status',
        width: 150,
        align: 'center',
        render: (_, record) => {
          const { label, color } = getStatusInfo(record.status)
          return (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <StatusPill title={label} color={color} />
              <Popover
                placement="bottomLeft"
                title="History"
                content={renderHistoryContent(
                  (record as { history?: TaskHistoryItem[] }).history || [],
                )}
                arrow={false}
              >
                <HistoryOutlined
                  style={{ fontSize: 16, cursor: 'pointer', color: DATA_COLORS.title }}
                />
              </Popover>
            </div>
          )
        },
      },
      {
        title: t('portal.design.assignedTo', { defaultValue: 'Assigned' }),
        key: 'assignedDesigner',
        width: 150,
        align: 'center',
        render: (_, record) => {
          const assignedName =
            record.assignedDesigner?.fullName ||
            (record.assignedDesigner as { name?: string })?.name ||
            (record.assignedDesigner as { full_name?: string })?.full_name ||
            'Pending assign'
          return (
            <Space orientation="vertical">
              <StatusPill title={assignedName} color={DATA_COLORS.purple} />
              {canWrite && record.status === 'ASSIGNED' ? (
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    setTargetTaskId(record.id)
                    setSelectedDesignerId(record.assignedDesignerId || undefined)
                    setAssignModalOpen(true)
                  }}
                >
                  {t('portal.design.reassignDesigner')}
                </Button>
              ) : null}
            </Space>
          )
        },
      },
      {
        title: t('common.priority', { defaultValue: 'Priority' }),
        dataIndex: 'priority',
        key: 'priority',
        width: 110,
        align: 'center',
        render: (priority: DesignTaskPriority, record) => {
          const { label, color } = getPriorityInfo(priority)
          if (canReprioritize) {
            return (
              <Select
                aria-label={t('common.priority')}
                size="small"
                value={priority}
                loading={
                  priorityMutation.isPending && priorityMutation.variables?.taskId === record.id
                }
                onChange={(nextPriority) =>
                  priorityMutation.mutate({ taskId: record.id, priority: nextPriority })
                }
                options={['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            )
          }
          return <StatusPill title={label} color={color} />
        },
      },
      {
        title: t('portal.design.psdStatus', { defaultValue: 'PSD Status' }),
        key: 'psdStatus',
        width: 130,
        align: 'center',
        render: (_, record) => {
          const isAvailable =
            record.listing?.psdStatus === 'Available' ||
            record.listing?.psdStatus === 'PRESENT' ||
            record.status === 'APPROVED'
          return (
            <StatusPill
              title={isAvailable ? 'Available' : 'Unavailable'}
              color={isAvailable ? DATA_COLORS.success : DATA_COLORS.cancelled}
            />
          )
        },
      },
      {
        title: t('portal.design.seller', { defaultValue: 'Seller' }),
        key: 'seller',
        width: 150,
        align: 'center',
        render: (_, record) => {
          const sellerName =
            record.seller?.fullName ||
            (record.seller as { full_name?: string })?.full_name ||
            record.createdBy?.fullName ||
            (record.createdBy as { full_name?: string })?.full_name ||
            (record.seller as { name?: string })?.name ||
            record.shop?.name ||
            'Unknown'
          return <StatusPill title={sellerName} color={DATA_COLORS.process} />
        },
      },
      {
        title: t('portal.design.asinType', { defaultValue: 'Asin Type' }),
        key: 'asinType',
        width: 120,
        align: 'center',
        render: (_, record) => {
          const asinType =
            record.asinType ||
            record.asin_type ||
            record.listing?.asinType ||
            record.listing?.asin_type ||
            'Normal'
          return <StatusPill title={asinType} color={DATA_COLORS.asin} />
        },
      },
    ]

    if (activeTabKey !== 'all' && activeTabKey !== 'New') {
      baseColumns.push({
        title: t('common.note', { defaultValue: 'Note' }),
        dataIndex: 'note',
        key: 'note',
        width: 180,
        align: 'left',
        render: (_, record) => (
          <Typography.Paragraph
            ellipsis={{ rows: 2, tooltip: record.latestSubmission?.note }}
            style={{ margin: 0 }}
          >
            {record.latestSubmission?.note || '-'}
          </Typography.Paragraph>
        ),
      })
    }

    baseColumns.push({
      title: t('common.actions', { defaultValue: 'Actions' }),
      key: 'actions',
      width: 180,
      align: 'center',
      render: (_, record) => {
        const latestAsset = record.latestSubmission?.assets?.[0]
        const approvedId = record.approvedAssetId || record.latestSubmission?.approvedAssetId
        const downloadAsset =
          record.status === 'APPROVED'
            ? record.latestSubmission?.assets?.find((asset) => asset.id === approvedId)
            : canWork
              ? latestAsset
              : null

        return (
          <Space size={4} wrap align="center" style={{ justifyContent: 'center' }}>
            {/* Upload button (not for QC Passed) */}
            {canWork && record.status !== 'APPROVED' ? (
              <Tooltip title="Upload">
                <Button
                  size="small"
                  aria-label={t('portal.design.psdFile')}
                  icon={<UploadOutlined />}
                  onClick={() => {
                    setTargetTaskId(record.id)
                    setUploadModalOpen(true)
                  }}
                />
              </Tooltip>
            ) : null}

            {/* Download button */}
            <Tooltip title={t('common.download')}>
              <Button
                size="small"
                aria-label={t('common.download')}
                disabled={!downloadAsset?.downloadUrl}
                icon={<DownloadOutlined />}
                onClick={() => {
                  if (downloadAsset?.downloadUrl) {
                    void downloadMediaAsset(
                      downloadAsset.downloadUrl,
                      downloadAsset.originalFilename ?? undefined,
                    ).catch(() => toast('error', t('common.downloadFailed')))
                  }
                }}
              />
            </Tooltip>

            {/* New: Request upload */}
            {record.status === 'NEW' ? (
              <Tooltip title="Request upload">
                <Button
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() => {
                    setTargetTaskId(record.id)
                    setRequestModalOpen(true)
                  }}
                />
              </Tooltip>
            ) : null}

            {/* Requested: Assign */}
            {canWrite && record.status === 'REQUESTED' ? (
              <Tooltip title="Assign">
                <Button
                  size="small"
                  aria-label={t('portal.design.assignDesigner')}
                  icon={<SolutionOutlined />}
                  onClick={() => {
                    setTargetTaskId(record.id)
                    setSelectedDesignerId(record.assignedDesignerId || undefined)
                    setAssignModalOpen(true)
                  }}
                />
              </Tooltip>
            ) : null}

            {/* Assigned: Start doing */}
            {canWork && record.status === 'ASSIGNED' ? (
              <Tooltip title="Start doing">
                <Button
                  size="small"
                  icon={<HourglassOutlined />}
                  onClick={() => startMutation.mutate(record.id)}
                  loading={startMutation.isPending && startMutation.variables === record.id}
                />
              </Tooltip>
            ) : null}

            {/* Uploaded / SUBMITTED: Pass & Reject */}
            {(canWrite || canReview) && record.status === 'SUBMITTED' ? (
              <>
                <Tooltip title="Passed">
                  <Button
                    size="small"
                    icon={<CheckCircleOutlined style={{ color: DATA_COLORS.success }} />}
                    onClick={() =>
                      approveMutation.mutate({
                        taskId: record.id,
                        assetId: latestAsset?.id || '',
                      })
                    }
                    loading={
                      approveMutation.isPending && approveMutation.variables?.taskId === record.id
                    }
                  />
                </Tooltip>
                <Tooltip title="Reject">
                  <Button
                    size="small"
                    icon={<RollbackOutlined style={{ color: DATA_COLORS.cancelled }} />}
                    onClick={() => {
                      setTargetTaskId(record.id)
                      setRejectModalOpen(true)
                    }}
                  />
                </Tooltip>
              </>
            ) : null}

            {/* Delete */}
            {canWrite ? (
              <Tooltip title="Delete">
                <Button
                  size="small"
                  icon={<DeleteOutlined style={{ color: DATA_COLORS.cancelled }} />}
                  onClick={() => {
                    setTargetTaskId(record.id)
                    setDeleteModalOpen(true)
                  }}
                />
              </Tooltip>
            ) : null}
          </Space>
        )
      },
    })

    return baseColumns
  }, [
    activeTabKey,
    approveMutation,
    canReprioritize,
    canReview,
    canWork,
    canWrite,
    priorityMutation,
    salesChannelCode,
    startMutation,
    t,
    toast,
  ])

  const assignmentTask = tasksQuery.data?.items.find((task) => task.id === targetTaskId)
  const canConfirmAssignment = Boolean(
    selectedDesignerId &&
    assignmentTask &&
    (assignmentTask.status !== 'ASSIGNED' ||
      assignmentTask.assignedDesignerId !== selectedDesignerId),
  )

  return (
    <section className={styles.page}>
      {/* Top row: Status Tabs + Refresh action */}
      <div className={styles.topRow}>
        <div className={styles.tabs}>
          <UiTabs
            activeKey={activeTabKey}
            onChange={(key) => {
              setActiveTabKey(key)
              setPage(1)
            }}
            items={STATUS_TABS.map((tab) => ({
              key: tab.key,
              label: (
                <UiTabLabel count={counts[tab.key]} active={activeTabKey === tab.key}>
                  {tab.title}
                </UiTabLabel>
              ),
            }))}
          />
        </div>

        <div className={styles.headerActions}>
          <DateRangePicker
            allowClear
            value={dateRange}
            onChange={(val) => {
              setDateRange(val)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* Filter bar: Search + Seller + Refresh */}
      <div className={styles.filterBar}>
        <Input
          placeholder={t('common.search', { defaultValue: 'Search PSD tasks...' })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          className={styles.search}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t('portal.design.seller', { defaultValue: 'Seller' })}
          value={selectedSellerId}
          onChange={(val) => {
            setSelectedSellerId(val)
            setPage(1)
          }}
          className={styles.sellerSelect}
          options={(shopsQuery.data?.items || []).map((shop) => ({
            label: shop.name,
            value: shop.id,
          }))}
        />
        <Tooltip title={t('common.refresh', { defaultValue: 'Refresh' })}>
          <Button icon={<ReloadOutlined />} onClick={invalidate} loading={tasksQuery.isFetching} />
        </Tooltip>
      </div>

      {/* Table area using standard CoreDataTable */}
      <div className={styles.tableArea}>
        <CoreDataTable
          rowKey="id"
          columns={columns}
          dataSource={displayedTasks}
          loading={tasksQuery.isLoading}
          pagination={{
            current: page,
            pageSize,
            total: selectedSellerId
              ? displayedTasks.length
              : tasksQuery.data?.pagination?.total || 0,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* Assign Designer Modal */}
      <Modal
        open={assignModalOpen}
        title={t(
          assignmentTask?.status === 'ASSIGNED'
            ? 'portal.design.reassignDesigner'
            : 'portal.design.assignDesigner',
        )}
        okText={t('portal.design.confirmAssignment')}
        okButtonProps={{ disabled: !canConfirmAssignment }}
        confirmLoading={assignMutation.isPending}
        onCancel={() => {
          setAssignModalOpen(false)
          setTargetTaskId(null)
          setSelectedDesignerId(undefined)
        }}
        onOk={() => {
          if (targetTaskId && selectedDesignerId && canConfirmAssignment) {
            assignMutation.mutate({ taskId: targetTaskId, designerId: selectedDesignerId })
          }
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {t('portal.design.selectDesigner')}
          </Text>
          <Select
            style={{ width: '100%' }}
            placeholder={t('portal.design.selectDesigner')}
            value={selectedDesignerId}
            onChange={(val) => setSelectedDesignerId(val)}
            options={(assigneesQuery.data || []).map((a) => ({
              label: a.fullName || a.name || a.id,
              value: a.id,
            }))}
          />
        </div>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        open={rejectModalOpen}
        title="Reject Task"
        okText="Reject"
        okButtonProps={{ danger: true }}
        confirmLoading={rejectMutation.isPending}
        onCancel={() => {
          setRejectModalOpen(false)
          setTargetTaskId(null)
          setRejectReason('')
        }}
        onOk={() => {
          if (targetTaskId && rejectReason) {
            rejectMutation.mutate({ taskId: targetTaskId, reason: rejectReason })
          }
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Reject Reason
          </Text>
          <Input.TextArea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection..."
          />
        </div>
      </Modal>

      {/* Upload Finished PSD Modal */}
      <Modal
        open={uploadModalOpen}
        title="Upload Finished PSD"
        okText="Submit"
        confirmLoading={submitMutation.isPending}
        onCancel={() => {
          setUploadModalOpen(false)
          setTargetTaskId(null)
          setUploadFiles([])
          setUploadNote('')
        }}
        onOk={() => {
          if (targetTaskId && uploadFiles.length > 0) {
            submitMutation.mutate({
              taskId: targetTaskId,
              files: uploadFiles,
              note: uploadNote,
            })
          }
        }}
      >
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <FileUpload
              title="Upload Finished PSD"
              description="Upload PSD or archive file (.psd, .zip, .rar, etc.)"
              accept=".psd,.zip,.rar,.png,.jpg,.jpeg"
              fileList={uploadFiles}
              onChange={({ fileList }) => setUploadFiles(fileList)}
              maxCount={1}
            />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Note
            </Text>
            <Input.TextArea
              rows={3}
              value={uploadNote}
              onChange={(e) => setUploadNote(e.target.value)}
              placeholder="Optional notes about the design..."
            />
          </div>
        </div>
      </Modal>

      {/* Request Upload Modal */}
      <Modal
        open={requestModalOpen}
        title="Request Upload PSD"
        okText="Request"
        confirmLoading={requestMutation.isPending}
        onCancel={() => {
          setRequestModalOpen(false)
          setRequestNote('')
          setTargetTaskId(null)
        }}
        onOk={() => {
          if (targetTaskId) {
            requestMutation.mutate({ taskId: targetTaskId, note: requestNote })
          }
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Note (optional)
          </Text>
          <Input.TextArea
            rows={4}
            value={requestNote}
            onChange={(e) => setRequestNote(e.target.value)}
            placeholder="Enter request note..."
          />
        </div>
      </Modal>

      {/* Delete Task Confirmation Modal */}
      <ConfirmDangerModal
        open={deleteModalOpen}
        title="Delete task"
        description="Are you sure you want to delete this PSD task?"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (targetTaskId) {
            deleteMutation.mutate(targetTaskId)
          }
        }}
        onCancel={() => {
          setDeleteModalOpen(false)
          setTargetTaskId(null)
        }}
      />
    </section>
  )
}

export default PsdTasksPage
