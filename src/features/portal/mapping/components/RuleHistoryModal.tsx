import { useTranslation } from 'react-i18next'
import { Modal, Timeline, Typography } from 'antd'

import { FeedbackAlert, FormattedDateTime } from '@/shared/ui'

import type { MappingRuleType } from '../api/mappingApi'
import { useRuleHistoryQuery } from '../hooks'

function changedFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
) {
  return [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])]
    .filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]))
    .map((key) => ({
      key,
      before: JSON.stringify(before?.[key] ?? null),
      after: JSON.stringify(after?.[key] ?? null),
    }))
}

export function RuleHistoryModal({
  id,
  open,
  type,
  onClose,
}: {
  readonly id?: string
  readonly open: boolean
  readonly type: MappingRuleType
  readonly onClose: () => void
}) {
  const { t } = useTranslation()
  const history = useRuleHistoryQuery(type, id, { enabled: open && Boolean(id) })
  return (
    <Modal open={open} title={t('mapping.sections.history')} footer={null} onCancel={onClose}>
      {history.error ? (
        <FeedbackAlert type="error" title={t('mapping.feedback.loadFailed')} />
      ) : null}
      <Timeline
        pending={history.isLoading ? '…' : undefined}
        items={(history.data ?? []).map((event) => ({
          children: (
            <div>
              <Typography.Text strong>{event.event || 'UPDATED'}</Typography.Text>
              <br />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <Typography.Text type="secondary">
                  {event.actor?.displayName || event.actor?.email || 'System'} ·
                </Typography.Text>
                <FormattedDateTime value={event.createdAt} />
              </div>
              {changedFields(event.before, event.after).map((change) => (
                <div key={change.key} style={{ marginTop: 6 }}>
                  <Typography.Text code>{change.key}</Typography.Text>{' '}
                  <Typography.Text type="secondary">{change.before}</Typography.Text>
                  {' → '}
                  <Typography.Text>{change.after}</Typography.Text>
                </div>
              ))}
            </div>
          ),
        }))}
      />
    </Modal>
  )
}
