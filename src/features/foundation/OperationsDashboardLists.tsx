import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DownloadOutlined,
  EllipsisOutlined,
  EyeOutlined,
  SearchOutlined,
  ShoppingOutlined,
  TrophyFilled,
} from '@ant-design/icons'
import { Button, Checkbox, Dropdown, Input, message, Select, Typography } from 'antd'

import { type Listing } from '@/features/portal/catalog/api/catalogApi'
import { type OrderWorkbenchRow } from '@/features/portal/orders/api/orderApi'
import {
  formatOrderStatusLabel,
  orderStatusTone,
} from '@/features/portal/orders/pages/orderPresentation'
import { CopyableOrderId, FormattedDateTime, StatusTag } from '@/shared/ui'

import styles from './FoundationPage.module.scss'
import { money, numberOf } from './operationsDashboardFormatters'
import { type TopCategoryItem, type TopSeller } from './useOperationsDashboard'

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

// 2x2 Grid of Top Categories matching the GXON mockup
export function TopCategoriesGrid({
  categories,
  onViewAll,
}: {
  categories: TopCategoryItem[]
  onViewAll?: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className={styles.categoryGridContainer}>
      <div className={styles.categoryGrid}>
        {categories.slice(0, 4).map((cat) => {
          const isPositive = (cat.growthPercent ?? 0) >= 0
          const presetClass = cat.preset ? styles[`categoryCard_${cat.preset}`] : ''

          return (
            <div className={`${styles.categoryCard} ${presetClass}`} key={cat.id}>
              <span className={styles.categoryName} title={cat.name}>
                {cat.name}
              </span>
              <div className={styles.categoryImageWrap}>
                {cat.imageUrl ? (
                  <img src={cat.imageUrl} alt={cat.name} loading="lazy" />
                ) : (
                  <ShoppingOutlined className={styles.categoryFallbackIcon} />
                )}
              </div>
              <div className={styles.categoryFooter}>
                <span className={styles.categorySales}>{cat.salesAmount}</span>
                <span
                  className={
                    isPositive ? styles.categoryGrowthPositive : styles.categoryGrowthNegative
                  }
                >
                  {isPositive ? `+${cat.growthPercent ?? 0}%` : `${cat.growthPercent}%`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      {onViewAll && (
        <Button type="link" size="small" onClick={onViewAll} className={styles.viewAllButton}>
          {t('foundation.portalDashboard.viewAll', { defaultValue: 'View All' })}
        </Button>
      )}
    </div>
  )
}

export function TopSellersPodium({ sellers }: { sellers: TopSeller[] }) {
  const rankedSellers = sellers.slice(0, 3)
  const podiumOrder = [rankedSellers[1], rankedSellers[0], rankedSellers[2]].filter(
    (seller): seller is TopSeller => Boolean(seller),
  )

  return (
    <div className={styles.sellerPodium} aria-label="Top sellers">
      {podiumOrder.map((seller) => {
        const rank = rankedSellers.indexOf(seller) + 1
        return (
          <article
            key={seller.id}
            className={`${styles.sellerPodiumItem} ${styles[`sellerPodiumRank${rank}`]}`}
          >
            {rank === 1 ? (
              <TrophyFilled className={styles.sellerTrophy} aria-hidden="true" />
            ) : null}
            <span className={styles.sellerRank}>#{rank}</span>
            <div className={styles.sellerImageWrap} aria-hidden="true">
              {seller.name.slice(0, 1).toUpperCase()}
            </div>
            <strong title={seller.name}>{seller.name}</strong>
            <span>{money(seller.revenueAmount, seller.currency || 'USD')}</span>
          </article>
        )
      })}
    </div>
  )
}

// Full Recent Orders Table matching the GXON mockup
export function RecentOrdersTable({
  rows,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onViewOrder,
}: {
  rows: OrderWorkbenchRow[]
  searchQuery?: string
  onSearchChange?: (q: string) => void
  statusFilter?: string
  onStatusChange?: (status: string) => void
  onViewOrder?: (orderId: string) => void
}) {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const pageSize = 6
  const total = rows.length
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const totalPages = Math.ceil(total / pageSize) || 1

  const allPaginatedSelected =
    paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.has(r.order.id))
  const somePaginatedSelected = paginatedRows.some((r) => selectedIds.has(r.order.id))

  const handleToggleAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      paginatedRows.forEach((r) => {
        if (checked) next.add(r.order.id)
        else next.delete(r.order.id)
      })
      return next
    })
  }

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDownloadReport = () => {
    window.open('/api/reports/export.csv', '_blank')
  }

  return (
    <div className={styles.recentOrdersTableCard}>
      <div className={styles.recentOrdersToolbar}>
        <Typography.Title level={4} className={styles.recentOrdersTitle}>
          {t('foundation.portalDashboard.recentOrders', { defaultValue: 'Recent Orders' })}
        </Typography.Title>
        <div className={styles.recentOrdersActions}>
          <Button
            icon={<DownloadOutlined />}
            size="middle"
            className={styles.downloadReportBtn}
            onClick={handleDownloadReport}
          >
            {t('foundation.portalDashboard.downloadReport', { defaultValue: 'Download Report' })}
          </Button>
          <Select
            value={statusFilter || 'all'}
            onChange={onStatusChange}
            style={{ width: 140 }}
            options={[
              {
                label: t('foundation.portalDashboard.allStatus', { defaultValue: 'All Status' }),
                value: 'all',
              },
              {
                label: t('orders.statuses.CONFIRMED', { defaultValue: 'Confirmed' }),
                value: 'confirmed',
              },
              {
                label: t('orders.statuses.SHIPPED', { defaultValue: 'Shipped' }),
                value: 'shipped',
              },
              {
                label: t('orders.statuses.PENDING', { defaultValue: 'Pending' }),
                value: 'pending',
              },
              {
                label: t('orders.statuses.PROCESSING', { defaultValue: 'Processing' }),
                value: 'processing',
              },
              {
                label: t('orders.statuses.CANCELLED', { defaultValue: 'Cancelled' }),
                value: 'cancelled',
              },
            ]}
          />
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder={t('common.search', { defaultValue: 'Search...' })}
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            allowClear
            style={{ width: 180 }}
          />
        </div>
      </div>

      <div className={styles.tableResponsiveWrap}>
        <table className={styles.gxonTable}>
          <thead>
            <tr>
              <th style={{ width: 44 }}>
                <Checkbox
                  checked={allPaginatedSelected}
                  indeterminate={!allPaginatedSelected && somePaginatedSelected}
                  onChange={(e) => handleToggleAll(e.target.checked)}
                />
              </th>
              <th>{t('foundation.portalDashboard.product', { defaultValue: 'Product' })}</th>
              <th>{t('foundation.portalDashboard.orderId', { defaultValue: 'Order ID' })}</th>
              <th style={{ textAlign: 'center' }}>
                {t('foundation.portalDashboard.quantity', { defaultValue: 'QTY' })}
              </th>
              <th>{t('foundation.portalDashboard.price', { defaultValue: 'Price' })}</th>
              <th>{t('foundation.portalDashboard.totalPrice', { defaultValue: 'Total Price' })}</th>
              <th>{t('foundation.portalDashboard.status', { defaultValue: 'Status' })}</th>
              <th style={{ width: 80, textAlign: 'center' }}>
                {t('foundation.portalDashboard.action', { defaultValue: 'Action' })}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}
                >
                  {t('foundation.portalDashboard.noData', { defaultValue: 'No data' })}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const firstItem = row.items[0]
                const title =
                  firstItem?.item?.title ||
                  firstItem?.listing?.title ||
                  firstItem?.item?.sku ||
                  'Custom Product'
                const imageUrl = firstItem?.listing?.productImageUrl
                const qty = firstItem?.item?.quantity ?? 1
                const unitPrice =
                  firstItem?.pricing?.customerPaidAmount != null
                    ? money(
                        firstItem.pricing.customerPaidAmount,
                        row.order.pricing?.currency || 'USD',
                      )
                    : money(0, row.order.pricing?.currency || 'USD')
                const totalPrice =
                  row.order.pricing?.customerPaidAmount != null
                    ? money(
                        row.order.pricing.customerPaidAmount,
                        row.order.pricing?.currency || 'USD',
                      )
                    : money(0, row.order.pricing?.currency || 'USD')

                return (
                  <tr key={row.order.id} className={styles.tableRow}>
                    <td>
                      <Checkbox
                        checked={selectedIds.has(row.order.id)}
                        onChange={() => handleToggleRow(row.order.id)}
                      />
                    </td>
                    <td>
                      <div className={styles.productCell}>
                        <div className={styles.productThumb}>
                          {imageUrl ? (
                            <img src={imageUrl} alt={title} loading="lazy" />
                          ) : (
                            <ShoppingOutlined style={{ color: '#94a3b8', fontSize: 18 }} />
                          )}
                        </div>
                        <div className={styles.productMeta}>
                          <span className={styles.productTitle} title={title}>
                            {title}
                          </span>
                          <span className={styles.productDate}>
                            {row.order.orderedAt ? (
                              <FormattedDateTime value={row.order.orderedAt} format="date" />
                            ) : (
                              <FormattedDateTime value={row.order.createdAt} format="date" />
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <CopyableOrderId value={row.order.externalOrderId || row.order.id} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={styles.qtyPill}>x{qty}</span>
                    </td>
                    <td className={styles.priceCell}>{unitPrice}</td>
                    <td className={styles.totalPriceCell}>{totalPrice}</td>
                    <td>
                      <StatusTag status={orderStatusTone(row.order.status)}>
                        {formatOrderStatusLabel(row.order.status, t)}
                      </StatusTag>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.rowActions}>
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => onViewOrder?.(row.order.id)}
                          title={t('common.viewDetails', { defaultValue: 'View details' })}
                        />
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: 'view',
                                label: t('common.viewDetails', { defaultValue: 'View Details' }),
                                onClick: () => onViewOrder?.(row.order.id),
                              },
                              {
                                key: 'copy',
                                label: t('common.copyOrderId', { defaultValue: 'Copy Order ID' }),
                                onClick: async () => {
                                  const idToCopy = row.order.externalOrderId || row.order.id
                                  if (idToCopy && navigator.clipboard) {
                                    await navigator.clipboard.writeText(idToCopy)
                                    message.success(
                                      t('common.orderIdCopied', {
                                        defaultValue: 'Order ID copied',
                                      }),
                                    )
                                  }
                                },
                              },
                            ],
                          }}
                          trigger={['click']}
                        >
                          <Button type="text" size="small" icon={<EllipsisOutlined />} />
                        </Dropdown>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.recentOrdersFooter}>
        <span className={styles.paginationText}>
          {t('common.pagination.showingEntries', {
            from: total > 0 ? (currentPage - 1) * pageSize + 1 : 0,
            to: Math.min(currentPage * pageSize, total),
            total,
            defaultValue: `Showing ${total > 0 ? (currentPage - 1) * pageSize + 1 : 0} to ${Math.min(currentPage * pageSize, total)} of ${total} entries`,
          })}
        </span>
        <div className={styles.paginationControls}>
          <Button
            size="small"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            &lt;
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(0, 5)
            .map((page) => (
              <Button
                key={page}
                size="small"
                type={currentPage === page ? 'primary' : 'default'}
                onClick={() => setCurrentPage(page)}
                style={
                  currentPage === page
                    ? { background: '#ff7a1a', borderColor: '#ff7a1a' }
                    : undefined
                }
              >
                {page}
              </Button>
            ))}
          <Button
            size="small"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            &gt;
          </Button>
        </div>
      </div>
    </div>
  )
}

// Keep RecentOrders backwards-compatible for any test assertions
export function RecentOrders({ rows }: { rows: OrderWorkbenchRow[] }) {
  return <RecentOrdersTable rows={rows} />
}
