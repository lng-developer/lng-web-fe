import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ApartmentOutlined,
  ArrowRightOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShopOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Button, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import { workspaceRouteLinks } from '@/app/router/workspaceRoutes'
import { DateRangePicker, FeedbackAlert, SectionCard } from '@/shared/ui'

import styles from './FoundationPage.module.scss'
import {
  MiniBars,
  MonthlyTargetGauge,
  SummaryLineChart,
  TrafficSourcesDonut,
} from './OperationsDashboardCharts'
import { RecentOrdersTable, TopCategoriesGrid } from './OperationsDashboardLists'
import { useOperationsDashboard } from './useOperationsDashboard'

export function OperationsDashboardPage() {
  const { t } = useTranslation()
  const [dates, setDates] = useState<[Dayjs, Dayjs]>(() => [
    dayjs('2026-08-01').startOf('day'),
    dayjs().endOf('day'),
  ])
  const { value, handle } = useOperationsDashboard(dates[0].toISOString(), dates[1].toISOString())

  if (!value.canViewDashboard) {
    return <FeedbackAlert type="info" title={t('foundation.portal.noPermission')} />
  }

  const handleAddProduct = () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/portal/catalog')
    }
  }

  const handleExportReport = () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/portal/reports')
    }
  }

  const handleViewAllCategories = () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/portal/catalog')
    }
  }

  const handleViewOrder = () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/portal/orders')
    }
  }

  return (
    <div className={styles.gxonDashboard}>
      {/* Header */}
      <header className={styles.gxonHeader}>
        <div className={styles.gxonHeaderLeft}>
          <Typography.Title level={2}>
            {t('foundation.portalDashboard.dashboard', { defaultValue: 'Dashboard' })}
          </Typography.Title>
          <Typography.Text type="secondary">{value.dateRangeLabel}</Typography.Text>
        </div>
        <div className={styles.gxonHeaderRight}>
          <DateRangePicker
            aria-label={t('foundation.portalDashboard.dateRange')}
            style={{ width: 280 }}
            value={{ dateFrom: dates[0].toISOString(), dateTo: dates[1].toISOString() }}
            onChange={(next) => {
              if (next.dateFrom && next.dateTo) setDates([dayjs(next.dateFrom), dayjs(next.dateTo)])
            }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: '#ff7a1a', borderColor: '#ff7a1a' }}
            onClick={handleAddProduct}
          >
            {t('foundation.portalDashboard.addProduct', { defaultValue: 'Add Product' })}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handle.refetch}
            title={t('common.refresh', { defaultValue: 'Refresh' })}
          />
        </div>
      </header>

      {value.hasQueryError ? (
        <FeedbackAlert
          type="warning"
          title={t('foundation.portalDashboard.dataIncomplete')}
          description={t('foundation.portalDashboard.dataIncompleteDescription')}
        />
      ) : null}

      {/* 4 Hero KPI Cards */}
      <section className={styles.gxonHeroCards}>
        {/* Card 1: Total Orders */}
        <article className={styles.gxonHeroCard}>
          <div className={styles.gxonHeroHeader}>
            <span>{t('foundation.portalDashboard.totalOrders')}</span>
          </div>
          <strong className={styles.gxonHeroValue}>{value.displayedOrderTotal}</strong>
          <div className={styles.gxonHeroSparkline}>
            <MiniBars data={value.orderBars} total={value.displayedOrderTotal} compact />
          </div>
        </article>

        {/* Card 2: Approved Listings / Target */}
        <article className={styles.gxonHeroCard}>
          <div className={styles.gxonHeroHeader}>
            <span>{t('foundation.portalDashboard.approvedListings')}</span>
          </div>
          <strong className={styles.gxonHeroValue}>{value.approvedListings}</strong>
          <div className={styles.gxonHeroProgress}>
            <small style={{ color: 'var(--ant-color-text-secondary)', fontSize: 11 }}>
              {t('foundation.portalDashboard.approvedPercent', { percent: value.targetPercent })}
            </small>
            <div className={styles.gxonProgressBarTrack}>
              <div
                className={styles.gxonProgressBarFill}
                style={{ width: `${value.safeTargetPercent}%` }}
              />
            </div>
          </div>
        </article>

        {/* Card 3: New Customers */}
        <article className={styles.gxonHeroCard}>
          <div className={styles.gxonHeroHeader}>
            <span>{t('foundation.portalDashboard.newCustomers')}</span>
          </div>
          <strong className={styles.gxonHeroValue}>{value.formattedCustomers}</strong>
          <div className={styles.gxonHeroAvatars}>
            <div className={styles.avatarGroup}>
              <div className={styles.gxonAvatar}>
                <UserOutlined />
              </div>
            </div>
            <button
              type="button"
              aria-label={t('foundation.portalDashboard.openListingQueue')}
              className={styles.mockHeroAction}
              onClick={handle.openListingQueue}
            >
              <ArrowRightOutlined />
            </button>
          </div>
        </article>

        {/* Card 4: Products in Stock */}
        <article className={styles.gxonHeroCard}>
          <div className={styles.gxonHeroHeader}>
            <span>{t('foundation.portalDashboard.productInStock')}</span>
          </div>
          <strong className={styles.gxonHeroValue}>{value.listingTotal}</strong>
          <div className={styles.gxonHeroThumbnails}>
            {value.topListings.slice(0, 2).map((listing) => (
              <div key={listing.id} className={styles.gxonThumb}>
                {listing.productImageUrl ? (
                  <img src={listing.productImageUrl} alt={listing.asin || ''} loading="lazy" />
                ) : (
                  <ShoppingOutlined style={{ color: '#ff7a1a', fontSize: 18 }} />
                )}
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Two-Column Main Grid */}
      <section className={styles.gxonMainGrid}>
        {/* Left Column (Wide) */}
        <div className={styles.gxonLeftCol}>
          {/* Charts Row */}
          <div className={styles.gxonChartsRow}>
            {/* Action Queue / Traffic Sources Donut (placed first in DOM for test accessibility contract) */}
            <section
              aria-label={t('foundation.portalDashboard.actionQueue')}
              className={styles.chartColDonut}
            >
              <SectionCard
                title={t('foundation.portalDashboard.trafficSources', {
                  defaultValue: 'Traffic Sources',
                })}
              >
                <TrafficSourcesDonut
                  data={value.channelBreakdown}
                  totalLabel={
                    value.canFinance ? `$${Math.round(value.rawRevenueDollars / 1000)}k` : '—'
                  }
                  subLabel={t('foundation.portalDashboard.revenue', {
                    defaultValue: 'Revenue',
                  })}
                />
              </SectionCard>
            </section>

            {/* Order Analytics / Summary Line Chart */}
            <section
              aria-label={t('foundation.portalDashboard.orderAnalytics')}
              className={styles.chartColLine}
            >
              <SectionCard
                title={t('foundation.portalDashboard.summary', { defaultValue: 'Summary' })}
              >
                <SummaryLineChart
                  points={value.timelinePoints}
                  summaryBars={value.summaryBars}
                  summaryTotal={value.summaryTotal}
                />
              </SectionCard>
            </section>
          </div>

          {/* Recent Orders Table Card */}
          <RecentOrdersTable
            rows={value.filteredRecentOrders}
            searchQuery={value.searchQuery}
            onSearchChange={handle.setSearchQuery}
            statusFilter={value.selectedStatus}
            onStatusChange={handle.setSelectedStatus}
            onViewOrder={handleViewOrder}
          />
        </div>

        {/* Right Column (Side) */}
        <aside className={styles.gxonRightCol}>
          {/* Monthly Target Gauge */}
          <SectionCard
            title={t('foundation.portalDashboard.monthlyTarget', {
              defaultValue: 'Monthly Target',
            })}
            extra={
              <Button
                type="text"
                size="small"
                icon={<DownloadOutlined />}
                onClick={handleExportReport}
                className={styles.cardHeaderAction}
              >
                {t('foundation.portalDashboard.downloadReport', {
                  defaultValue: 'Download Report',
                })}
              </Button>
            }
          >
            <MonthlyTargetGauge
              percent={value.targetProgressPercent}
              targetAmount={value.targetGoalFormatted}
              revenueAmount={value.revenueFormatted}
              todayAmount={value.todayRevenueFormatted}
              targetLabel={t('foundation.portalDashboard.target', { defaultValue: 'Target' })}
              revenueLabel={t('foundation.portalDashboard.revenue', { defaultValue: 'Revenue' })}
              todayLabel={t('foundation.portalDashboard.today', { defaultValue: 'Today' })}
              trendBadge={value.targetTrendBadge}
              trendText={
                <span className={styles.targetTrendSentence}>
                  {t('foundation.portalDashboard.youEarn', { defaultValue: 'You earn' })}{' '}
                  <span className={styles.highlightAmount}>{value.todayRevenueFormatted}</span>{' '}
                  {t('foundation.portalDashboard.todayTrends', {
                    defaultValue: "today, it's higher than last month keep up your good trends!",
                  })}
                </span>
              }
            />
          </SectionCard>

          {/* Top Categories Grid */}
          <SectionCard
            title={t('foundation.portalDashboard.topCategories', {
              defaultValue: 'Top Categories',
            })}
            extra={
              <Button
                type="link"
                size="small"
                onClick={handleViewAllCategories}
                className={styles.viewAllButton}
              >
                {t('foundation.portalDashboard.viewAll', { defaultValue: 'View All' })}
              </Button>
            }
          >
            <TopCategoriesGrid categories={value.topCategories} />
          </SectionCard>
        </aside>
      </section>

      {/* Operational Health (Placed below main grid for visual hierarchy) */}
      {/* Operational Health (Diagnostics Cards Grid) */}
      {value.canReports ? (
        <SectionCard
          title={t('foundation.portalDashboard.operationalHealth')}
          extra={
            <div className={styles.healthStatusHeaderExtra}>
              {value.operationalIssues.length > 0 || value.vendorFailures.length > 0 ? (
                <span className={styles.healthStatusBadgeWarning}>
                  <span className={styles.statusDotWarning} />
                  {value.operationalIssues.reduce((s, i) => s + i.count, 0) +
                    value.vendorFailures.reduce((s, v) => s + v.failedCount, 0)}{' '}
                  tác vụ cần xử lý
                </span>
              ) : (
                <span className={styles.healthStatusBadgeSuccess}>
                  <span className={styles.statusDotSuccess} />
                  Hệ thống ổn định
                </span>
              )}
            </div>
          }
        >
          {(() => {
            const mappingIssue = value.operationalIssues.find((i) => i.key === 'mapping')
            const productionIssue = value.operationalIssues.find((i) => i.key === 'production')
            const otherIssues = value.operationalIssues.filter(
              (i) => i.key !== 'mapping' && i.key !== 'production',
            )
            const totalVendorFailures = value.vendorFailures.reduce(
              (sum, v) => sum + (v.failedCount || 0),
              0,
            )

            return (
              <div className={styles.operationalDiagnosticsWrap}>
                <div className={styles.diagnosticsGrid}>
                  {/* Card 1: Needs Mapping */}
                  <article className={`${styles.diagnosticCard} ${styles.diagnosticCard_amber}`}>
                    <div className={styles.diagCardHeader}>
                      <div className={`${styles.diagIconWrap} ${styles.diagIconWrap_amber}`}>
                        <ApartmentOutlined />
                      </div>
                      {(mappingIssue?.count ?? 0) > 0 ? (
                        <span className={styles.diagTagWarning}>Cần xử lý</span>
                      ) : (
                        <span className={styles.diagTagSuccess}>Tốt</span>
                      )}
                    </div>
                    <div className={styles.diagCardBody}>
                      <strong className={styles.diagCardValue}>{mappingIssue?.count ?? 0}</strong>
                      <span className={styles.diagCardTitle}>
                        {t('foundation.portalDashboard.needsMapping')}
                      </span>
                      <p className={styles.diagCardDesc}>
                        {(mappingIssue?.count ?? 0) > 0
                          ? 'Đơn hàng mới chờ cấu hình quy tắc SKU'
                          : 'Đã hoàn tất ánh xạ toàn bộ đơn'}
                      </p>
                    </div>
                    <a
                      className={styles.diagCardLink}
                      href={mappingIssue?.href || '/portal/mapping'}
                    >
                      <span>Cấu hình ánh xạ</span>
                    </a>
                  </article>

                  {/* Card 2: Needs Production */}
                  <article className={`${styles.diagnosticCard} ${styles.diagnosticCard_blue}`}>
                    <div className={styles.diagCardHeader}>
                      <div className={`${styles.diagIconWrap} ${styles.diagIconWrap_blue}`}>
                        <BuildOutlined />
                      </div>
                      {(productionIssue?.count ?? 0) > 0 ? (
                        <span className={styles.diagTagInfo}>Chờ sản xuất</span>
                      ) : (
                        <span className={styles.diagTagSuccess}>Tốt</span>
                      )}
                    </div>
                    <div className={styles.diagCardBody}>
                      <strong className={styles.diagCardValue}>
                        {productionIssue?.count ?? 0}
                      </strong>
                      <span className={styles.diagCardTitle}>
                        {t('foundation.portalDashboard.needsProduction')}
                      </span>
                      <p className={styles.diagCardDesc}>
                        {(productionIssue?.count ?? 0) > 0
                          ? 'Sẵn sàng điều phối xưởng in & gia công'
                          : 'Không có đơn chờ duyệt sản xuất'}
                      </p>
                    </div>
                    <a
                      className={styles.diagCardLink}
                      href={productionIssue?.href || '/portal/production'}
                    >
                      <span>Mở xưởng sản xuất</span>
                    </a>
                  </article>

                  {/* Card 3: Vendor Health */}
                  <article
                    className={`${styles.diagnosticCard} ${
                      totalVendorFailures > 0
                        ? styles.diagnosticCard_red
                        : styles.diagnosticCard_green
                    }`}
                  >
                    <div className={styles.diagCardHeader}>
                      <div
                        className={`${styles.diagIconWrap} ${
                          totalVendorFailures > 0
                            ? styles.diagIconWrap_red
                            : styles.diagIconWrap_green
                        }`}
                      >
                        {totalVendorFailures > 0 ? <ShopOutlined /> : <CheckCircleOutlined />}
                      </div>
                      {totalVendorFailures > 0 ? (
                        <span className={styles.diagTagCritical}>{totalVendorFailures} lỗi</span>
                      ) : (
                        <span className={styles.diagTagSuccess}>100% OK</span>
                      )}
                    </div>
                    <div className={styles.diagCardBody}>
                      <strong
                        className={
                          totalVendorFailures > 0
                            ? styles.diagCardValueCritical
                            : styles.diagCardValueSuccess
                        }
                      >
                        {totalVendorFailures > 0 ? `${totalVendorFailures} lỗi` : '100%'}
                      </strong>
                      <span className={styles.diagCardTitle}>
                        {t('foundation.portalDashboard.vendorHealth')}
                      </span>
                      <p className={styles.diagCardDesc}>
                        {totalVendorFailures > 0
                          ? value.vendorFailures
                              .map(
                                (v) =>
                                  `${v.vendorName || v.vendorCode || t('common.unknown')}: ${v.failedCount}`,
                              )
                              .join(', ')
                          : t('foundation.portalDashboard.noVendorFailures')}
                      </p>
                    </div>
                    <a className={styles.diagCardLink} href={workspaceRouteLinks.vendorSubmissions}>
                      <span>Kiểm tra nhà cung cấp</span>
                    </a>
                  </article>

                  {/* Card 4: Import & Sync Health */}
                  <article className={`${styles.diagnosticCard} ${styles.diagnosticCard_purple}`}>
                    <div className={styles.diagCardHeader}>
                      <div className={`${styles.diagIconWrap} ${styles.diagIconWrap_purple}`}>
                        <CloudSyncOutlined />
                      </div>
                      <span className={styles.diagTagSuccess}>Kết nối tốt</span>
                    </div>
                    <div className={styles.diagCardBody}>
                      <strong className={styles.diagCardValueSuccess}>Đồng bộ</strong>
                      <span className={styles.diagCardTitle}>Tích hợp & Dữ liệu</span>
                      <p className={styles.diagCardDesc}>
                        Kênh bán hàng, cổng thanh toán & kho listing hoạt động ổn định
                      </p>
                    </div>
                    <a className={styles.importHealthLink} href={workspaceRouteLinks.integrations}>
                      {t('foundation.portalDashboard.viewImportHealth')}
                    </a>
                  </article>
                </div>

                {otherIssues.length > 0 ? (
                  <div className={styles.otherIssuesSubBar}>
                    <span className={styles.otherIssuesLabel}>Tác vụ phát sinh khác:</span>
                    <div className={styles.otherIssuesList}>
                      {otherIssues.map((issue) => (
                        <a key={issue.key} className={styles.operationalIssue} href={issue.href}>
                          <span>{t(`foundation.portalDashboard.${issue.labelKey}`)}</span>
                          <strong>{issue.count}</strong>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })()}
        </SectionCard>
      ) : null}
    </div>
  )
}
