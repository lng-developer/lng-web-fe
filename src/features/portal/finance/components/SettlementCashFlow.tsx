import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { MetricCard, SectionCard, StatusTag } from '@/shared/ui'

import { type Settlement, listSettlements } from '../api/financeApi'
import { formatFinanceMoney } from './financeFormatters'
import styles from '../pages/FinanceWorkspacePage.module.scss'

const coverageLabel = (coverage?: number | null) =>
  coverage === null || coverage === undefined ? '—' : `${Math.round(coverage / 100)}%`

const displayDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : '—')

export function SettlementCashFlow() {
  const { t } = useTranslation()
  const settlements = useQuery({
    queryKey: ['finance', 'settlements'],
    queryFn: () => listSettlements({ page: 1, limit: 10 }),
    retry: false,
  })
  const columns: TableColumnsType<Settlement> = useMemo(
    () => [
      {
        title: t('finance.settlements.settlement'),
        width: 170,
        render: (_, row) => (
          <Space orientation="vertical" size={0}>
            <Typography.Text strong>{row.settlementId}</Typography.Text>
            <Typography.Text type="secondary">
              {displayDate(row.periodStartAt)} – {displayDate(row.periodEndAt)}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: t('finance.settlements.deposit'),
        width: 120,
        render: (_, row) => displayDate(row.depositAt),
      },
      {
        title: t('finance.settlements.payout'),
        width: 130,
        align: 'right',
        render: (_, row) => formatFinanceMoney(row.ledgerSummary.payoutAmount, row.currency),
      },
      {
        title: t('finance.settlements.ledgerNet'),
        width: 130,
        align: 'right',
        render: (_, row) => formatFinanceMoney(row.ledgerSummary.ledgerNetAmount, row.currency),
      },
      {
        title: t('finance.settlements.variance'),
        width: 130,
        align: 'right',
        render: (_, row) => formatFinanceMoney(row.ledgerSummary.cashVarianceAmount, row.currency),
      },
      {
        title: t('finance.settlements.linked'),
        width: 120,
        align: 'right',
        render: (_, row) => (
          <StatusTag status={row.ledgerSummary.cashVarianceAmount === 0 ? 'operational' : 'warning'}>
            {t('finance.settlements.linkedValue', {
              coverage: coverageLabel(row.ledgerSummary.linkCoverageBps),
              linked: row.ledgerSummary.linkedCount,
              total: row.ledgerSummary.lineCount,
            })}
          </StatusTag>
        ),
      },
    ],
    [t],
  )

  return (
    <SectionCard
      title={t('finance.settlements.title')}
      extra={<Typography.Text type="secondary">{t('finance.settlements.note')}</Typography.Text>}
    >
      <div className={styles.metrics}>
        {(settlements.data?.summaryByCurrency || []).map((summary) => (
          <MetricCard
            key={summary.currency}
            label={t('finance.settlements.payout')}
            value={formatFinanceMoney(summary.netSettlementAmount, summary.currency)}
            status={<Typography.Text type="secondary">{summary.currency}</Typography.Text>}
            variant="info"
          />
        ))}
      </div>
      <CoreDataTable
        rowKey="id"
        columns={columns}
        dataSource={settlements.data?.items}
        loading={settlements.isLoading}
        pagination={false}
        scroll={{ x: 800 }}
      />
    </SectionCard>
  )
}
