import { useTranslation } from 'react-i18next'
import { CopyOutlined, FileOutlined, LinkOutlined } from '@ant-design/icons'
import { Button, Descriptions, message, Space, Typography } from 'antd'

import { AuthenticatedMediaImage } from '@/shared/media'
import { DetailDrawer, FormattedDateTime, StatusTag } from '@/shared/ui'

import { getMediaAssetUrl, type MediaAsset } from '../api/mediaApi'

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
    <DetailDrawer
      open={Boolean(asset)}
      footer={null}
      title={t('media.detail.title')}
      onClose={onClose}
      destroyOnHidden
      width="min(1000px, 88vw)"
      allowModeToggle
      allowMaximize
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
                {t(`media.statuses.${asset.status}`, { defaultValue: asset.status })}
              </StatusTag>
            </Descriptions.Item>
            <Descriptions.Item
              label={t('media.columns.url', { defaultValue: 'Link ảnh' })}
              span={2}
            >
              {(() => {
                const url = getMediaAssetUrl(asset)
                if (!url) return '-'
                return (
                  <Space wrap>
                    <Typography.Link href={url} target="_blank" rel="noreferrer">
                      {url}
                    </Typography.Link>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        void navigator.clipboard.writeText(url)
                        void message.success(
                          t('media.actions.copiedLink', { defaultValue: 'Đã sao chép link ảnh' }),
                        )
                      }}
                    >
                      {t('media.actions.copyLink', { defaultValue: 'Sao chép' })}
                    </Button>
                    <Button
                      size="small"
                      icon={<LinkOutlined />}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('media.actions.openLink', { defaultValue: 'Mở tab mới' })}
                    </Button>
                  </Space>
                )
              })()}
            </Descriptions.Item>
            <Descriptions.Item label={t('media.columns.createdAt')} span={2}>
              <FormattedDateTime value={asset.createdAt} />
            </Descriptions.Item>
          </Descriptions>
        </Space>
      ) : null}
    </DetailDrawer>
  )
}
