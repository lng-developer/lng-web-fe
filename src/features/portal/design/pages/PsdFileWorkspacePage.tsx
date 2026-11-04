import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleOutlined,
  ClearOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileOutlined,
  FileZipOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Select, Space, Tag, Tooltip, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { downloadMediaAsset } from '@/shared/media'
import {
  DATA_COLORS,
  DateRangePicker,
  type DateRangeValue,
  EmployeeAvatar,
  FormattedDateTime,
  MetricCard,
  StatusPill,
  useDebouncedValue,
  ZoomableImage,
} from '@/shared/ui'

import { listDesignAssignees, listPsdFiles, type PsdFileListItem } from '../api/designApi'
import { designKeys } from '../api/designKeys'
import styles from './PsdFileWorkspacePage.module.scss'

function formatEnumLabel(val?: string | null): string {
  if (!val) return ''
  return val
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileExtension(filename?: string | null): string {
  if (!filename) return ''
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()!.toUpperCase() : ''
}

function renderFileThumbnail(asset: PsdFileListItem['asset']) {
  if (!asset) {
    return <FileOutlined style={{ fontSize: 24, color: 'var(--ant-color-text-tertiary)' }} />
  }

  if (asset.mimeType?.startsWith('image/')) {
    return (
      <ZoomableImage
        alt={asset.originalFilename ?? 'File'}
        downloadUrl={asset.downloadUrl}
        width={36}
        height={36}
        style={{ borderRadius: 6, objectFit: 'cover' }}
      />
    )
  }

  const ext = getFileExtension(asset.originalFilename)
  const isArchive = ['RAR', 'ZIP', '7Z', 'TAR', 'GZ'].includes(ext)
  const isPsd = ext === 'PSD'

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: isPsd
          ? 'rgba(37, 99, 235, 0.08)'
          : isArchive
            ? 'rgba(217, 119, 6, 0.08)'
            : 'var(--ant-color-fill-quaternary, #f1f5f9)',
        border: `1px solid ${
          isPsd
            ? 'rgba(37, 99, 235, 0.2)'
            : isArchive
              ? 'rgba(217, 119, 6, 0.2)'
              : 'var(--ant-color-border-secondary, #e2e8f0)'
        }`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {isArchive ? (
        <FileZipOutlined style={{ fontSize: 16, color: '#d97706' }} />
      ) : isPsd ? (
        <FileOutlined style={{ fontSize: 16, color: '#2563eb' }} />
      ) : (
        <FileOutlined style={{ fontSize: 16, color: 'var(--ant-color-text-secondary)' }} />
      )}
      {ext ? (
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            lineHeight: 1,
            marginTop: 2,
            color: isPsd ? '#2563eb' : isArchive ? '#d97706' : 'var(--ant-color-text-secondary)',
          }}
        >
          {ext.slice(0, 4)}
        </span>
      ) : null}
    </div>
  )
}

function getTaskStatusColor(status?: string): string {
  switch (status) {
    case 'APPROVED':
      return DATA_COLORS.success
    case 'SUBMITTED':
    case 'IN_PROGRESS':
    case 'ASSIGNED':
      return DATA_COLORS.process
    case 'REJECTED':
    case 'CANCELLED':
      return DATA_COLORS.cancelled
    case 'OPEN':
    case 'REQUESTED':
      return DATA_COLORS.pending
    default:
      return DATA_COLORS.default
  }
}

