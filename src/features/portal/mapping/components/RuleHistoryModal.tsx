import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Modal, Timeline, Typography } from 'antd'

import { FeedbackAlert } from '@/shared/ui'

import { listMappingRuleHistory, type MappingRuleType } from '../api/mappingApi'
import { mappingKeys } from '../api/mappingKeys'

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
            </div>
          ),
        }))}
      />
    </Modal>
  )
}
