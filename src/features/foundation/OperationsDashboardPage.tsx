import { type CSSProperties } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRightOutlined } from '@ant-design/icons'
import { DatePicker, Typography } from 'antd'
import dayjs from 'dayjs'

import { FeedbackAlert, SectionCard } from '@/shared/ui'

import styles from './FoundationPage.module.scss'
import { DonutChart, MiniBars } from './OperationsDashboardCharts'
import { ProductImage, RecentOrders, TopAsins } from './OperationsDashboardLists'
import { useOperationsDashboard } from './useOperationsDashboard'

export function OperationsDashboardPage() {
  const { t } = useTranslation()
  const [dates, setDates] = useState(() => [dayjs().startOf('month'), dayjs().endOf('day')] as const)
  const { value, handle } = useOperationsDashboard(dates[0].toISOString(), dates[1].toISOString())

  if (!value.canViewDashboard) {
    return <FeedbackAlert type="info" title={t('foundation.portal.noPermission')} />
  }

  return (
    <section className={styles.mockDashboard}>
      <header className={styles.mockHeader}>
        <div>
          <Typography.Title level={2}>{t('foundation.portalDashboard.dashboard')}</Typography.Title>
          <Typography.Text type="secondary">{value.dateRangeLabel}</Typography.Text>
        </div>
        <DatePicker.RangePicker value={dates} onChange={(next) => next?.[0] && next[1] && setDates([next[0], next[1]])} />
      </header>

      <section className={styles.mockHeroCards}>
        <article className={styles.mockHeroCard}>
          <strong>{value.displayedOrderTotal}</strong>
          <span>{t('foundation.portalDashboard.totalOrders')}</span>
          <MiniBars data={value.orderBars} total={value.displayedOrderTotal} compact />
        </article>
        <article className={styles.mockHeroCard}>
          <strong>{value.approvedListings}</strong>
          <span>{t('foundation.portalDashboard.approvedListings')}</span>
          <div className={styles.mockProgress}>
            <small>
              {t('foundation.portalDashboard.approvedPercent', { percent: value.targetPercent })}
            </small>
            <i style={{ width: `${value.targetPercent}%` }} />
          </div>
        </article>
        <article className={styles.mockHeroCard}>
          <strong>{value.newCustomerCount}</strong>
          <span>{t('foundation.portalDashboard.newCustomers')}</span>
          <button
            type="button"
            aria-label={t('foundation.portalDashboard.openListingQueue')}
            className={styles.mockHeroAction}
            onClick={handle.openListingQueue}
          >
            <ArrowRightOutlined />
          </button>
        </article>
        <article className={styles.mockHeroCard}>
          <strong>{value.canFinance ? (value.financeRevenue / 100).toLocaleString() : value.listingTotal}</strong>
          <span>{value.canFinance ? 'Revenue' : t('foundation.portalDashboard.productInStock')}</span>
          <div className={styles.mockHeroImages}>
            {value.topListings.slice(0, 2).map((listing) => (
              <ProductImage key={listing.id} listing={listing} />
            ))}
          </div>
        </article>
      </section>

      <section className={styles.mockGrid}>
        <section aria-label={t('foundation.portalDashboard.actionQueue')}>
          <SectionCard title={t('foundation.portalDashboard.actionQueue')}>
            <DonutChart data={value.orderStatus} />
          </SectionCard>
        </section>

        <section aria-label={t('foundation.portalDashboard.orderAnalytics')}>
          <SectionCard title={t('foundation.portalDashboard.summary')}>
            <MiniBars data={value.summaryBars} total={value.summaryTotal} />
          </SectionCard>
        </section>

        <aside className={styles.mockSide}>
          <SectionCard title={t('foundation.portalDashboard.monthlyTarget')}>
            <div className={styles.monthlyTarget}>
              <div
                className={styles.targetRing}
                style={{ '--target-percent': `${value.safeTargetPercent}%` } as CSSProperties}
              >
                {value.safeTargetPercent}%
              </div>
              <Typography.Text type="secondary">
                {t('foundation.portalDashboard.approvedFromListings', {
                  approved: value.approvedListings,
                  total: value.listingTotal,
                })}
              </Typography.Text>
            </div>
          </SectionCard>
          <SectionCard title={t('foundation.portalDashboard.topAsins')}>
            <TopAsins listings={value.topListings} />
          </SectionCard>
        </aside>

        <SectionCard title={t('foundation.portalDashboard.recentOrders')}>
          <RecentOrders rows={value.recentOrders} />
        </SectionCard>
      </section>
    </section>
  )
}
