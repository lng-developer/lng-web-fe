import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  DollarCircleOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
  PercentageOutlined,
  RiseOutlined,
  RollbackOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { Collapse, Typography } from 'antd'

import { MetricCard, StatusTag } from '@/shared/ui'

import type { FinancePage } from '../api/financeApi'
import styles from '../pages/FinanceWorkspacePage.module.scss'
import { formatFinanceMoney } from './financeFormatters'

export type FinanceSnapshotSummary = FinancePage['summaryByCurrency'][number]

interface FinanceCurrencySummaryProps {
  summaries?: FinanceSnapshotSummary[]
  onFilterMissingCost?: () => void
}

export const FinanceCurrencySummary: React.FC<FinanceCurrencySummaryProps> = React.memo(
  ({ summaries, onFilterMissingCost }) => {
    const { t } = useTranslation()

    if (!summaries?.length) {
      return null
    }

    return (
      <div className={styles.summaryGroups}>
        {summaries.map((summary) => {
          const additionalFulfillmentCostAmount =
            summary.totalCostAmount == null
              ? null
              : Math.max(summary.totalCostAmount - (summary.baseCostAmount || 0), 0)
          const marginBps =
            summary.grossMarginBps ??
            (summary.revenueAmount > 0 && summary.profitAmount != null
              ? Math.round((summary.profitAmount / summary.revenueAmount) * 10000)
              : null)
          const marginPercent = marginBps != null ? (marginBps / 100).toFixed(1) : null
          const marginVal = marginBps != null ? marginBps / 100 : 0

          return (
            <section key={summary.currency} className={styles.currencySummary}>
              <div className={styles.currencyHeader}>
                <Typography.Text strong className={styles.currency}>
                  {summary.currency}
                </Typography.Text>
              </div>
              <div className={styles.metrics}>
                <MetricCard
                  icon={<ShoppingCartOutlined />}
                  label={t('finance.metrics.orders')}
                  value={String(summary.orderCount)}
                  variant="neutral"
                />
                <MetricCard
                  icon={<DollarCircleOutlined />}
                  label={t('finance.metrics.revenue')}
                  value={formatFinanceMoney(summary.revenueAmount, summary.currency)}
                  variant="primary"
                />
                <MetricCard
                  icon={<WalletOutlined />}
                  label={t('finance.metrics.cost')}
                  value={formatFinanceMoney(summary.totalCostAmount, summary.currency)}
                  variant="warning"
                  status={
                    summary.totalCostAmount == null ? (
                      <StatusTag status="warning">{t('finance.metrics.incomplete')}</StatusTag>
                    ) : null
                  }
                />
                <MetricCard
                  icon={<WalletOutlined />}
                  label={t('finance.metrics.knownCost')}
                  value={formatFinanceMoney(summary.knownCostAmount, summary.currency)}
                  variant="info"
                />
                <MetricCard
                  icon={<RiseOutlined />}
                  label={t('finance.metrics.profit')}
                  value={formatFinanceMoney(summary.profitAmount, summary.currency)}
                  variant="success"
                  status={
                    marginPercent != null ? (
                      <span
                        className={`${styles.marginPill} ${
                          marginVal >= 20
                            ? styles.marginPillSuccess
                            : marginVal >= 10
                              ? styles.marginPillWarning
                              : styles.marginPillDanger
                        }`}
                      >
                        {marginPercent}%
                      </span>
                    ) : null
                  }
                />
                <MetricCard
                  icon={<ExclamationCircleOutlined />}
                  label={t('finance.metrics.missing')}
                  value={String(summary.missingCostCount)}
                  variant="danger"
                  className={onFilterMissingCost ? styles.actionableMissingCard : undefined}
                  onClick={onFilterMissingCost}
                />
              </div>
              <Collapse
                className={styles.breakdown}
                items={[
                  {
                    key: 'breakdown',
                    label: t('finance.breakdown.title'),
                    children: (
                      <div className={styles.breakdownMetrics}>
                        <MetricCard
                          icon={<InboxOutlined />}
                          label={t('finance.breakdown.baseCost')}
                          value={formatFinanceMoney(summary.baseCostAmount, summary.currency)}
                          variant="warning"
                        />
                        <MetricCard
                          icon={<TruckOutlined />}
                          label={t('finance.breakdown.fulfillmentCost')}
                          value={formatFinanceMoney(
                            additionalFulfillmentCostAmount,
                            summary.currency,
                          )}
                          variant="warning"
                        />
                        <MetricCard
                          icon={<WalletOutlined />}
                          label={t('finance.breakdown.fees')}
                          value={formatFinanceMoney(summary.marketplaceFeeAmount, summary.currency)}
                          variant="info"
                        />
                        <MetricCard
                          icon={<RollbackOutlined />}
                          label={t('finance.breakdown.refund')}
                          value={formatFinanceMoney(summary.refundAmount, summary.currency)}
                          variant="danger"
                        />
                        <MetricCard
                          icon={<PercentageOutlined />}
                          label={t('finance.breakdown.discount')}
                          value={formatFinanceMoney(summary.discountAmount, summary.currency)}
                          variant="primary"
                        />
                      </div>
                    ),
                  },
                ]}
              />
            </section>
          )
        })}
      </div>
    )
  },
)

FinanceCurrencySummary.displayName = 'FinanceCurrencySummary'
