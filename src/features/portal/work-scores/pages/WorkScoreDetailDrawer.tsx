/* eslint-disable react-hooks/set-state-in-effect -- drawer form state resets when the selected score changes */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckOutlined,
  DownloadOutlined,
  EditOutlined,
  FileImageOutlined,
  StopOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd'

import { AuthenticatedMediaImage } from '@/shared/media'
import { DetailDrawer, FeedbackAlert, LoadingState, StatusTag } from '@/shared/ui'

import type { WorkScoreDetail, WorkScoreLevel } from '../api/workScoreApi'
import styles from './WorkScoreWorkbenchPage.module.scss'

const LEVEL_CONFIG: Record<WorkScoreLevel, { points: number; color: string }> = {
  BASIC: { points: 5, color: 'blue' },
  STANDARD: { points: 10, color: 'cyan' },
  HARD: { points: 15, color: 'orange' },
  BONUS: { points: 20, color: 'purple' },
}

export function WorkScoreDetailDrawer({
  open,
  canAdjust,
  score,
  loading,
  error,
  saving,
  onClose,
  onSubmitOverride,
  onSubmitVoid,
}: {
  readonly open: boolean
  readonly canAdjust?: boolean
  readonly score?: WorkScoreDetail
  readonly loading: boolean
  readonly error: boolean
  readonly saving?: boolean
  readonly onClose: () => void
  readonly onSubmitOverride?: (input: {
    points: number
    scoreLevel?: WorkScoreLevel
    reason: string
    expectedVersion: number
  }) => Promise<void>
  readonly onSubmitVoid?: (input: { reason: string; expectedVersion: number }) => Promise<void>
}) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [activeLevel, setActiveLevel] = useState<WorkScoreLevel>()
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [showVoidForm, setShowVoidForm] = useState(false)

  useEffect(() => {
    if (score) {
      setActiveLevel(score.scoreLevel)
      form.setFieldsValue({
        points: score.finalPoints,
        scoreLevel: score.scoreLevel,
        reason: '',
      })
      setShowOverrideForm(false)
      setShowVoidForm(false)
    }
  }, [score, form])

  const handleLevelSelect = (level: WorkScoreLevel) => {
    setActiveLevel(level)
    const points = LEVEL_CONFIG[level].points
    form.setFieldsValue({ scoreLevel: level, points })
    setShowOverrideForm(true)
    setShowVoidForm(false)
  }

  const snapshot = score?.contextSnapshot ?? {}
  const canPreviewAsset = score?.sourceType === 'PRODUCTION_SCALE'
  const sku = String(snapshot.sku || snapshot.externalOrderId || '—')
  const rawTaskType = snapshot.taskType ? String(snapshot.taskType) : undefined
  const taskTitle = snapshot.taskTitle
    ? String(snapshot.taskTitle)
    : rawTaskType
      ? t(`portal.workScores.taskTypes.${rawTaskType}`, { defaultValue: rawTaskType })
      : String(score?.sourceTaskId || '—')
  const slotLabel = String(snapshot.slotLabel || snapshot.fileName || '—')

  return (
    <DetailDrawer
      open={open}
      title={
        <Flex align="center" gap={10}>
          <span>{t('portal.workScores.detail')}</span>
          {score?.status ? (
            <StatusTag status={score.status === 'ACTIVE' ? 'operational' : 'cancelled'}>
              {t(`portal.workScores.statuses.${score.status}`, { defaultValue: score.status })}
            </StatusTag>
          ) : null}
        </Flex>
      }
      onClose={onClose}
      width={680}
    >
      {loading ? <LoadingState variant="card" /> : null}
      {error ? <FeedbackAlert type="error" title={t('portal.workScores.unavailable')} /> : null}

      {score ? (
        <Flex vertical gap={16}>
          {/* Hero Asset Preview */}
          {score.assetDownloadUrl ? (
            <div
              style={{ textAlign: 'center', background: '#1f1f1f', borderRadius: 10, padding: 16 }}
            >
              {canPreviewAsset ? (
                <AuthenticatedMediaImage
                  downloadUrl={score.assetDownloadUrl}
                  alt={slotLabel}
                  className={styles.drawerPreview}
                  fallback="/favicon.svg"
                />
              ) : (
                <FileImageOutlined style={{ fontSize: 48, color: '#fff' }} />
              )}
              <Flex justify="center" gap={8} style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => window.open(score.assetDownloadUrl!, '_blank')}
                >
                  {t('portal.workScores.actions.download')}
                </Button>
              </Flex>
            </div>
          ) : (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                background: 'var(--ant-color-fill-quaternary)',
                borderRadius: 8,
              }}
            >
              <FileImageOutlined
                style={{ fontSize: 32, color: 'var(--ant-color-text-tertiary)' }}
              />
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                {t('portal.workScores.noAssetPreview', {
                  defaultValue: 'No asset preview available for this task',
                })}
              </Typography.Text>
            </div>
          )}

          {/* Structured Task Info */}
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label={t('portal.workScores.columns.source')}>
              <Tag color={score.sourceType === 'DESIGN_SUBMISSION' ? 'purple' : 'cyan'}>
                {t(`portal.workScores.sources.${score.sourceType}`, {
                  defaultValue: score.sourceType,
                })}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('portal.workScores.columns.worker')}>
              <Typography.Text strong>{score.workerName || score.workerId}</Typography.Text>
            </Descriptions.Item>

            <Descriptions.Item label={t('portal.workScores.fields.skuOrder')}>
              <Typography.Text code>{sku}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('portal.workScores.fields.taskSlot')}>
              {taskTitle} {slotLabel !== '—' ? `- ${slotLabel}` : ''}
            </Descriptions.Item>

            <Descriptions.Item label={t('portal.workScores.columns.level')}>
              <Tag color={LEVEL_CONFIG[score.scoreLevel]?.color ?? 'blue'}>
                {t(`portal.workScores.levels.${score.scoreLevel}`, {
                  defaultValue: score.scoreLevel,
                  points: score.basePoints,
                })}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('portal.workScores.fields.points')}>
              <Typography.Title level={4} style={{ margin: 0, color: 'var(--ant-color-primary)' }}>
                {score.finalPoints}
              </Typography.Title>
            </Descriptions.Item>

            <Descriptions.Item label={t('portal.workScores.columns.scoredAt')} span={2}>
              {score.scoredAt ? new Date(score.scoredAt).toLocaleString() : '—'}
            </Descriptions.Item>
          </Descriptions>

          {/* Manager Interactive Scoring / Override Box */}
          {canAdjust && score.status === 'ACTIVE' ? (
            <div className={styles.scoringBox}>
              <Flex justify="space-between" align="center">
                <Typography.Text strong style={{ fontSize: 13 }}>
                  <EditOutlined style={{ marginRight: 6 }} />
                  {t('portal.workScores.evalHeading', {
                    defaultValue: 'Evaluate & Adjust Work Score',
                  })}
                </Typography.Text>

                <Space size={6}>
                  <Button
                    size="small"
                    type={showOverrideForm ? 'primary' : 'default'}
                    onClick={() => {
                      setShowOverrideForm(!showOverrideForm)
                      setShowVoidForm(false)
                    }}
                  >
                    {t('portal.workScores.actions.override')}
                  </Button>
                  <Button
                    size="small"
                    danger
                    type={showVoidForm ? 'primary' : 'default'}
                    onClick={() => {
                      setShowVoidForm(!showVoidForm)
                      setShowOverrideForm(false)
                    }}
                  >
                    {t('portal.workScores.actions.void')}
                  </Button>
                </Space>
              </Flex>

              {/* Difficulty rating pills */}
              <div className={styles.levelButtons}>
                {(Object.keys(LEVEL_CONFIG) as WorkScoreLevel[]).map((level) => {
                  const cfg = LEVEL_CONFIG[level]
                  const isActive = activeLevel === level
                  return (
                    <button
                      key={level}
                      type="button"
                      className={`${styles.levelPill} ${isActive ? styles[`active${level}`] : ''}`}
                      onClick={() => handleLevelSelect(level)}
                    >
                      {isActive ? <CheckOutlined style={{ fontSize: 11 }} /> : null}
                      <span>
                        {t(`portal.workScores.levels.${level}`, {
                          defaultValue: level,
                          points: cfg.points,
                        })}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Inline Form */}
              {showOverrideForm || showVoidForm ? (
                <Form
                  form={form}
                  layout="vertical"
                  style={{ marginTop: 8 }}
                  onFinish={(values) => {
                    if (showVoidForm && onSubmitVoid) {
                      void onSubmitVoid({
                        reason: values.reason,
                        expectedVersion: score.version,
                      })
                    } else if (showOverrideForm && onSubmitOverride) {
                      void onSubmitOverride({
                        points: values.points,
                        scoreLevel: values.scoreLevel,
                        reason: values.reason,
                        expectedVersion: score.version,
                      })
                    }
                  }}
                >
                  {showOverrideForm ? (
                    <Flex gap={12}>
                      <Form.Item
                        name="points"
                        label={t('portal.workScores.fields.points')}
                        rules={[{ required: true }]}
                        style={{ width: 140 }}
                      >
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item
                        name="reason"
                        label={t('portal.workScores.fields.reason')}
                        rules={[{ required: true, min: 2, max: 500 }]}
                        style={{ flex: 1 }}
                      >
                        <Input
                          placeholder={t('portal.workScores.reasonPlaceholder', {
                            defaultValue: 'Enter audit reason for score adjustment...',
                          })}
                        />
                      </Form.Item>
                    </Flex>
                  ) : (
                    <Form.Item
                      name="reason"
                      label={t('portal.workScores.fields.reason')}
                      rules={[{ required: true, min: 2, max: 500 }]}
                    >
                      <Input.TextArea
                        placeholder={t('portal.workScores.voidReasonPlaceholder', {
                          defaultValue: 'Reason for voiding this work score...',
                        })}
                      />
                    </Form.Item>
                  )}

                  <Flex justify="end">
                    <Button
                      type="primary"
                      danger={showVoidForm}
                      htmlType="submit"
                      loading={saving}
                      icon={showVoidForm ? <StopOutlined /> : <CheckOutlined />}
                    >
                      {showVoidForm
                        ? t('portal.workScores.actions.confirmVoid', {
                            defaultValue: 'Confirm Void',
                          })
                        : t('portal.workScores.actions.saveOverride', {
                            defaultValue: 'Save Score Override',
                          })}
                    </Button>
                  </Flex>
                </Form>
              ) : null}
            </div>
          ) : null}

          {/* Adjustment History Timeline */}
          <div>
            <Divider plain style={{ fontSize: 13, margin: '8px 0 16px' }}>
              {t('portal.workScores.history')}
            </Divider>
            {score.adjustments && score.adjustments.length > 0 ? (
              <Timeline
                items={[...score.adjustments].reverse().map((item, idx) => ({
                  color: item.type === 'VOID' ? 'red' : 'blue',
                  children: (
                    <div key={idx}>
                      <Space size={8}>
                        <Tag color={item.type === 'VOID' ? 'red' : 'blue'}>
                          {t(`portal.workScores.adjustments.types.${item.type}`, {
                            defaultValue: item.type,
                          })}
                        </Tag>
                        <Typography.Text strong>
                          {t('portal.workScores.adjustments.pointsChange', {
                            oldPoints: item.oldPoints,
                            newPoints: item.newPoints,
                          })}
                        </Typography.Text>
                      </Space>
                      <Typography.Paragraph
                        type="secondary"
                        style={{ margin: '4px 0 0', fontSize: 12 }}
                      >
                        {item.reason} · {new Date(item.adjustedAt).toLocaleString()}
                      </Typography.Paragraph>
                    </div>
                  ),
                }))}
              />
            ) : (
              <Alert
                type="info"
                showIcon
                message={t('portal.workScores.noAdjustments', {
                  defaultValue: 'No manual score overrides or voids recorded.',
                })}
              />
            )}
          </div>
        </Flex>
      ) : null}
    </DetailDrawer>
  )
}
