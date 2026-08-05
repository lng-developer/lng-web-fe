import { useTranslation } from 'react-i18next'
import { Descriptions, Timeline, Typography } from 'antd'

import { DetailDrawer, FeedbackAlert, LoadingState, StatusTag } from '@/shared/ui'

import type { WorkScoreDetail } from '../api/workScoreApi'

export function WorkScoreDetailDrawer({
  open,
  score,
  loading,
  error,
  onClose,
}: {
  readonly open: boolean
  readonly score?: WorkScoreDetail
  readonly loading: boolean
  readonly error: boolean
  readonly onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <DetailDrawer open={open} title={t('portal.workScores.detail')} onClose={onClose} width={640}>
      {loading ? <LoadingState variant="card" /> : null}
      {error ? <FeedbackAlert type="error" title={t('portal.workScores.unavailable')} /> : null}
      {score ? (
        <div className="grid gap-6">
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label={t('portal.workScores.columns.source')}>
              {score.sourceType}
            </Descriptions.Item>
            <Descriptions.Item label={t('portal.workScores.columns.worker')}>
              {score.workerName || score.workerId}
            </Descriptions.Item>
            <Descriptions.Item label={t('portal.workScores.fields.points')}>
              {score.finalPoints}
            </Descriptions.Item>
            <Descriptions.Item label={t('portal.workScores.columns.status')}>
              <StatusTag status={score.status === 'ACTIVE' ? 'operational' : 'cancelled'}>
                {score.status}
              </StatusTag>
            </Descriptions.Item>
            <Descriptions.Item label={t('portal.workScores.fields.context')}>
              <Typography.Text className="whitespace-pre-wrap break-all">
                {JSON.stringify(score.contextSnapshot, null, 2)}
              </Typography.Text>
            </Descriptions.Item>
          </Descriptions>
          <div>
            <Typography.Title level={5}>{t('portal.workScores.history')}</Typography.Title>
            <Timeline
              items={[...(score.adjustments || [])].reverse().map((item) => ({
                children: (
                  <div>
                    <Typography.Text strong>{item.type}</Typography.Text>
                    <div>{item.reason}</div>
                    <Typography.Text type="secondary">
                      {item.oldPoints} → {item.newPoints} ·{' '}
                      {new Date(item.adjustedAt).toLocaleString()}
                    </Typography.Text>
                  </div>
                ),
              }))}
            />
          </div>
        </div>
      ) : null}
    </DetailDrawer>
  )
}
