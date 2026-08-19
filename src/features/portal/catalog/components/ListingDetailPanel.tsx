import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EditOutlined, GlobalOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Divider, Space, Tag, Typography } from 'antd'

import { LoadingState, StatusTag, ZoomableImage } from '@/shared/ui'

import type { InternalTemplate, Listing, ProductTypeGroup } from '../api/catalogApi'
import { ListingVariantManager } from '../pages/ListingVariantManager'
import styles from './ListingDetailPanel.module.scss'
import { ListingQcActions } from './ListingQcActions'

const CHANNEL_ICON = {
  AMAZON: <GlobalOutlined />,
  ETSY: <ShopOutlined />,
} as Record<string, ReactNode>

interface ListingDetailPanelProps {
  listing: Listing | undefined
  isLoading: boolean
  canWrite: boolean
  onEdit: () => void
  productTypes: ProductTypeGroup[]
  templates: InternalTemplate[]
}

function StatItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className={styles.statItem}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Typography.Text>
      <Typography.Text strong style={{ fontSize: 18 }}>
        {value ?? '—'}
      </Typography.Text>
    </div>
  )
}

export function ListingDetailPanel({
  listing,
  isLoading,
  canWrite,
  onEdit,
  productTypes,
  templates,
}: ListingDetailPanelProps) {
  const { t } = useTranslation()

  if (!listing && !isLoading) {
    return (
      <div className={styles.empty}>
        <GlobalOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />
        <Typography.Text type="secondary">
          {t('portal.catalog.detail.selectListing')}
        </Typography.Text>
      </div>
    )
  }

  if (isLoading || !listing) {
    return (
      <div className={styles.panel}>
        <LoadingState variant="page" />
      </div>
    )
  }

  const seller = (
    listing as Listing & {
      seller?: { name?: string; employeeCode?: string }
    }
  ).seller

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.preview}>
            {listing.productImageUrl ? (
              <ZoomableImage
                src={listing.productImageUrl}
                alt={listing.title}
                className={styles.previewImg}
              />
            ) : (
              <GlobalOutlined />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Space size={8} wrap>
              <StatusTag status="ready">
                {CHANNEL_ICON[listing.salesChannelCode] ?? <ShopOutlined />}{' '}
                {listing.salesChannelCode}
              </StatusTag>
              <Tag>{listing.marketplaceCode}</Tag>
              <StatusTag status={listing.status === 'ACTIVE' ? 'operational' : 'cancelled'}>
                {listing.status}
              </StatusTag>
            </Space>
            <Typography.Text
              strong
              copyable={{ text: listing.sku }}
              style={{ display: 'block', fontSize: 20, marginTop: 6, lineHeight: 1.3 }}
            >
              {listing.sku}
            </Typography.Text>
            <Typography.Text type="secondary" ellipsis style={{ display: 'block' }}>
              {listing.title}
            </Typography.Text>
          </div>
          <Button icon={<EditOutlined />} onClick={onEdit}>
            {t('portal.catalog.edit')}
          </Button>
        </div>

        {/* Shop & Seller */}
        <div className={styles.shopRow}>
          <Space size={4}>
            <ShopOutlined style={{ color: '#8c8c8c' }} />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {listing.shop?.name ?? listing.shopId}
            </Typography.Text>
          </Space>
          {seller ? (
            <Space size={4}>
              <UserOutlined style={{ color: '#8c8c8c' }} />
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {seller.name} ({seller.employeeCode})
              </Typography.Text>
            </Space>
          ) : null}
          {listing.asin ? (
            <Space size={4}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                ASIN:
              </Typography.Text>
              <Typography.Text copyable style={{ fontSize: 12 }}>
                {listing.asin}
              </Typography.Text>
            </Space>
          ) : listing.etsyListingId ? (
            <Space size={4}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Etsy ID:
              </Typography.Text>
              <Typography.Text copyable style={{ fontSize: 12 }}>
                {listing.etsyListingId}
              </Typography.Text>
            </Space>
          ) : null}
        </div>
      </div>

      {/* Sales Stats */}
      <div className={styles.statsRow}>
        <StatItem
          label={t('portal.catalog.detail.quantitySold')}
          value={listing.salesStats.quantitySold}
        />
        <StatItem label={t('portal.catalog.detail.orders')} value={listing.salesStats.orderCount} />
        <StatItem
          label={t('portal.catalog.detail.orderItems')}
          value={listing.salesStats.orderItemCount}
        />
        <StatItem
          label={t('portal.catalog.detail.lastSold')}
          value={
            listing.salesStats.lastSoldAt
              ? new Date(listing.salesStats.lastSoldAt).toLocaleDateString()
              : t('portal.catalog.detail.never')
          }
        />
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* QC Status */}
      <div className={styles.section}>
        <Typography.Text
          type="secondary"
          strong
          style={{
            display: 'block',
            marginBottom: 10,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {t('portal.catalog.detail.qcStatus')}
        </Typography.Text>
        <ListingQcActions listing={listing} canWrite={canWrite} />
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Variants + Create/Edit */}
      <div className={styles.section}>
        <Typography.Text
          type="secondary"
          strong
          style={{
            display: 'block',
            marginBottom: 10,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {t('portal.catalog.detail.productionVariants')}
        </Typography.Text>
        <ListingVariantManager
          listing={listing}
          productTypes={productTypes}
          templates={templates}
          canWrite={canWrite}
        />
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Timestamps */}
      <div className={styles.section}>
        <Space direction="vertical" size={2}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('portal.catalog.detail.created', {
              value: new Date(listing.createdAt).toLocaleString(),
            })}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('portal.catalog.detail.updated', {
              value: new Date(listing.updatedAt).toLocaleString(),
            })}
          </Typography.Text>
          {listing.baseCostAmount ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('portal.catalog.detail.baseCost', {
                amount: listing.baseCostAmount,
                currency: listing.currency,
              })}
            </Typography.Text>
          ) : null}
        </Space>
      </div>
    </div>
  )
}
