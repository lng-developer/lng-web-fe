import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Modal, Timeline, Typography } from 'antd'

import { modalQueryOptions } from '@/shared/query/modalQuery'
import { FeedbackAlert } from '@/shared/ui'

import { listMappingRuleHistory, type MappingRuleType } from '../api/mappingApi'
import { mappingKeys } from '../api/mappingKeys'

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
  const history = useQuery({
    queryKey: mappingKeys.history(type, id ?? ''),
    queryFn: () => listMappingRuleHistory(type, id!),
    ...modalQueryOptions,
    enabled: open && Boolean(id),
    retry: false,
  })
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
              <Typography.Text type="secondary">
                {event.actor?.displayName || event.actor?.email || 'System'} ·{' '}
                {event.createdAt ? new Date(event.createdAt).toLocaleString() : '—'}
              </Typography.Text>
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
