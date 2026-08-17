import { type ReactNode } from 'react'
import { GlobalOutlined, ShopOutlined } from '@ant-design/icons'
import { Space, Typography } from 'antd'

import { StatusTag, ZoomableImage } from '@/shared/ui'

import type { Listing } from '../api/catalogApi'
import styles from './ListingCard.module.scss'

const QC_STATUS_COLOR: Record<string, string> = {
  APPROVED: '#52c41a',
  DRAFT: '#faad14',
  REJECTED: '#ff4d4f',
}

const CHANNEL_ICON: Record<string, ReactNode> = {
  AMAZON: <GlobalOutlined style={{ color: '#ff9900' }} />,
  ETSY: <ShopOutlined style={{ color: '#f56400' }} />,
}

interface ListingCardProps {
  listing: Listing
  isSelected: boolean
  onClick: () => void
}

export function ListingCard({ listing, isSelected, onClick }: ListingCardProps) {
  const qcColor = QC_STATUS_COLOR[listing.qcStatus] ?? '#d9d9d9'

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Left accent bar coloured by QC status */}
      <div className={styles.accent} style={{ backgroundColor: qcColor }} />

      <div className={styles.thumbnail}>
        {listing.productImageUrl ? (
          <ZoomableImage
            src={listing.productImageUrl}
            alt={listing.title}
            className={styles.thumbnailImg}
          />
        ) : (
          <GlobalOutlined />
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.top}>
          <Typography.Text strong ellipsis className={styles.sku}>
            {listing.sku}
          </Typography.Text>
          <StatusTag
            status={
              listing.qcStatus === 'APPROVED'
                ? 'approved'
                : listing.qcStatus === 'REJECTED'
                  ? 'rejected'
                  : 'pending'
            }
          >
            {listing.qcStatus}
          </StatusTag>
        </div>

        <Typography.Text type="secondary" ellipsis className={styles.title}>
          {listing.title}
        </Typography.Text>

        <div className={styles.meta}>
          <Space size={4}>
            {CHANNEL_ICON[listing.salesChannelCode] ?? <ShopOutlined />}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {listing.shop?.name ?? listing.shopId}
            </Typography.Text>
          </Space>
          <Space size={4}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {listing.salesStats.quantitySold} sold
            </Typography.Text>
          </Space>
        </div>
      </div>
    </div>
  )
}
