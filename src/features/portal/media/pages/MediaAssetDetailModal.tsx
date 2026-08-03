import { useTranslation } from 'react-i18next'
import { FileOutlined } from '@ant-design/icons'
import { Descriptions, Modal, Space, Typography } from 'antd'

import { AuthenticatedMediaImage } from '@/shared/media'
import { StatusTag } from '@/shared/ui'

import type { MediaAsset } from '../api/mediaApi'

const formatSize = (size: number | null) =>
  size === null
    ? '-'
    : new Intl.NumberFormat(undefined, {
        style: 'unit',
        unit: 'megabyte',
        maximumFractionDigits: 2,
      }).format(size / 1024 / 1024)

export function MediaAssetDetailModal({
  asset,
  onClose,
}: {
  asset: MediaAsset | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Modal
      centered
      open={Boolean(asset)}
      footer={null}
      title={t('media.detail.title')}
      onCancel={onClose}
      destroyOnHidden
    >
      {asset ? (
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
            {asset.mimeType?.startsWith('image/') ? (
              <AuthenticatedMediaImage
                alt={asset.originalFilename ?? t('media.unknownFile')}
                downloadUrl={asset.downloadUrl}
                style={{ maxHeight: 220, maxWidth: '100%', objectFit: 'contain' }}
              />
            ) : (
              <FileOutlined style={{ fontSize: 56 }} />
            )}
          </div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            {asset.originalFilename ?? t('media.unknownFile')}
          </Typography.Title>
          <Descriptions column={2} size="small">
            <Descriptions.Item label={t('media.columns.mime')}>
              {asset.mimeType ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('media.columns.size')}>
              {formatSize(asset.size)}
            </Descriptions.Item>
            <Descriptions.Item label={t('media.columns.provider')}>
              {asset.provider ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('media.columns.resourceType')}>
              {asset.resourceType ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('media.columns.ownerType')}>
              {asset.ownerType ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('media.columns.status')}>
              <StatusTag status={asset.status === 'ACTIVE' ? 'operational' : 'cancelled'}>
                {asset.status}
              </StatusTag>
            </Descriptions.Item>
            <Descriptions.Item label={t('media.columns.createdAt')} span={2}>
              {new Date(asset.createdAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        </Space>
      ) : null}
    </Modal>
  )
}
