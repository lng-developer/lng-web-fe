import { useTranslation } from 'react-i18next'
import {
  ApartmentOutlined,
  BlockOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  FieldStringOutlined,
  ReloadOutlined,
  ScissorOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Flex,
  List,
  Space,
  Steps,
  Tag,
  Tooltip,
  Typography,
} from 'antd'

import { EmptyState, SearchInput, StatusTag } from '@/shared/ui'

import type { MappingTraceView } from '../model/mappingModel'
import { PIPELINE_STAGES } from '../model/mappingModel'
import styles from '../pages/MappingWorkspacePage.module.scss'

const STAGE_ICONS: Record<string, React.ReactNode> = {
  SKU_CLEANUP: <ScissorOutlined />,
  PRODUCT_MAPPING: <BlockOutlined />,
  INPUT_SEMANTICS: <FieldStringOutlined />,
  VALUE_ALIASES: <ApartmentOutlined />,
  VENDOR_ROUTING: <BranchesOutlined />,
}

const STAGE_LABELS: Record<string, string> = {
  SKU_CLEANUP: 'SKU Cleanup',
  PRODUCT_MAPPING: 'Product Map',
  INPUT_SEMANTICS: 'Semantics',
  VALUE_ALIASES: 'Aliases',
  VENDOR_ROUTING: 'Routing',
}

const formatMoney = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100)

function getStepStatus(
  stage: string,
  blockedStage: string | undefined,
  ready: boolean,
): 'finish' | 'error' | 'process' | 'wait' {
  const stageIdx = PIPELINE_STAGES.indexOf(stage as (typeof PIPELINE_STAGES)[number])
  const blockedIdx = blockedStage
    ? PIPELINE_STAGES.indexOf(blockedStage as (typeof PIPELINE_STAGES)[number])
    : -1

  if (blockedIdx === -1) return ready ? 'finish' : 'finish'
  if (stageIdx < blockedIdx) return 'finish'
  if (stageIdx === blockedIdx) return 'error'
  return 'wait'
}

