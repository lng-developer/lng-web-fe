import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  HistoryOutlined,
  HourglassOutlined,
  PlayCircleOutlined,
  RollbackOutlined,
  SolutionOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Popover, Select, Space, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'

import { downloadMediaAsset } from '@/shared/media'
import {
  DATA_COLORS,
  EmployeeIdentity,
  StatusPill,
  useFeedbackToast,
  ZoomableImage,
} from '@/shared/ui'
import {
  type DesignTask,
  type DesignTaskPriority,
  formatTaskSeller,
  getTaskSellerIdentity,
} from '../api/designApi'

export type TaskHistoryItem = {
  action?: string
  status?: string
  from?: string
  to?: string
  at?: string
  createdAt?: string
}

export function renderHistoryContent(history: TaskHistoryItem[] = []) {
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

export function getStatusInfo(status?: string) {
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

export function getPriorityInfo(priority?: string) {
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

export interface UsePsdTasksColumnsOptions {
  activeTabKey: string
  salesChannelCode?: 'AMAZON' | 'ETSY'
  currentAccountId: string
  canWrite: boolean
  canWork: boolean
  canReview: boolean
  canReprioritize: boolean
  onOpenUploadModal: (taskId: string) => void
  onOpenRequestModal: (taskId: string) => void
  onOpenAssignModal: (taskId: string, currentDesignerId?: string) => void
  onStartTask: (taskId: string) => void
  isStartingTask: (taskId: string) => boolean
  onApproveTask: (taskId: string, assetId: string) => void
  isApprovingTask: (taskId: string) => boolean
  onOpenRejectModal: (taskId: string) => void
  onOpenReopenModal: (taskId: string) => void
  onOpenDeleteModal: (taskId: string) => void
  onChangePriority: (taskId: string, priority: DesignTaskPriority) => void
  isChangingPriority: (taskId: string) => boolean
}

export function usePsdTasksColumns({
  activeTabKey,
  salesChannelCode,
  currentAccountId,
  canWrite,
  canWork,
  canReview,
  canReprioritize,
  onOpenUploadModal,
  onOpenRequestModal,
  onOpenAssignModal,
  onStartTask,
  isStartingTask,
  onApproveTask,
  isApprovingTask,
  onOpenRejectModal,
  onOpenReopenModal,
  onOpenDeleteModal,
  onChangePriority,
  isChangingPriority,
}: UsePsdTasksColumnsOptions): TableColumnsType<DesignTask> {
  const { t } = useTranslation()
  const toast = useFeedbackToast()

  return useMemo<TableColumnsType<DesignTask>>(() => {
    const baseColumns: TableColumnsType<DesignTask> = [
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
            ? t('portal.design.listingId', { defaultValue: 'Listing ID' })
            : salesChannelCode === 'AMAZON'
              ? t('portal.design.asin', { defaultValue: 'ASIN' })
              : `${t('portal.design.asin', { defaultValue: 'ASIN' })} / ${t('portal.design.listingId', { defaultValue: 'Listing ID' })}`,
        key: 'asin',
        width: 130,
        align: 'center',
        render: (_, record) => {
          const rawChannel = String(
            record.listing?.salesChannelCode || salesChannelCode || '',
          ).toUpperCase()
          const isEtsy =
            rawChannel === 'ETSY' || Boolean(record.listing?.etsyListingId && !record.listing?.asin)
          const identifier = isEtsy
            ? record.listing?.etsyListingId ||
              record.listing?.asin ||
              (record as { asin?: string }).asin
            : record.listing?.asin ||
              (record as { asin?: string }).asin ||
              record.listing?.etsyListingId
          const url = identifier
            ? isEtsy
              ? `https://www.etsy.com/listing/${encodeURIComponent(identifier)}`
              : `https://www.amazon.com/dp/${encodeURIComponent(identifier)}`
            : null
          const pill = <StatusPill title={identifier || '-'} color={DATA_COLORS.pending} />

          return url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${identifier}`}
              onClick={(event) => event.stopPropagation()}
              style={{ display: 'inline-flex', textDecoration: 'none' }}
            >
              {pill}
            </a>
          ) : (
            pill
          )
        },
      },
      {
        title: t('portal.design.scaleFileSummary.total'),
        key: 'scaleFileSummary',
        width: 140,
        align: 'center',
        render: (_, record) => {
          const summary = record.scaleFileSummary
          if (!summary) return '-'
          return (
            <Tooltip
              trigger={['hover', 'focus']}
              title={
                <div>
                  <div>
                    {t('portal.design.scaleFileSummary.scaled', {
                      count: summary.scaledFileCount,
                    })}
                  </div>
                  <div>
                    {t('portal.design.scaleFileSummary.pending', {
                      count: summary.pendingFileCount,
                    })}
                  </div>
                </div>
              }
            >
              <Button type="text" size="small">
                {summary.totalFileCount}
              </Button>
            </Tooltip>
          )
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
        render: (_, record) => {
          const assignedName =
            record.assignedDesigner?.fullName ||
            (record.assignedDesigner as { name?: string })?.name ||
            (record.assignedDesigner as { full_name?: string })?.full_name ||
            null
          return (
            <Space orientation="vertical" size={2}>
              {assignedName ? (
                <EmployeeIdentity
                  size="small"
                  mode="code"
                  name={assignedName}
                  employeeCode={
                    (record.assignedDesigner as { employeeCode?: string | null })?.employeeCode
                  }
                  avatarUrl={(record.assignedDesigner as { avatarUrl?: string | null })?.avatarUrl}
                />
              ) : (
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {t('portal.design.unassigned', { defaultValue: 'Pending assign' })}
                </Typography.Text>
              )}
              {canWrite && record.status === 'ASSIGNED' ? (
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    onOpenAssignModal(record.id, record.assignedDesignerId || undefined)
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
                loading={isChangingPriority(record.id)}
                onChange={(nextPriority) => onChangePriority(record.id, nextPriority)}
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
        title: t('portal.design.shop', { defaultValue: 'Shop' }),
        key: 'shop',
        width: 140,
        align: 'center',
        render: (_, record) => (
          <StatusPill title={record.shop?.name || '-'} color={DATA_COLORS.pending} />
        ),
      },
      {
        title: t('portal.design.seller', { defaultValue: 'Seller' }),
        key: 'seller',
        width: 160,
        align: 'center',
        render: (_, record) => {
          const seller = getTaskSellerIdentity(record)
          if (seller?.name || seller?.employeeCode) {
            return (
              <EmployeeIdentity
                size="small"
                mode="code"
                name={seller.name}
                employeeCode={seller.employeeCode}
                avatarUrl={seller.avatarUrl}
              />
            )
          }
          const sellerName = formatTaskSeller(record)
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
        const isAssignedDesigner = String(record.assignedDesignerId) === String(currentAccountId)
        const canSubmitTask = canWork && isAssignedDesigner
        const downloadAsset =
          record.status === 'APPROVED'
            ? record.latestSubmission?.assets?.find((asset) => asset.id === approvedId)
            : canWork
              ? latestAsset
              : null

        return (
          <Space size={4} wrap align="center" style={{ justifyContent: 'center' }}>
            {/* Upload button (not for QC Passed) */}
            {canSubmitTask && ['IN_PROGRESS', 'REJECTED'].includes(record.status) ? (
              <Tooltip title="Upload">
                <Button
                  size="small"
                  aria-label={t('portal.design.psdFile')}
                  icon={<UploadOutlined />}
                  onClick={() => onOpenUploadModal(record.id)}
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
                  onClick={() => onOpenRequestModal(record.id)}
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
                    onOpenAssignModal(record.id, record.assignedDesignerId || undefined)
                  }}
                />
              </Tooltip>
            ) : null}

            {/* Assigned: Start doing */}
            {canSubmitTask && record.status === 'ASSIGNED' ? (
              <Tooltip title="Start doing">
                <Button
                  size="small"
                  icon={<HourglassOutlined />}
                  onClick={() => onStartTask(record.id)}
                  loading={isStartingTask(record.id)}
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
                    onClick={() => onApproveTask(record.id, latestAsset?.id || '')}
                    loading={isApprovingTask(record.id)}
                  />
                </Tooltip>
                <Tooltip title="Reject">
                  <Button
                    size="small"
                    icon={<RollbackOutlined style={{ color: DATA_COLORS.cancelled }} />}
                    onClick={() => onOpenRejectModal(record.id)}
                  />
                </Tooltip>
              </>
            ) : null}

            {(canWrite || canReview) && record.status === 'APPROVED' ? (
              <Tooltip title="Reopen for revision">
                <Button
                  size="small"
                  aria-label="Reopen for revision"
                  icon={<RollbackOutlined />}
                  onClick={() => onOpenReopenModal(record.id)}
                />
              </Tooltip>
            ) : null}

            {/* Delete */}
            {canWrite ? (
              <Tooltip title="Delete">
                <Button
                  size="small"
                  aria-label="Delete task"
                  icon={<DeleteOutlined style={{ color: DATA_COLORS.cancelled }} />}
                  onClick={() => onOpenDeleteModal(record.id)}
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
    canReprioritize,
    canReview,
    canWork,
    canWrite,
    currentAccountId,
    isApprovingTask,
    isChangingPriority,
    isStartingTask,
    onApproveTask,
    onChangePriority,
    onOpenAssignModal,
    onOpenDeleteModal,
    onOpenRejectModal,
    onOpenReopenModal,
    onOpenRequestModal,
    onOpenUploadModal,
    onStartTask,
    salesChannelCode,
    t,
    toast,
  ])
}
