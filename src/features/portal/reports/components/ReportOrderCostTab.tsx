import { useTranslation } from 'react-i18next'
import {
  DollarOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { Empty, Pagination, Tag, Typography } from 'antd'

import { MetricCard, SectionCard } from '@/shared/ui'

import type { OrderProfitability, OrderProfitabilityReport } from '../api/reportApi'
import styles from '../pages/ReportWorkspacePage.module.scss'
import { formatReportMoney, formatReportPercent } from './reportFormatters'

interface ReportOrderCostTabProps {
  data?: OrderProfitabilityReport
  isPending: boolean
  onPageChange: (page: number) => void
}

export function ReportOrderCostTab({ data, isPending, onPageChange }: ReportOrderCostTabProps) {
  const { t } = useTranslation()
  const missingCostRows = (data?.items || []).filter((row) => row.missingCostCount > 0)
  const completeRows = (data?.items || []).filter((row) => row.missingCostCount === 0)

  return (
    <div className={styles.stack}>
      <SectionCard title={t('reports.orderCost.overview')}>
        <div className={styles.salesMetrics}>
          {(data?.summaryByCurrency || []).map((summary) => (
            <div key={summary.currency || 'unknown'} className={styles.orderCostSummary}>
              <Typography.Text strong>{summary.currency || '—'}</Typography.Text>
              <div className={styles.metrics}>
                <MetricCard
                  icon={<ShoppingCartOutlined />}
                  label={t('reports.columns.orders')}
                  value={String(summary.orderCount)}
                  variant="neutral"
                  loading={isPending}
                />
                <MetricCard
                  icon={<DollarOutlined />}
                  label={t('reports.columns.revenue')}
                  value={formatReportMoney(summary.revenueAmount, summary.currency || 'USD')}
                  variant="primary"
                  loading={isPending}
                />
                <MetricCard
                  icon={<RiseOutlined />}
                  label={t('reports.metrics.netProfit')}
                  value={formatReportMoney(summary.profitAmount, summary.currency || 'USD')}
                  status={formatReportPercent(summary.marginBps)}
                  variant="success"
                  loading={isPending}
                />
                <MetricCard
                  icon={<WalletOutlined />}
                  label={t('reports.orderCost.costCoverage')}
                  value={t('reports.orderCost.costCoverageValue', {
                    costed: summary.costedOrderCount,
                    total: summary.orderCount,
                  })}
                  variant="info"
                  loading={isPending}
                />
                <MetricCard
                  icon={<ExclamationCircleOutlined />}
                  label={t('reports.metrics.missingCost')}
                  value={String(summary.missingCostOrderCount)}
                  variant="danger"
                  loading={isPending}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <OrderCostSection
        title={t('reports.orderCost.missingFulfillmentCost')}
        rows={missingCostRows}
        missingCost
      />
      <OrderCostSection title={t('reports.orderCost.completePnl')} rows={completeRows} />
      <div className={styles.reportPagination}>
        <Pagination
          current={data?.pagination.page || 1}
          pageSize={data?.pagination.limit || 20}
          total={data?.pagination.total || 0}
          showSizeChanger={false}
          onChange={onPageChange}
        />
      </div>
    </div>
  )
}

function OrderCostSection({
  title,
  rows,
  missingCost = false,
}: {
  title: string
  rows: OrderProfitability[]
  missingCost?: boolean
}) {
  const { t } = useTranslation()
  return (
    <SectionCard title={title}>
      {rows.length ? (
        <div className={styles.orderCostGrid}>
          {rows.map((row) => {
            const currency = row.currency || 'USD'
            return (
              <article
                key={`${row.orderId}-${currency}`}
                className={`${styles.orderCostCard} ${missingCost ? styles.orderCostCardMissing : ''}`}
              >
                <header className={styles.orderCostCardHeader}>
                  <div>
                    <Typography.Text strong>
                      {row.externalOrderId || row.orderId || '—'}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      {t('reports.columns.items')}: {row.itemCount}
                    </Typography.Text>
                  </div>
                  <Tag
                    color={
                      missingCost
                        ? 'warning'
                        : row.profitAmount != null && row.profitAmount < 0
                          ? 'error'
                          : 'success'
                    }
                  >
                    {missingCost
                      ? t('reports.metrics.missingCost')
                      : formatReportPercent(row.marginBps)}
                  </Tag>
                </header>
                <div className={styles.orderCostValues}>
                  <ReportValue
                    label={t('reports.columns.revenue')}
                    value={formatReportMoney(row.revenueAmount, currency)}
                  />
                  <ReportValue
                    label={t('reports.columns.fulfillmentCost')}
                    value={
                      row.totalCostAmount == null
                        ? '—'
                        : formatReportMoney(row.totalCostAmount, currency)
                    }
                  />
                  <ReportValue
                    label={t('reports.metrics.netProfit')}
                    value={
                      row.profitAmount == null ? '—' : formatReportMoney(row.profitAmount, currency)
                    }
                    strong
                  />
                </div>
                <div className={styles.orderCostBreakdown}>
                  <span>
                    {t('reports.columns.marketplaceFee')}:{' '}
                    {formatReportMoney(row.marketplaceFeeAmount, currency)}
                  </span>
                  <span>
                    {t('reports.columns.refund')}: {formatReportMoney(row.refundAmount, currency)}
                  </span>
                  <span>
                    {t('reports.columns.discount')}:{' '}
                    {formatReportMoney(row.discountAmount, currency)}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </SectionCard>
  )
}

function ReportValue({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Typography.Text strong={strong}>{value}</Typography.Text>
    </div>
  )
}