export function LiveTracePanel({
  canWrite,
  loading,
  trace,
  selectingCandidateId,
  onRecheck,
  onResolve,
  candidateSearch,
  onCandidateSearchChange,
  onSelectCandidate,
}: {
  readonly canWrite: boolean
  readonly loading?: boolean
  readonly trace?: MappingTraceView
  readonly selectingCandidateId?: string
  readonly candidateSearch?: string
  readonly onRecheck: () => void
  readonly onResolve: () => void
  readonly onCandidateSearchChange: (value: string) => void
  readonly onSelectCandidate: (candidateId: string, productId: string) => void
}) {
  const { t } = useTranslation()
  if (!trace) return <EmptyState title={t('mapping.states.selectContext')} />

  // Determine blocked stage from blocking reasons heuristics
  const blockedStageGuess = !trace.ready
    ? trace.blockingReasons.some((r) => r.includes('VENDOR'))
      ? 'VENDOR_ROUTING'
      : trace.blockingReasons.some((r) => r.includes('SEMANTIC') || r.includes('VALUE'))
        ? 'INPUT_SEMANTICS'
        : trace.blockingReasons.some((r) => r.includes('SKU_CONFIG') || r.includes('LISTING'))
          ? 'PRODUCT_MAPPING'
          : undefined
    : undefined

  const stepItems = PIPELINE_STAGES.map((stage) => ({
    title: STAGE_LABELS[stage],
    icon: STAGE_ICONS[stage],
    status: getStepStatus(stage, blockedStageGuess, trace.ready),
  }))

  return (
    <Flex vertical gap={0} style={{ height: '100%', minHeight: 0 }}>
      {/* Header row: status badge + action buttons */}
      <div className={styles.traceHeader}>
        <StatusTag status={trace.ready ? 'ready' : 'warning'}>
          {t(trace.ready ? 'mapping.states.ready' : 'mapping.states.blocked')}
        </StatusTag>
        {canWrite ? (
          <Space size={6}>
            <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={onRecheck}>
              {t('mapping.actions.recheck')}
            </Button>
            <Button
              size="small"
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

      {/* Pipeline progress steps */}
      <div className={styles.pipelineSteps}>
        <Steps size="small" items={stepItems} style={{ fontSize: 11 }} />
      </div>

      {/* Scrollable content */}
      <div className={styles.traceScroll}>
        {/* Blocking reasons */}
        {trace.blockingReasons.length > 0 ? (
          <Alert
            type="warning"
            style={{ marginBottom: 14 }}
            message={
              <Flex wrap gap={6}>
                {trace.blockingReasons.map((r) => (
                  <Tag key={r} color="orange" style={{ margin: 0 }}>
                    {r.replace(/_/g, ' ')}
                  </Tag>
                ))}
              </Flex>
            }
          />
        ) : null}

        {/* SKU info */}
        <Descriptions
          size="small"
          column={2}
          style={{ marginBottom: 4 }}
          items={[
            {
              key: 'original',
              label: 'Original SKU',
              children: <Typography.Text code>{trace.originalSku}</Typography.Text>,
            },
            {
              key: 'canonical',
              label: 'Canonical SKU',
              children: <Typography.Text code>{trace.canonicalSku}</Typography.Text>,
            },
            {
              key: 'config',
              label: 'Config Code',
              children: trace.configCode !== '—' ? <Tag>{trace.configCode}</Tag> : '—',
            },
          ]}
        />

        {/* Normalized Inputs */}
        <Divider plain style={{ fontSize: 12, margin: '10px 0 8px' }}>
          {t('mapping.sections.normalizedInputs')}
        </Divider>
        <List
          size="small"
          dataSource={trace.normalizedInputs}
          locale={{ emptyText: '—' }}
          style={{ marginBottom: 8 }}
          renderItem={(input) => (
            <List.Item style={{ padding: '4px 0' }}>
              <Flex align="center" gap={8} style={{ width: '100%' }}>
                <Tag color="geekblue" style={{ margin: 0, flexShrink: 0 }}>
                  {input.semanticRole || input.originalLabel || input.label || 'OTHER'}
                </Tag>
                <Typography.Text strong style={{ flex: 1 }}>
                  {input.normalizedValue || input.rawValue || '—'}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {input.source || ''}
                </Typography.Text>
              </Flex>
            </List.Item>
          )}
        />

        {/* Vendor Candidates */}
        <Divider plain style={{ fontSize: 12, margin: '10px 0 8px' }}>
          {t('mapping.sections.candidates')}
        </Divider>
        {canWrite ? (
          <div style={{ marginBottom: 10 }}>
            <SearchInput
              aria-label={t('mapping.filters.searchCandidates')}
              placeholder={t('mapping.filters.searchCandidates')}
              value={candidateSearch}
              onSearchChange={onCandidateSearchChange}
            />
          </div>
        ) : null}

        {trace.candidates.map((candidate) => {
          const isAuto = trace.autoMatch?.vendorCostCenterId === candidate.vendorCostCenterId
          const confidence = candidate.confidence?.toUpperCase() as
            | 'HIGH'
            | 'MEDIUM'
            | 'LOW'
            | undefined
          return (
            <div
              key={candidate.vendorCostCenterId}
              className={`${styles.candidateCard} ${isAuto ? styles.autoMatch : ''}`}
            >
              <div className={styles.candidateMeta}>
                <div className={styles.candidateName}>
                  {candidate.vendorProductName ||
                    candidate.vendorCostCenterCode ||
                    candidate.vendorCostCenterId}
                </div>
                <div className={styles.candidateDetail}>
                  {[candidate.vendorName, candidate.size, candidate.color]
                    .filter(Boolean)
                    .join(' · ')}
                  {candidate.baseCostAmount != null ? (
                    <span style={{ marginLeft: 6, color: 'var(--ant-color-success)' }}>
                      {formatMoney(candidate.baseCostAmount, candidate.currency || 'USD')}
                    </span>
                  ) : null}
                </div>
              </div>

              {confidence ? (
                <span className={`${styles.confidenceBadge} ${styles[confidence]}`}>
                  {confidence}
                </span>
              ) : null}

              {isAuto ? (
                <Tooltip title="Auto-matched">
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                </Tooltip>
              ) : null}

              {canWrite ? (
                <Button
                  size="small"
                  type={isAuto ? 'primary' : 'default'}
                  loading={selectingCandidateId === candidate.vendorCostCenterId}
                  onClick={() =>
                    onSelectCandidate(candidate.vendorCostCenterId, candidate.vendorProductId)
                  }
                >
                  {t('mapping.actions.select')}
                </Button>
              ) : null}
            </div>
          )
        })}

        {trace.candidates.length === 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('mapping.states.noCandidates', { defaultValue: 'No vendor candidates found.' })}
          </Typography.Text>
        ) : null}
      </div>
    </Flex>
  )
}
