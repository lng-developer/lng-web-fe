import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { DownloadOutlined, FileOutlined, UploadOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Select, Space, Tooltip, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { AuthenticatedMediaImage, downloadMediaAsset } from '@/shared/media'
import {
  DateRangePicker,
  type DateRangeValue,
  FeedbackAlert,
  FilterBar,
  PageHeader,
  SearchInput,
  SectionCard,
  StatusTag,
} from '@/shared/ui'

import {
  type MediaAsset,
  type MediaAssetListParams,
  type MediaAssetStatus,
  type MediaMimeGroup,
} from '../api/mediaApi'
import { useMediaAssetsQuery, useUploadMediaAssetMutation } from '../hooks'
import { MediaAssetDetailModal } from './MediaAssetDetailModal'
import { MediaUploadModal } from './MediaUploadModal'

const PAGE_SIZE = 20
const MIME_GROUPS: MediaMimeGroup[] = ['IMAGE', 'DOCUMENT', 'ARCHIVE', 'OTHER']
const PROVIDERS = ['local', 'cloudinary'] as const
const RESOURCE_TYPES = ['image', 'video', 'raw'] as const
const OWNER_TYPES = [
  'ORDER_ITEM',
  'CUSTOMIZATION_PAYLOAD',
  'PRODUCTION_TASK',
  'EMPLOYEE_PROFILE',
] as const
const MEDIA_STATUSES: MediaAssetStatus[] = ['ACTIVE', 'DISCARDED']
const FILTER_SELECT_WIDTH = 160
const OWNER_TYPE_SELECT_WIDTH = 210
const formatSize = (size: number | null) =>
  size === null ? '-' : `${(size / 1024 / 1024).toFixed(2)} MB`

export function MediaWorkspacePage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [mimeGroup, setMimeGroup] = useState<MediaMimeGroup>()
  const [provider, setProvider] = useState<string>()
  const [resourceType, setResourceType] = useState<string>()
  const [ownerType, setOwnerType] = useState<string>()
  const [status, setStatus] = useState<MediaAssetStatus>()
  const [dates, setDates] = useState<DateRangeValue>({})
  const [selected, setSelected] = useState<MediaAsset | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const params: MediaAssetListParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      q: q || undefined,
      mimeGroup,
      provider,
      resourceType,
      ownerType,
      status,
      ...dates,
    }),
    [page, q, mimeGroup, provider, resourceType, ownerType, status, dates],
  )

  const assets = useMediaAssetsQuery(params)
  const upload = useUploadMediaAssetMutation()

  const updateFilter = useCallback(
    <T,>(setter: (value: T) => void) =>
      (value: T) => {
        setter(value)
        setPage(1)
      },
    [],
  )

  const columns = useMemo<TableColumnsType<MediaAsset>>(
    () => [
      {
        title: t('media.columns.file'),
        render: (_, asset) => (
          <Space>
            {asset.mimeType?.startsWith('image/') ? (
              <AuthenticatedMediaImage
                alt={asset.originalFilename ?? ''}
                downloadUrl={asset.downloadUrl}
                width={40}
                height={40}
                style={{ objectFit: 'cover', borderRadius: 6 }}
              />
            ) : (
              <FileOutlined />
            )}
            <Typography.Text strong>
              {asset.originalFilename ?? t('media.unknownFile')}
            </Typography.Text>
          </Space>
        ),
      },
      { title: t('media.columns.mime'), dataIndex: 'mimeType', render: (value) => value ?? '-' },
      { title: t('media.columns.size'), dataIndex: 'size', render: formatSize },
      {
        title: t('media.columns.source'),
        render: (_, asset) => (
          <Space direction="vertical" size={0}>
            <span>{asset.provider ?? '-'}</span>
            <Typography.Text type="secondary">{asset.resourceType ?? '-'}</Typography.Text>
          </Space>
        ),
      },
      {
        title: t('media.columns.ownerType'),
        dataIndex: 'ownerType',
        render: (value) => value ?? '-',
      },
      {
        title: t('media.columns.createdAt'),
        dataIndex: 'createdAt',
        render: (value) => new Date(value).toLocaleString(),
      },
      {
        title: t('media.columns.status'),
        dataIndex: 'status',
        render: (value) => (
          <StatusTag status={value === 'ACTIVE' ? 'operational' : 'cancelled'}>{value}</StatusTag>
        ),
      },
      {
        title: t('media.columns.actions'),
        render: (_, asset) =>
          asset.downloadUrl ? (
            <Tooltip title={t('media.actions.download')}>
              <Button
                aria-label={t('media.actions.download')}
                icon={<DownloadOutlined />}
                onClick={(event) => {
                  event.stopPropagation()
                  void downloadMediaAsset(asset.downloadUrl!, asset.originalFilename ?? undefined)
                }}
              />
            </Tooltip>
          ) : null,
      },
    ],
    [t],
  )
  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeader title={t('media.title')} description={t('media.description')} />
      <SectionCard>
        <CoreDataTable
          fillViewport
          rowKey="id"
          columns={columns}
          dataSource={assets.data?.items ?? []}
          loading={assets.isLoading}
          error={
            assets.isError ? (
              <FeedbackAlert
                type="error"
                title={t('media.loadError')}
                action={
                  <Button type="link" onClick={() => void assets.refetch()}>
                    {t('media.actions.retry')}
                  </Button>
                }
              />
            ) : undefined
          }
          emptyText={t('media.empty')}
          onRow={(asset) => ({ onClick: () => setSelected(asset), style: { cursor: 'pointer' } })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: assets.data?.pagination.total,
            onChange: setPage,
          }}
          toolbar={
            <FilterBar label={t('media.filters.label')}>
              <SearchInput
                placeholder={t('media.filters.search')}
                value={q}
                onSearchChange={updateFilter(setQ)}
              />
              <Select
                allowClear
                placeholder={t('media.filters.mime')}
                style={{ width: FILTER_SELECT_WIDTH }}
                value={mimeGroup}
                onChange={updateFilter(setMimeGroup)}
                options={MIME_GROUPS.map((value) => ({
                  value,
                  label: t(`media.mimeGroups.${value}`),
                }))}
              />
              <Select
                allowClear
                placeholder={t('media.filters.provider')}
                style={{ width: FILTER_SELECT_WIDTH }}
                value={provider}
                onChange={updateFilter(setProvider)}
                options={PROVIDERS.map((value) => ({
                  value,
                  label: t(`media.providers.${value}`),
                }))}
              />
              <Select
                allowClear
                placeholder={t('media.filters.resourceType')}
                style={{ width: FILTER_SELECT_WIDTH }}
                value={resourceType}
                onChange={updateFilter(setResourceType)}
                options={RESOURCE_TYPES.map((value) => ({
                  value,
                  label: t(`media.resourceTypes.${value}`),
                }))}
              />
              <Select
                allowClear
                placeholder={t('media.filters.ownerType')}
                style={{ width: OWNER_TYPE_SELECT_WIDTH }}
                value={ownerType}
                onChange={updateFilter(setOwnerType)}
                options={OWNER_TYPES.map((value) => ({
                  value,
                  label: t(`media.ownerTypes.${value}`),
                }))}
              />
              <Select
                allowClear
                placeholder={t('media.filters.status')}
                style={{ width: FILTER_SELECT_WIDTH }}
                value={status}
                onChange={updateFilter(setStatus)}
                options={MEDIA_STATUSES.map((value) => ({
                  value,
                  label: t(`media.statuses.${value}`),
                }))}
              />
              <DateRangePicker
                placeholder={[t('media.filters.startDate'), t('media.filters.endDate')]}
                value={dates}
                onChange={updateFilter(setDates)}
              />
              {account.permissions.includes('MEDIA:WRITE') ? (
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => setUploadOpen(true)}
                >
                  {t('media.upload.action')}
                </Button>
              ) : null}
            </FilterBar>
          }
        />
      </SectionCard>
      <MediaAssetDetailModal asset={selected} onClose={() => setSelected(null)} />
      <MediaUploadModal
        open={uploadOpen}
        submitting={upload.isPending}
        onClose={() => setUploadOpen(false)}
        onSubmit={async (file) => {
          await upload.mutateAsync(file)
        }}
      />
    </Space>
  )
}
