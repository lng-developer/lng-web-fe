import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRightOutlined, ShoppingOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import {
  getListingSummary,
  type Listing,
  listListings,
} from '@/features/portal/catalog/api/catalogApi'
import { getCustomerSummary } from '@/features/portal/customers/api/customerApi'
import {
  getOrderSummary,
  listOrderWorkbench,
  type OrderWorkbenchRow,
} from '@/features/portal/orders/api/orderApi'
import { getPermissions } from '@/shared/auth/session'
import { FeedbackAlert, SectionCard } from '@/shared/ui'

import styles from './FoundationPage.module.scss'

const numberOf = (value: number | undefined | null) => Number(value ?? 0)
const money = (amount: number | undefined | null, currency = 'USD') =>
  amount == null
    ? '-'
    : new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100)

function normalizeDataKey(key: string) {
  return key.replaceAll('_', ' ')
}

type ChartDatum = { label: string; value: number }

function MiniBars({ data }: { data: ChartDatum[] }) {
  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className={styles.mockBars}>
      {data.map((item) => (
        <span
          key={item.label}
          title={`${item.label}: ${item.value}`}
          style={{ height: `${Math.max(18, (item.value / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

function DonutChart({ data }: { data: ChartDatum[] }) {
  const safeData = data.filter((item) => item.value > 0)
  const total = safeData.reduce((sum, item) => sum + item.value, 0)
  if (!total) return <div className={styles.mockEmpty}>No data</div>

  const colors = ['#ff7a1a', '#2563eb', '#10b981', '#14b8a6', '#ef4444']
  const gradient = safeData
    .reduce<{ cursor: number; segments: string[] }>(
      (state, item, index) => {
        const end = state.cursor + (item.value / total) * 360
        state.segments.push(`${colors[index % colors.length]} ${state.cursor}deg ${end}deg`)
        return { cursor: end, segments: state.segments }
      },
      { cursor: 0, segments: [] },
    )
    .segments.join(', ')

  return (
    <div className={styles.mockDonutWrap}>
      <div className={styles.mockDonut} style={{ background: `conic-gradient(${gradient})` }}>
        <div>
          <strong>{total}</strong>
          <span>Orders</span>
        </div>
      </div>
      <ul className={styles.mockLegend}>
        {safeData.slice(0, 5).map((item, index) => (
          <li key={item.label}>
            <span style={{ background: colors[index % colors.length] }} />
            {item.label}
            <strong>{item.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProductImage({ listing }: { listing: Listing }) {
  const label = listing.asin || listing.etsyListingId || listing.sku || 'Listing image'
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

function TopAsins({ listings }: { listings: Listing[] }) {
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
              <span>{numberOf(listing.salesStats?.quantitySold)} sold</span>
              <strong>{numberOf(listing.salesStats?.orderCount)} orders</strong>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function RecentOrders({ rows }: { rows: OrderWorkbenchRow[] }) {
  return (
    <div className={styles.recentOrders}>
      <div className={styles.recentOrdersHead}>
        <span>Product</span>
        <span>Order ID</span>
        <span>Qty</span>
        <span>Total</span>
        <span>Status</span>
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
            <span>{row.order.externalOrderId}</span>
            <span>{firstItem?.item.quantity ?? row.items.length}</span>
            <span>
              {money(row.order.pricing.customerPaidAmount, row.order.pricing.currency ?? 'USD')}
            </span>
            <Tag color="green">{row.order.status ?? 'OPEN'}</Tag>
          </div>
        )
      })}
    </div>
  )
}

export function OperationsDashboardPage() {
  const { t } = useTranslation()
  const permissionSet = useMemo(
    () => new Set(getPermissions().map((permission) => permission.toUpperCase())),
    [],
  )
  const canOrders = permissionSet.has('ORDERS:READ') || permissionSet.has('ORDERS:WRITE')
  const canCatalog = permissionSet.has('CATALOG:READ') || permissionSet.has('CATALOG:WRITE')
  const canCustomers = permissionSet.has('CUSTOMERS:READ')

  const orderParams = useMemo(() => ({ page: 1, limit: 8 }) as const, [])
  const orderSummary = useQuery({
    queryKey: ['foundation', 'orders', 'summary'],
    queryFn: () => getOrderSummary(orderParams),
    enabled: canOrders,
  })
  const recentOrders = useQuery({
    queryKey: ['foundation', 'orders', 'recent'],
    queryFn: () => listOrderWorkbench(orderParams),
    enabled: canOrders,
  })
  const listingSummary = useQuery({
    queryKey: ['foundation', 'catalog', 'summary'],
    queryFn: () => getListingSummary({}),
    enabled: canCatalog,
  })
  const topListings = useQuery({
    queryKey: ['foundation', 'catalog', 'top-listings'],
    queryFn: () => listListings({ page: 1, limit: 8, sort: 'quantitySoldDesc' }),
    enabled: canCatalog,
  })
  const customerSummary = useQuery({
    queryKey: ['foundation', 'customers', 'summary'],
    queryFn: () => getCustomerSummary(),
    enabled: canCustomers,
  })

  const tabCounts = orderSummary.data?.tabCounts ?? {}
  const orderTotal = Object.hasOwn(tabCounts, 'all')
    ? numberOf(tabCounts.all)
    : Object.values(tabCounts).reduce((sum, value) => sum + numberOf(value), 0)
  const listingTotal = numberOf(listingSummary.data?.totalListingCount)
  const approvedListings = numberOf(listingSummary.data?.approvedCount)
  const targetPercent = listingTotal ? Math.round((approvedListings / listingTotal) * 100) : 0
  const orderStatus = Object.entries(tabCounts)
    .filter(([key]) => key !== 'all')
    .map(([key, value]) => ({
      label: t(`orders.tabs.${key}`, { defaultValue: normalizeDataKey(key) }),
      value: numberOf(value),
    }))
    .filter((item) => item.value > 0)

  if (!canOrders && !canCatalog) {
    return <FeedbackAlert type="info" title={t('foundation.portal.noPermission')} />
  }

  return (
    <section className={styles.mockDashboard}>
      <header className={styles.mockHeader}>
        <div>
          <Typography.Title level={2}>Dashboard</Typography.Title>
          <Typography.Text type="secondary">
            {dayjs().startOf('month').format('MMM DD, YYYY')} - {dayjs().format('MMM DD, YYYY')}
          </Typography.Text>
        </div>
        <Tag color="orange">{dayjs().format('MMM DD, YYYY')}</Tag>
      </header>

      <section className={styles.mockHeroCards}>
        <article className={styles.mockHeroCard}>
          <strong>{orderTotal}</strong>
          <span>Total orders</span>
          <MiniBars
            data={orderStatus.length ? orderStatus : [{ label: 'Orders', value: orderTotal }]}
          />
        </article>
        <article className={styles.mockHeroCard}>
          <strong>{approvedListings}</strong>
          <span>Approved listings</span>
          <div className={styles.mockProgress}>
            <small>{targetPercent}% approved</small>
            <i style={{ width: `${targetPercent}%` }} />
          </div>
        </article>
        <article className={styles.mockHeroCard}>
          <strong>{numberOf(customerSummary.data?.newCount)}</strong>
          <span>New customers</span>
          <button type="button" aria-label="Open listing queue">
            <ArrowRightOutlined />
          </button>
        </article>
        <article className={styles.mockHeroCard}>
          <strong>{listingTotal}</strong>
          <span>Product in stock</span>
          <div className={styles.mockHeroImages}>
            {(topListings.data?.items ?? []).slice(0, 2).map((listing) => (
              <ProductImage key={listing.id} listing={listing} />
            ))}
          </div>
        </article>
      </section>

      <section className={styles.mockGrid}>
        <SectionCard title="Summary">
          <MiniBars
            data={[
              { label: 'Orders', value: orderTotal },
              { label: 'Approved', value: approvedListings },
              { label: 'Draft', value: numberOf(listingSummary.data?.draftCount) },
              { label: 'No PSD', value: numberOf(listingSummary.data?.noPsdCount) },
              { label: 'Rejected', value: numberOf(listingSummary.data?.rejectedCount) },
            ]}
          />
        </SectionCard>

        <SectionCard title="Order status">
          <DonutChart data={orderStatus} />
        </SectionCard>

        <aside className={styles.mockSide}>
          <SectionCard title="Monthly target">
            <div className={styles.monthlyTarget}>
              <div className={styles.targetRing}>{targetPercent}%</div>
              <Typography.Text type="secondary">
                {approvedListings} approved from {listingTotal} listings
              </Typography.Text>
            </div>
          </SectionCard>
          <SectionCard title="Top ASINs">
            <TopAsins listings={topListings.data?.items ?? []} />
          </SectionCard>
        </aside>

        <SectionCard title="Recent orders">
          <RecentOrders rows={recentOrders.data?.items ?? []} />
        </SectionCard>
      </section>
    </section>
  )
}
