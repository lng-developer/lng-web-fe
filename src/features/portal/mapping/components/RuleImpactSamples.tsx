import { useTranslation } from 'react-i18next'
import { List, Typography } from 'antd'

import { FeedbackAlert } from '@/shared/ui'

import type { RuleConflictResult, RulePreviewResult } from '../api/mappingApi'

export function RuleImpactSamples({
  conflicts,
  preview,
}: {
  readonly conflicts?: RuleConflictResult
  readonly preview?: RulePreviewResult
}) {
  const { t } = useTranslation()
  const errors = conflicts?.hasExactConflict
    ? [{ severity: 'ERROR' as const }]
    : (conflicts?.errors ?? conflicts?.conflicts?.filter((item) => item.severity === 'ERROR') ?? [])
  const warnings =
    conflicts?.warnings ?? conflicts?.conflicts?.filter((item) => item.severity === 'WARNING') ?? []
  return (
    <div className="space-y-2">
      <Typography.Text type="secondary">{t('mapping.states.sampled')}</Typography.Text>
      {errors.length ? (
        <FeedbackAlert type="error" title={t('mapping.feedback.exactConflict')} />
      ) : null}
      {warnings.length ? (
        <FeedbackAlert type="warning" title={t('mapping.feedback.scopeOverlap')} />
      ) : null}
      <List
        size="small"
        dataSource={preview?.items ?? []}
        renderItem={(item, index) => (
          <List.Item>
            <Typography.Text code>
              {String(item.sku ?? item.orderItemId ?? index + 1)}
            </Typography.Text>
            <span>{String(item.output ?? item.result ?? '—')}</span>
          </List.Item>
        )}
      />
    </div>
  )
}