export function PsdFileWorkspacePage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 250)
  const [role, setRole] = useState<'REFERENCE' | 'SUBMISSION' | 'APPROVED'>()
  const [designerId, setDesignerId] = useState<string>()
  const [taskStatus, setTaskStatus] = useState<string>()
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})

  const params = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch || undefined,
      role,
      designerId,
      taskStatus,
      ...dates,
    }),
    [page, pageSize, debouncedSearch, role, designerId, taskStatus, dates],
  )

  const files = useQuery({
    queryKey: designKeys.psdFiles(params),
    queryFn: () => listPsdFiles(params),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
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

  const roleCounts = useMemo(() => {
    const items = files.data?.items ?? []
    let approved = 0
    let submission = 0
    let reference = 0
    items.forEach((item) => {
      if (item.role === 'APPROVED') approved++
      else if (item.role === 'SUBMISSION') submission++
      else if (item.role === 'REFERENCE') reference++
    })
    return { approved, submission, reference }
  }, [files.data?.items])

  const roleOptions = useMemo(
    () =>
      ['REFERENCE', 'SUBMISSION', 'APPROVED'].map((value) => ({
        value,
        label: t(`portal.design.psdRoles.${value}`, { defaultValue: formatEnumLabel(value) }),
      })),
    [t],
  )

  const designerOptions = useMemo(
    () =>
      (assignees.data ?? []).map((item) => ({
        value: item.id,
        label: item.fullName ?? item.name ?? item.id,
      })),
    [assignees.data],
  )

  const taskStatusOptions = useMemo(
    () =>
      ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'].map(
        (value) => ({
          value,
          label: t(`portal.design.statuses.${value}`, { defaultValue: formatEnumLabel(value) }),
        }),
      ),
    [t],
  )

  const hasActiveFilters = Boolean(
    search || role || designerId || taskStatus || dates.dateFrom || dates.dateTo,
  )

  const handleResetFilters = () => {
    setSearch('')
    setRole(undefined)
    setDesignerId(undefined)
    setTaskStatus(undefined)
    setDates({})
    setPage(1)
  }

  const columns: TableColumnsType<PsdFileListItem> = useMemo(
    () => [
      {
        title: t('portal.design.psdFile', { defaultValue: 'PSD File' }),
        dataIndex: 'asset',
        key: 'asset',
        width: 260,
        render: (asset) =>
          asset ? (
            <Space size={10} style={{ width: '100%', minWidth: 0 }}>
              {renderFileThumbnail(asset)}
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <Typography.Text
                  strong
                  ellipsis={{ tooltip: asset.originalFilename }}
                  style={{ display: 'block', fontSize: 13, lineHeight: 1.3 }}
                >
                  {asset.originalFilename ?? 'Unavailable'}
                </Typography.Text>
                {asset.size ? (
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {formatFileSize(asset.size)}
                  </Typography.Text>
                ) : null}
              </div>
            </Space>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          ),
      },
      {
        title: t('portal.design.psdRole', { defaultValue: 'Role' }),
        dataIndex: 'role',
        key: 'role',
        width: 130,
        align: 'center',
        render: (value: string) => {
          const isApproved = value === 'APPROVED'
          const isSubmission = value === 'SUBMISSION'
          const color = isApproved
            ? DATA_COLORS.success
            : isSubmission
              ? DATA_COLORS.pending
              : DATA_COLORS.purple
          const label = t(`portal.design.psdRoles.${value}`, {
            defaultValue: formatEnumLabel(value),
          })
          return <StatusPill title={label} color={color} />
        },
      },
      {
        title: t('portal.design.sku', { defaultValue: 'SKU' }),
        dataIndex: 'listing',
        key: 'listing',
        width: 190,
        render: (value) => (
          <Space direction="vertical" size={1} style={{ width: '100%' }}>
            <Typography.Text
              strong
              copyable={value.code ? { text: value.code } : false}
              style={{ fontSize: 13 }}
            >
              {value.code ?? '-'}
            </Typography.Text>
            {value.title ? (
              <Typography.Text
                type="secondary"
                ellipsis={{ tooltip: value.title }}
                style={{ fontSize: 11, display: 'block', maxWidth: 170 }}
              >
                {value.title}
              </Typography.Text>
            ) : null}
          </Space>
        ),
      },
      {
        title: t('portal.design.taskStatus', { defaultValue: 'Task status' }),
        dataIndex: 'task',
        key: 'task',
        width: 140,
        align: 'center',
        render: (value) => {
          const label = t(`portal.design.statuses.${value.status}`, {
            defaultValue: formatEnumLabel(value.status),
          })
          const color = getTaskStatusColor(value.status)
          return <StatusPill title={label} color={color} />
        },
      },
      {
        title: t('portal.design.designer', { defaultValue: 'Designer' }),
        dataIndex: 'designer',
        key: 'designer',
        width: 170,
        render: (value) => {
          const assignee = (assignees.data ?? []).find(({ id }) => id === value.id)
          const name = value.name ?? assignee?.fullName ?? assignee?.name ?? 'Unassigned'
          return (
            <Space size={8}>
              <EmployeeAvatar name={name} avatarUrl={assignee?.avatarUrl} size="small" />
              <Typography.Text style={{ fontSize: 13 }}>{name}</Typography.Text>
            </Space>
          )
        },
      },
      {
        title: t('portal.design.version', { defaultValue: 'Version' }),
        dataIndex: 'submission',
        key: 'submission',
        width: 90,
        align: 'center',
        render: (value) =>
          value.version ? (
            <Tag color="blue" style={{ margin: 0, fontWeight: 500 }}>
              {`v${value.version}`}
            </Tag>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          ),
      },
      {
        title: t('common.date', { defaultValue: 'Date' }),
        key: 'date',
        width: 140,
        align: 'center',
        render: (_, record) => {
          const dateVal = record.linkedAt || record.submission?.submittedAt
          return dateVal ? (
            <FormattedDateTime value={dateVal} />
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          )
        },
      },
      {
        title: t('portal.design.actions', { defaultValue: 'Actions' }),
        key: 'actions',
        width: 120,
        align: 'center',
        fixed: 'right',
        render: (_, record) => {
          const asset = record.asset
          return asset?.downloadUrl ? (
            <Space size={4}>
              <Tooltip title={t('portal.design.open', { defaultValue: 'Open in new tab' })}>
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => window.open(asset.downloadUrl!, '_blank')}
                  aria-label={`Open ${asset.originalFilename}`}
                />
              </Tooltip>
              <Tooltip title={t('portal.design.download', { defaultValue: 'Download' })}>
                <Button
                  type="text"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() =>
                    void downloadMediaAsset(asset.downloadUrl!, asset.originalFilename ?? undefined)
                  }
                  aria-label={`Download ${asset.originalFilename}`}
                />
              </Tooltip>
            </Space>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              -
            </Typography.Text>
          )
        },
      },
    ],
    [assignees.data, t],
  )

  return (
    <section className={styles.page}>
      {/* 1. Metric Cards Grid on top */}
      <div className={styles.metricsGrid}>
        <MetricCard
          icon={<FileOutlined />}
          variant="primary"
          label={t('portal.design.totalFiles', { defaultValue: 'Total PSD Files' })}
          value={files.data?.total ?? 0}
          loading={files.isLoading}
          onClick={() => {
            setRole(undefined)
            setPage(1)
          }}
          className={!role ? styles.metricCardActive : undefined}
          style={{ cursor: 'pointer' }}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          variant="success"
          label={t('portal.design.approvedFiles', { defaultValue: 'Approved Files' })}
          value={role === 'APPROVED' ? (files.data?.total ?? 0) : roleCounts.approved}
          loading={files.isLoading}
          onClick={() => {
            setRole(role === 'APPROVED' ? undefined : 'APPROVED')
            setPage(1)
          }}
          className={role === 'APPROVED' ? styles.metricCardActive : undefined}
          style={{ cursor: 'pointer' }}
        />
        <MetricCard
          icon={<UploadOutlined />}
          variant="info"
          label={t('portal.design.submissionFiles', { defaultValue: 'Submissions' })}
          value={role === 'SUBMISSION' ? (files.data?.total ?? 0) : roleCounts.submission}
          loading={files.isLoading}
          onClick={() => {
            setRole(role === 'SUBMISSION' ? undefined : 'SUBMISSION')
            setPage(1)
          }}
          className={role === 'SUBMISSION' ? styles.metricCardActive : undefined}
          style={{ cursor: 'pointer' }}
        />
        <MetricCard
          icon={<FolderOpenOutlined />}
          variant="warning"
          label={t('portal.design.referenceFiles', { defaultValue: 'Reference Files' })}
          value={role === 'REFERENCE' ? (files.data?.total ?? 0) : roleCounts.reference}
          loading={files.isLoading}
          onClick={() => {
            setRole(role === 'REFERENCE' ? undefined : 'REFERENCE')
            setPage(1)
          }}
          className={role === 'REFERENCE' ? styles.metricCardActive : undefined}
          style={{ cursor: 'pointer' }}
        />
      </div>

      {/* 2. Structured Filter Bar in the middle */}
      <div className={styles.filterBar}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--ant-color-text-tertiary)' }} />}
          allowClear
          className={styles.search}
          placeholder={t('portal.design.searchFileOrSku', {
            defaultValue: 'Search file or SKU...',
          })}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
        <Select
          allowClear
          className={styles.roleFilter}
          placeholder={t('portal.design.allRoles', { defaultValue: 'All roles' })}
          value={role}
          onChange={(value) => {
            setRole(value)
            setPage(1)
          }}
          options={roleOptions}
        />
        <Select
          allowClear
          className={styles.designerFilter}
          placeholder={t('portal.design.allDesigners', { defaultValue: 'All designers' })}
          value={designerId}
          onChange={(value) => {
            setDesignerId(value)
            setPage(1)
          }}
          options={designerOptions}
          showSearch
          optionFilterProp="label"
        />
        <Select
          allowClear
          className={styles.statusFilter}
          placeholder={t('portal.design.allTaskStatuses', {
            defaultValue: 'All task statuses',
          })}
          value={taskStatus}
          onChange={(value) => {
            setTaskStatus(value)
            setPage(1)
          }}
          options={taskStatusOptions}
        />
        <DateRangePicker
          allowClear
          className={styles.dateFilter}
          value={dates}
          onChange={(value: DateRangeValue) => {
            setDates(value)
            setPage(1)
          }}
        />
        <div className={styles.filterActions}>
          {hasActiveFilters ? (
            <Button icon={<ClearOutlined />} onClick={handleResetFilters} type="text">
              {t('portal.design.clearFilters', { defaultValue: 'Reset' })}
            </Button>
          ) : null}
          <Tooltip title={t('common.refresh', { defaultValue: 'Refresh' })}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void files.refetch()}
              loading={files.isFetching}
            />
          </Tooltip>
        </div>
      </div>

      {/* 3. CoreDataTable with fillViewport at the bottom */}
      <div className={styles.tableArea}>
        <CoreDataTable
          fillViewport
          rowKey="rowKey"
          columns={columns}
          dataSource={files.data?.items ?? []}
          loading={files.isLoading}
          pagination={{
            current: page,
            pageSize,
            total: files.data?.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
          scroll={{ x: 1240 }}
        />
      </div>
    </section>
  )
}
