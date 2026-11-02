import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType, UploadFile } from 'antd'
import {
  Button,
  Input,
  Modal,
  Popconfirm,
  Popover,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { downloadMediaAsset } from '@/shared/media'
import {
  DateRangePicker,
  type DateRangeValue,
  EmployeeAvatar,
  FileUpload,
  FormattedDateTime,
  StatusTag,
  UiTabLabel,
  UiTabs,
  useFeedbackToast,
  ZoomableImage,
} from '@/shared/ui'

import {
  approveDesignTask,
  assignDesignTask,
  createDesignTask,
  type CreateDesignTaskInput,
  deleteDesignTask,
  type DesignTask,
  getDesignSummary,
  listDesignAssignees,
  listDesignTasks,
  rejectDesignTask,
  startDesignTask,
  submitDesignTask,
  updateDesignTask,
  uploadDesignAsset,
} from '../api/designApi'
import { designKeys } from '../api/designKeys'
import { CreateIdeaTaskModal } from './CreateIdeaTaskModal'
import styles from './IdeaTasksPage.module.scss'

dayjs.extend(relativeTime)

const { Text } = Typography

const STATUS_TABS = [
  { key: 'all', title: 'All', status: undefined },
  { key: 'New', title: 'New', status: 'REQUESTED' },
  { key: 'Assigned', title: 'Assigned', status: 'ASSIGNED' },
  { key: 'In Progress', title: 'In Progress', status: 'IN_PROGRESS' },
  { key: 'Uploaded', title: 'Uploaded', status: 'SUBMITTED' },
  { key: 'QC Passed', title: 'QC Passed', status: 'APPROVED' },
  { key: 'QC Rejected', title: 'QC Rejected', status: 'REJECTED' },
] as const

type TaskHistoryItem = { action?: string; status?: string; at?: string; createdAt?: string }

function formatEnumLabel(val?: string | null): string {
  if (!val) return ''
  return val
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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
            <span style={{ color: 'var(--ant-color-success)', fontSize: 14 }}>➔</span>
            <span style={{ fontWeight: 500 }}>
              {item.action || (item.status ? formatEnumLabel(item.status) : 'Updated')}
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

function getStatusTagTone(
  stt?: string,
): 'operational' | 'processing' | 'pending' | 'critical' | 'ready' {
  switch (stt) {
    case 'REQUESTED':
    case 'NEW':
      return 'pending'
    case 'ASSIGNED':
    case 'IN_PROGRESS':
      return 'processing'
    case 'SUBMITTED':
      return 'ready'
    case 'APPROVED':
      return 'operational'
    case 'REJECTED':
      return 'critical'
    default:
      return 'pending'
  }
}

export function IdeaTasksPage() {
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
  const canReview = permissions.has('DESIGN:REVIEW') || permissions.has('DESIGN:WRITE')

  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const [searchParams] = useSearchParams()
  const rawSalesChannel = searchParams.get('salesChannelCode')?.toLowerCase()
  const salesChannelCode: 'AMAZON' | 'ETSY' | undefined =
    rawSalesChannel === 'amazon' ? 'AMAZON' : rawSalesChannel === 'etsy' ? 'ETSY' : undefined

  const [page, setPage] = useState(1)
  const [prevChannel, setPrevChannel] = useState(salesChannelCode)
  if (prevChannel !== salesChannelCode) {
    setPrevChannel(salesChannelCode)
    setPage(1)
  }

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [activeTabKey, setActiveTabKey] = useState<string>('all')
  const [dates, setDates] = useState<DateRangeValue>({})

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<DesignTask | null>(null)

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null)
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>()

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [uploadNote, setUploadNote] = useState('')

  const activeTabConfig = useMemo(
    () => STATUS_TABS.find((tab) => tab.key === activeTabKey) || STATUS_TABS[0],
    [activeTabKey],
  )

  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: deferredSearch || undefined,
      taskType: 'IDEA' as const,
      status: activeTabConfig.status,
      salesChannelCode,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
    }),
    [
      page,
      pageSize,
      deferredSearch,
      activeTabConfig.status,
      salesChannelCode,
      dates.dateFrom,
      dates.dateTo,
    ],
  )

  const tasksQuery = useQuery({
    queryKey: designKeys.list(queryParams),
    queryFn: () => listDesignTasks(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  const summaryQuery = useQuery({
    queryKey: designKeys.summary({ taskType: 'IDEA', salesChannelCode }),
    queryFn: () => getDesignSummary({ taskType: 'IDEA', salesChannelCode }),
    staleTime: 30_000,
  })

  const assigneesQuery = useQuery({
    queryKey: designKeys.assignees(),
    queryFn: listDesignAssignees,
    staleTime: 60_000,
  })

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: designKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: designKeys.summaries() })
  }, [queryClient])

  const createMutation = useMutation({
    mutationFn: (payload: CreateDesignTaskInput) =>
      editingTask ? updateDesignTask(editingTask.id, payload) : createDesignTask(payload),
    onSuccess: () => {
      toast('success', editingTask ? 'Task updated successfully' : 'Task created successfully')
      setCreateModalOpen(false)
      setEditingTask(null)
      invalidate()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Operation failed'
      toast('error', msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => deleteDesignTask(taskId),
    onSuccess: () => {
      toast('success', 'Task deleted successfully')
      invalidate()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to delete task'
      toast('error', msg)
    },
  })

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
      toast('success', 'Task marked in progress')
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

  const counts = useMemo(() => {
    const byStatus = summaryQuery.data?.byStatus || {}
    const total = summaryQuery.data?.total ?? 0
    return {
      all: total,
      New: (byStatus.REQUESTED ?? 0) + (byStatus.NEW ?? 0),
      Assigned: byStatus.ASSIGNED ?? 0,
      'In Progress': byStatus.IN_PROGRESS ?? 0,
      Uploaded: byStatus.SUBMITTED ?? 0,
      'QC Passed': byStatus.APPROVED ?? 0,
      'QC Rejected': byStatus.REJECTED ?? 0,
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
    return items
  }, [tasksQuery.data?.items, salesChannelCode])

  const columns = useMemo<TableColumnsType<DesignTask>>(() => {
    const baseColumns: TableColumnsType<DesignTask> = [
      {
        title: t('common.createdAt', { defaultValue: 'Created At' }),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 140,
        render: (val: string) => <FormattedDateTime value={val} />,
      },
      {
        title: t('portal.design.productImage', { defaultValue: 'Product Image' }),
        key: 'image',
        width: 100,
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
            <div className={styles.imageCell}>
              <ZoomableImage
                src={img}
                alt={record.title || 'Product Image'}
                width={64}
                height={64}
                style={{ objectFit: 'cover', borderRadius: 8 }}
              />
            </div>
          )
        },
      },
      {
        title: t('common.status', { defaultValue: 'Status' }),
        key: 'status',
        width: 160,
        render: (_, record) => (
          <Space size={6} align="center">
            <StatusTag status={getStatusTagTone(record.status)}>
              {t(`portal.design.statuses.${record.status}`, {
                defaultValue: formatEnumLabel(record.status),
              })}
            </StatusTag>
            <Popover
              placement="bottomLeft"
              title="History"
              content={renderHistoryContent(
                (record as { history?: TaskHistoryItem[] }).history || [],
              )}
              arrow={false}
            >
              <HistoryOutlined
                style={{ fontSize: 15, cursor: 'pointer', color: 'var(--ant-color-text-tertiary)' }}
              />
            </Popover>
          </Space>
        ),
      },
      {
        title: t('common.title', { defaultValue: 'Title' }),
        key: 'title',
        width: 220,
        render: (_, record) => (
          <div>
            <Text strong>{record.title || record.brief || '-'}</Text>
            {record.referenceLink ? (
              <div>
                <a
                  href={record.referenceLink}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.linkText}
                >
                  {record.referenceLink}
                </a>
              </div>
            ) : null}
          </div>
        ),
      },
      {
        title: t('portal.design.productType', { defaultValue: 'Product Type' }),
        key: 'productType',
        width: 130,
        render: (_, record) => {
          const type = record.productType || record.listing?.productTypeName || '-'
          return <Tag color="blue">{type}</Tag>
        },
      },
      {
        title: t('portal.design.assignedTo', { defaultValue: 'Assigned' }),
        key: 'assignedDesigner',
        width: 160,
        render: (_, record) =>
          record.assignedDesigner ? (
            <Space size={6}>
              <EmployeeAvatar
                name={record.assignedDesigner.fullName || 'Designer'}
                avatarUrl={record.assignedDesigner.avatarUrl}
                size="small"
              />
              <Text>{record.assignedDesigner.fullName || '-'}</Text>
            </Space>
          ) : (
            <Text type="secondary">
              {t('portal.design.unassigned', { defaultValue: 'Unassigned' })}
            </Text>
          ),
      },
      {
        title: t('portal.design.seller', { defaultValue: 'Seller' }),
        key: 'seller',
        width: 150,
        render: (_, record) => {
          const sellerName =
            record.seller?.fullName ||
            record.createdBy?.fullName ||
            record.createdBy?.full_name ||
            record.shop?.name ||
            '-'
          return <Text>{sellerName}</Text>
        },
      },
      {
        title: t('common.description', { defaultValue: 'Description' }),
        dataIndex: 'description',
        key: 'description',
        width: 200,
        render: (desc?: string) => (
          <Typography.Paragraph ellipsis={{ rows: 2, tooltip: desc }} style={{ margin: 0 }}>
            {desc || '-'}
          </Typography.Paragraph>
        ),
      },
      {
        title: t('common.actions', { defaultValue: 'Actions' }),
        key: 'actions',
        width: 160,
        fixed: 'right',
        render: (_, record) => {
          const latestAsset = record.latestSubmission?.assets?.[0]
          return (
            <Space size={4} wrap>
              {canWrite || canReview ? (
                <Tooltip title="Assign Designer">
                  <Button
                    type="text"
                    size="small"
                    icon={<UserAddOutlined />}
                    onClick={() => {
                      setTargetTaskId(record.id)
                      setSelectedDesignerId(record.assignedDesignerId || undefined)
                      setAssignModalOpen(true)
                    }}
                  />
                </Tooltip>
              ) : null}

              {canWork && record.status === 'ASSIGNED' ? (
                <Tooltip title="Start Task">
                  <Button
                    type="text"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={() => startMutation.mutate(record.id)}
                  />
                </Tooltip>
              ) : null}

              {canWork && (record.status === 'IN_PROGRESS' || record.status === 'REJECTED') ? (
                <Tooltip title="Upload Finished PSD">
                  <Button
                    type="text"
                    size="small"
                    icon={<UploadOutlined />}
                    onClick={() => {
                      setTargetTaskId(record.id)
                      setUploadModalOpen(true)
                    }}
                  />
                </Tooltip>
              ) : null}

              {latestAsset?.downloadUrl ? (
                <Tooltip title="Download PSD">
                  <Button
                    type="text"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() =>
                      void downloadMediaAsset(
                        latestAsset.downloadUrl!,
                        latestAsset.originalFilename ?? undefined,
                      )
                    }
                  />
                </Tooltip>
              ) : null}

              {(canWrite || canReview) && record.status === 'SUBMITTED' ? (
                <>
                  <Tooltip title="QC Pass">
                    <Button
                      type="text"
                      size="small"
                      style={{ color: 'var(--ant-color-success)' }}
                      icon={<CheckCircleOutlined />}
                      onClick={() =>
                        approveMutation.mutate({
                          taskId: record.id,
                          assetId: latestAsset?.id || '',
                        })
                      }
                    />
                  </Tooltip>
                  <Tooltip title="QC Reject">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => {
                        setTargetTaskId(record.id)
                        setRejectModalOpen(true)
                      }}
                    />
                  </Tooltip>
                </>
              ) : null}

              {canWrite ? (
                <>
                  <Tooltip title="Edit Task">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setEditingTask(record)
                        setCreateModalOpen(true)
                      }}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="Delete task?"
                    description="Are you sure you want to delete this idea task?"
                    onConfirm={() => deleteMutation.mutate(record.id)}
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </>
              ) : null}
            </Space>
          )
        },
      },
    ]

    return baseColumns
  }, [canReview, canWork, canWrite, approveMutation, deleteMutation, startMutation, t])

  return (
    <section className={styles.page}>
      {/* Top row: Status Tabs + Header actions */}
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
            value={dates}
            onChange={(val) => {
              setDates(val)
              setPage(1)
            }}
          />
          {canWrite ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingTask(null)
                setCreateModalOpen(true)
              }}
            >
              {t('portal.design.createIdeaTask', { defaultValue: 'Create Task' })}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Filter bar: Search + Refresh */}
      <div className={styles.filterBar}>
        <Input
          placeholder={t('common.search', { defaultValue: 'Search ideas...' })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          className={styles.search}
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
            total: tasksQuery.data?.pagination?.total || 0,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
          scroll={{ x: 1280 }}
        />
      </div>

      <CreateIdeaTaskModal
        open={createModalOpen}
        initialData={editingTask}
        saving={createMutation.isPending}
        onClose={() => {
          setCreateModalOpen(false)
          setEditingTask(null)
        }}
        onSubmit={(values) => createMutation.mutate(values)}
      />

      {/* Assign Designer Modal */}
      <Modal
        open={assignModalOpen}
        title="Assign Designer"
        okText="Assign"
        confirmLoading={assignMutation.isPending}
        onCancel={() => {
          setAssignModalOpen(false)
          setTargetTaskId(null)
          setSelectedDesignerId(undefined)
        }}
        onOk={() => {
          if (targetTaskId && selectedDesignerId) {
            assignMutation.mutate({ taskId: targetTaskId, designerId: selectedDesignerId })
          }
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Select Designer
          </Text>
          <Select
            style={{ width: '100%' }}
            placeholder="Select a designer"
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
          if (targetTaskId) {
            rejectMutation.mutate({ taskId: targetTaskId, reason: rejectReason })
          }
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Reason for rejection
          </Text>
          <Input.TextArea
            rows={3}
            placeholder="Specify why the submission was rejected..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Upload Finished Modal */}
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
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FileUpload
            title="Upload Finalized Asset"
            description="Upload finalized design asset (.psd, .zip, etc.)"
            accept=".psd,.zip,.png,.jpg,.jpeg"
            maxCount={1}
            fileList={uploadFiles}
            onChange={({ fileList }) => setUploadFiles(fileList)}
          />
          <Input.TextArea
            rows={2}
            placeholder="Optional submission note..."
            value={uploadNote}
            onChange={(e) => setUploadNote(e.target.value)}
          />
        </div>
      </Modal>
    </section>
  )
}

export default IdeaTasksPage
