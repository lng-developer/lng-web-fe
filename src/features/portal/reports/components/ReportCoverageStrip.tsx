import { useTranslation } from 'react-i18next'
import { Typography } from 'antd'

import { MetricCard, SectionCard } from '@/shared/ui'

import type { FinanceCoverage } from '../api/reportApi'
import styles from '../pages/ReportWorkspacePage.module.scss'

export function ReportCoverageStrip({
  rows,
  dateBasis = 'ORDERED_AT',
}: {
  readonly rows?: FinanceCoverage[]
  readonly dateBasis?: 'ORDERED_AT' | 'CALCULATED_AT'
}) {
  const { t } = useTranslation()
  const metrics = (rows || []).flatMap((row) => {
    const currency = row.currency || '—'
    return [
      ['actual', row.actualCount, 'success'],
      ['estimated', row.estimatedCount, 'warning'],
      ['incomplete', row.incompleteCostCount, 'danger'],
      ['missingDate', row.missingDateCount, 'blocked'],
    ].map(([label, value, variant]) => ({
      key: `${currency}-${label}`,
      label: `${t(`reports.coverage.${label}`)} · ${currency}`,
      value: Number(value),
      variant: variant as 'success' | 'warning' | 'danger' | 'blocked',
    }))
  })

  return (
    <SectionCard
      title={t('reports.coverage.title')}
      extra={<Typography.Text type="secondary">{t(`reports.coverage.basis.${dateBasis}`)}</Typography.Text>}
    >
      <div className={styles.metrics}>
        {metrics.map((metric) => (
          <MetricCard key={metric.key} label={metric.label} value={metric.value} variant={metric.variant} />
        ))}
      </div>
    </SectionCard>
  )
}
