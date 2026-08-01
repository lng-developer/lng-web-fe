import { useTranslation } from 'react-i18next'
import { CheckCircleOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Button, Descriptions, Divider, List, Space, Typography } from 'antd'

import { EmptyState, FeedbackAlert, StatusTag } from '@/shared/ui'

import type { MappingTraceView } from '../model/mappingModel'

export function LiveTracePanel({
  canWrite,
  loading,
  trace,
  selectingCandidateId,
  onRecheck,
  onResolve,
  onSelectCandidate,
}: {
  readonly canWrite: boolean
  readonly loading?: boolean
  readonly trace?: MappingTraceView
  readonly selectingCandidateId?: string
  readonly onRecheck: () => void
  readonly onResolve: () => void
  readonly onSelectCandidate: (candidateId: string, productId: string) => void
}) {
  const { t } = useTranslation()
  if (!trace) return <EmptyState title={t('mapping.states.selectContext')} />

  return (
    <div className="min-h-0 overflow-auto">
      <div className="mb-3 flex items-center justify-between">
        <StatusTag status={trace.ready ? 'ready' : 'warning'}>
          {t(trace.ready ? 'mapping.states.ready' : 'mapping.states.blocked')}
        </StatusTag>
        {canWrite ? (
          <Space>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={onRecheck}>
              {t('mapping.actions.recheck')}
            </Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={loading}
              onClick={onResolve}
            >
              {t('mapping.actions.resolve')}
            </Button>
          </Space>
        ) : null}
      </div>
      {trace.blockingReasons.length ? (
        <FeedbackAlert type="warning" title={trace.blockingReasons.join(' · ')} />
      ) : null}
      <Descriptions
        size="small"
        column={2}
        items={[
          { key: 'original', label: 'Original SKU', children: trace.originalSku },
          { key: 'canonical', label: 'Canonical SKU', children: trace.canonicalSku },
          { key: 'config', label: 'Config code', children: trace.configCode },
        ]}
      />
      <Divider titlePlacement="start">{t('mapping.sections.normalizedInputs')}</Divider>
      <List
        size="small"
        dataSource={trace.normalizedInputs}
        locale={{ emptyText: '—' }}
        renderItem={(input) => (
          <List.Item>
            <Typography.Text strong>{input.semanticRole || input.label || 'OTHER'}</Typography.Text>
            <span>{input.normalizedValue || input.rawValue || '—'}</span>
            <Typography.Text type="secondary">{input.source || '—'}</Typography.Text>
          </List.Item>
        )}
      />
      <Divider titlePlacement="start">{t('mapping.sections.candidates')}</Divider>
      <List
        size="small"
        dataSource={trace.candidates}
        locale={{ emptyText: '—' }}
        renderItem={(candidate) => (
          <List.Item
            actions={
              canWrite
                ? [
                    <Button
                      key="select"
                      type={
                        trace.autoMatch?.vendorCostCenterId === candidate.vendorCostCenterId
                          ? 'primary'
                          : 'default'
                      }
                      icon={<CheckCircleOutlined />}
                      loading={selectingCandidateId === candidate.vendorCostCenterId}
                      onClick={() =>
                        onSelectCandidate(candidate.vendorCostCenterId, candidate.vendorProductId)
                      }
                    >
                      {t('mapping.actions.select')}
                    </Button>,
                  ]
                : undefined
            }
          >
            <List.Item.Meta
              title={
                candidate.vendorProductName ||
                candidate.vendorCostCenterCode ||
                candidate.vendorCostCenterId
              }
              description={`${candidate.vendorName || '—'} · ${candidate.size || '—'} · ${candidate.color || '—'} · ${candidate.confidence || '—'}`}
            />
          </List.Item>
        )}
      />
    </div>
  )
}
