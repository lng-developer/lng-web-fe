import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { DownloadOutlined, FileOutlined, UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Select, Space, Tooltip, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { AuthenticatedMediaImage, downloadMediaAsset } from '@/shared/media'
import {
  DataTable,
  DateRangePicker,
  type DateRangeValue,
  FeedbackAlert,
  FilterBar,
  PageHeader,
  SearchInput,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  listMediaAssets,
  type MediaAsset,
  type MediaAssetListParams,
  type MediaAssetStatus,
  type MediaMimeGroup,
  uploadMediaAsset,
} from '../api/mediaApi'
import { mediaKeys } from '../api/mediaKeys'
import { MediaAssetDetailModal } from './MediaAssetDetailModal'
import { MediaUploadModal } from './MediaUploadModal'

const PAGE_SIZE = 20
const formatSize = (size: number | null) =>
  size === null ? '-' : `${(size / 1024 / 1024).toFixed(2)} MB`

export function MediaWorkspacePage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
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
  const params: MediaAssetListParams = {
    page,
    limit: PAGE_SIZE,
    q: q || undefined,
    mimeGroup,
    provider,
    resourceType,
    ownerType,
    status,
    ...dates,
  }
  const assets = useQuery({
    queryKey: mediaKeys.list(params),
    queryFn: () => listMediaAssets(params),
  })
  const upload = useMutation({
    mutationFn: uploadMediaAsset,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mediaKeys.all })
      toast('success', t('media.upload.success'))
    },
    onError: () => toast('error', t('media.upload.error')),
  })
  const updateFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }
  const columns: TableColumnsType<MediaAsset> = [
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
  ]
  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeader
        title={t('media.title')}
        description={t('media.description')}
        actions={
          account.permissions.includes('MEDIA:WRITE') ? (
            <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>
              {t('media.upload.action')}
            </Button>
          ) : undefined
        }
      />
      <SectionCard>
        <DataTable
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
                value={mimeGroup}
                onChange={updateFilter(setMimeGroup)}
                options={['IMAGE', 'DOCUMENT', 'ARCHIVE', 'OTHER'].map((value) => ({
                  value,
                  label: value,
                }))}
              />
              <Select
                allowClear
                placeholder={t('media.filters.provider')}
                value={provider}
                onChange={updateFilter(setProvider)}
                options={['local', 'cloudinary'].map((value) => ({ value, label: value }))}
              />
              <Select
                allowClear
                placeholder={t('media.filters.resourceType')}
                value={resourceType}
                onChange={updateFilter(setResourceType)}
                options={['image', 'video', 'raw'].map((value) => ({ value, label: value }))}
              />
              <Select
                allowClear
                placeholder={t('media.filters.ownerType')}
                value={ownerType}
                onChange={updateFilter(setOwnerType)}
                options={[
                  'ORDER_ITEM',
                  'CUSTOMIZATION_PAYLOAD',
                  'PRODUCTION_TASK',
                  'EMPLOYEE_PROFILE',
                ].map((value) => ({ value, label: value }))}
              />
              <Select
                allowClear
                placeholder={t('media.filters.status')}
                value={status}
                onChange={updateFilter(setStatus)}
                options={['ACTIVE', 'DISCARDED'].map((value) => ({ value, label: value }))}
              />
              <DateRangePicker value={dates} onChange={updateFilter(setDates)} />
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
