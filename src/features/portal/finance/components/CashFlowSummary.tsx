import { Alert, Button, Space, Typography } from 'antd'

import { MetricCard } from '@/shared/ui'

import type { CashFlowStatus, CashFlowSummary as CashFlowSummaryType } from '../api/financeApi'
import { formatFinanceMoney } from './financeFormatters'

export function CashFlowSummary({
  summaries,
  importErrorCount,
  onStatusSelect,
}: {
  summaries: CashFlowSummaryType[]
  importErrorCount: number
  onStatusSelect: (status: CashFlowStatus) => void
}) {
  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      {summaries.map((summary) => (
        <section key={summary.currency}>
          <Typography.Text strong>{summary.currency}</Typography.Text>
          <Space wrap size={12} style={{ display: 'flex', marginTop: 8 }}>
            <MetricCard label="Transaction net" value={formatFinanceMoney(summary.transactionNetAmount, summary.currency)} variant="primary" />
            <MetricCard label="Fees" value={formatFinanceMoney(summary.feeAmount, summary.currency)} variant="warning" />
            <MetricCard label="Settlement payout" value={formatFinanceMoney(summary.settlementPayoutAmount, summary.currency)} variant="success" />
            <MetricCard label="Needs review" value={summary.unlinkedCount + summary.payoutVarianceCount} variant="neutral" />
            <Button onClick={() => onStatusSelect('UNLINKED')}>View unlinked</Button>
            <Button onClick={() => onStatusSelect('NEEDS_REVIEW')}>View needs review</Button>
          </Space>
        </section>
      ))}
      {importErrorCount ? <Alert type="warning" showIcon message={`${importErrorCount} import errors`} /> : null}
    </Space>
  )
}
