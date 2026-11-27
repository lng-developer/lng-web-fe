import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { MetricCard } from '@/shared/ui'
import { formatFinanceMoney } from '@/features/portal/finance/components/financeFormatters'
import type { OrderProfitabilitySummary } from '../api/reportApi'
import styles from '../pages/ReportOrderCostPage.module.scss'

export function OrderCostSummary({ summaries }: { summaries: OrderProfitabilitySummary[] }) {
  const { t } = useTranslation()
  return summaries.map((summary) => (
    <section key={summary.currency}>
      <Typography.Text strong>{summary.currency}</Typography.Text>
      <div className={styles.metrics}>
        <MetricCard label={t('finance.metrics.orders')} value={String(summary.orderCount)} />
        <MetricCard
          label={t('finance.metrics.revenue')}
          value={formatFinanceMoney(summary.revenueAmount, summary.currency || 'USD')}
        />
        <MetricCard
          label={t('finance.metrics.cost')}
          value={formatFinanceMoney(summary.totalCostAmount, summary.currency || 'USD')}
          subtext={t('finance.metrics.costEvidence')}
          variant={summary.missingCostOrderCount ? 'warning' : 'neutral'}
        />
        <MetricCard
          label={t('finance.metrics.profit')}
          value={formatFinanceMoney(summary.profitAmount, summary.currency || 'USD')}
        />
        <MetricCard
          label={t('finance.breakdown.refund')}
          value={formatFinanceMoney(summary.refundAmount, summary.currency || 'USD')}
        />
      </div>
    </section>
  ))
}
