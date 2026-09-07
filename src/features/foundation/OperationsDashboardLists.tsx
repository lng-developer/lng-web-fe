import { useTranslation } from 'react-i18next'
import { ShoppingOutlined } from '@ant-design/icons'
import { Tag, Typography } from 'antd'

import { type Listing } from '@/features/portal/catalog/api/catalogApi'
import { type OrderWorkbenchRow } from '@/features/portal/orders/api/orderApi'
import { formatOrderStatusLabel } from '@/features/portal/orders/pages/orderPresentation'
import { CopyableOrderId } from '@/shared/ui'

import styles from './FoundationPage.module.scss'
import { money, numberOf } from './operationsDashboardFormatters'

export function ProductImage({ listing }: { listing: Listing }) {
  const { t } = useTranslation()
  const label =
    listing.asin ||
    listing.etsyListingId ||
    listing.sku ||
    t('foundation.portalDashboard.listingImage')
  return (
    <div className={styles.topAsinImage}>
      {listing.productImageUrl ? (
        <img src={listing.productImageUrl} alt={label} loading="lazy" />
      ) : (
        <ShoppingOutlined />
      )}
    </div>
  )
}

export function TopAsins({ listings }: { listings: Listing[] }) {
  const { t } = useTranslation()
  return (
    <div className={styles.topAsinGrid}>
      {listings.slice(0, 4).map((listing) => {
        const label = listing.asin || listing.etsyListingId || listing.sku
        return (
          <article className={styles.topAsinCard} key={listing.id}>
            <Typography.Text strong ellipsis title={label}>
              {label}
            </Typography.Text>
            <ProductImage listing={listing} />
            <div className={styles.topAsinMeta}>
              <span>
                {t('foundation.portalDashboard.soldCount', {
                  count: numberOf(listing.salesStats?.quantitySold),
                })}
              </span>
              <strong>
                {t('foundation.portalDashboard.orderCount', {
                  count: numberOf(listing.salesStats?.orderCount),
                })}
              </strong>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function RecentOrders({ rows }: { rows: OrderWorkbenchRow[] }) {
  const { t } = useTranslation()
  return (
    <div className={styles.recentOrders}>
      <div className={styles.recentOrdersHead}>
        <span>{t('foundation.portalDashboard.product')}</span>
        <span>{t('foundation.portalDashboard.orderId')}</span>
        <span>{t('foundation.portalDashboard.quantity')}</span>
        <span>{t('foundation.portalDashboard.total')}</span>
        <span>{t('foundation.portalDashboard.status')}</span>
      </div>
      {rows.slice(0, 6).map((row) => {
        const firstItem = row.items[0]
        const asin = firstItem?.item.asin || '-'
        const sku = firstItem?.item.sku || firstItem?.item.sourceSku || '-'
        const imageUrl = firstItem?.listing?.productImageUrl
        return (
          <div className={styles.recentOrderRow} key={row.order.id}>
            <span className={styles.recentOrderProduct}>
              <span className={styles.recentOrderImage}>
                {imageUrl ? (
                  <img src={imageUrl} alt={asin || sku} loading="lazy" />
                ) : (
                  <ShoppingOutlined />
                )}
              </span>
              <span>
                <strong>{asin}</strong>
                <small>{sku}</small>
              </span>
            </span>
            <CopyableOrderId value={row.order.externalOrderId} />
            <span>{firstItem?.item.quantity ?? row.items.length}</span>
            <span>
              {money(row.order.pricing.customerPaidAmount, row.order.pricing.currency ?? 'USD')}
            </span>
            <Tag color="green">{formatOrderStatusLabel(row.order.status, t)}</Tag>
          </div>
        )
      })}
    </div>
  )
}
