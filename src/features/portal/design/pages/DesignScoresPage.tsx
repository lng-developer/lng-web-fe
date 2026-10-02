import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  CheckCircleOutlined,
  EditOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  StopOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tooltip,
  Typography,
} from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  DateRangePicker,
  type DateRangeValue,
  EmployeeAvatar,
  FormattedDateTime,
  MetricCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  type DesignScoreLevel,
  type DesignSubmissionScore,
  overrideDesignScore,
  voidDesignScore,
} from '../api/designApi'
import { designKeys } from '../api/designKeys'
import { useDesignAssigneesQuery, useDesignScoresQuery, useDesignScoreSummaryQuery } from '../hooks'
import styles from './DesignScoresPage.module.scss'

const { Text } = Typography

const SCORE_LEVELS: DesignScoreLevel[] = ['STANDARD', 'HARD']
const SCORE_STATUSES = ['ACTIVE', 'VOIDED', 'ALL'] as const

function getScoreStatusTone(status: string): 'operational' | 'cancelled' {
  return status === 'ACTIVE' ? 'operational' : 'cancelled'
}

function getLevelTone(level: DesignScoreLevel): 'warning' | 'ready' {
  return level === 'HARD' ? 'warning' : 'ready'
}

function formatEnumLabel(val: string): string {
  return val
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

type OverrideState = { score: DesignSubmissionScore }
type VoidState = { score: DesignSubmissionScore; reason: string }

export function DesignScoresPage({ account: accountProp }: { readonly account?: CurrentAccount }) {
  const { t } = useTranslation()
  const loaded = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const account = accountProp ?? loaded
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const permissions = useMemo(
    () =>
      new Set([
        ...(account?.permissions ?? []),
        ...(account?.scopes ?? []).flatMap(({ permissions: perms }) => perms),
      ]),
    [account?.permissions, account?.scopes],
  )
  const canAdjust = permissions.has('DESIGN:REVIEW') || permissions.has('DESIGN:WRITE')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [designerId, setDesignerId] = useState<string>()
  const [scoreLevel, setScoreLevel] = useState<DesignScoreLevel>()
  const [scoreStatus, setScoreStatus] = useState<'ACTIVE' | 'VOIDED' | 'ALL'>('ACTIVE')
  const [dates, setDates] = useState<DateRangeValue>({})

  const [overrideState, setOverrideState] = useState<OverrideState>()
  const [voidState, setVoidState] = useState<VoidState>()
  const [overrideForm] = Form.useForm()
  const overrideWasOpen = useRef(false)

  // Keep overrideForm in sync with selected score
  useEffect(() => {
    if (overrideState) {
      overrideForm.setFieldsValue({
        points: overrideState.score.finalPoints,
        scoreLevel: overrideState.score.scoreLevel,
      })
      if (!overrideWasOpen.current) overrideForm.setFieldValue('overrideReason', '')
      overrideWasOpen.current = true
    } else {
      overrideWasOpen.current = false
    }
  }, [overrideForm, overrideState])

  const queryParams = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      search: deferredSearch || undefined,
      designerId,
      scoreLevel,
      scoreStatus,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
    }),
    [page, deferredSearch, designerId, scoreLevel, scoreStatus, dates.dateFrom, dates.dateTo],
  )

  const summaryParams = useMemo(
    () => ({
      search: deferredSearch || undefined,
      designerId,
      scoreLevel,
      scoreStatus,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
    }),
    [deferredSearch, designerId, scoreLevel, scoreStatus, dates.dateFrom, dates.dateTo],
  )

  const scoresQuery = useDesignScoresQuery(queryParams)
  const summaryQuery = useDesignScoreSummaryQuery(summaryParams)
  const assigneesQuery = useDesignAssigneesQuery()

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: designKeys.all })
  }, [queryClient])

  const overrideMutation = useMutation({
    mutationFn: (input: {
      scoreId: string
      points: number
      scoreLevel?: DesignScoreLevel
      overrideReason: string
    }) =>
      overrideDesignScore(input.scoreId, {
        points: input.points,
        scoreLevel: input.scoreLevel,
        overrideReason: input.overrideReason,
      }),
    onSuccess: () => {
      toast(
        'success',
        t('portal.design.scores.overrideSuccess', { defaultValue: 'Score adjusted' }),
      )
      setOverrideState(undefined)
      invalidate()
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : t('portal.design.scores.actionFailed', { defaultValue: 'Action failed' })
      toast('error', msg)
    },
  })

  const voidMutation = useMutation({
    mutationFn: (input: {
      taskId: string
      submissionId: string
      assetId: string
      voidReason: string
    }) => voidDesignScore(input.taskId, input.submissionId, input.assetId, input.voidReason),
    onSuccess: () => {
      toast('success', t('portal.design.scores.voidSuccess', { defaultValue: 'Score voided' }))
      setVoidState(undefined)
      invalidate()
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : t('portal.design.scores.actionFailed', { defaultValue: 'Action failed' })
      toast('error', msg)
    },
  })

  const assigneeOptions = useMemo(
    () =>
      (assigneesQuery.data ?? []).map((a) => ({
        value: a.id,
        label: a.fullName,
      })),
    [assigneesQuery.data],
  )

  const columns = useMemo<TableColumnsType<DesignSubmissionScore>>(
    () => [
      {
        title: t('portal.design.scores.designer', { defaultValue: 'Designer' }),
        key: 'designer',
        width: 190,
        render: (_, row) =>
          row.designerName ? (
            <Space size={6}>
              <EmployeeAvatar name={row.designerName} size="small" />
              <div>
                <Text strong style={{ display: 'block', lineHeight: 1.3 }}>
                  {row.designerName}
                </Text>
                {row.designerTeam ? (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {row.designerTeam}
                  </Text>
                ) : null}
              </div>
            </Space>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
      {
        title: t('portal.design.taskType', { defaultValue: 'Task type' }),
        key: 'taskType',
        width: 130,
        render: (_, row) => (
          <Text>
            {t(`portal.design.taskTypes.${row.taskType}`, {
              defaultValue: formatEnumLabel(row.taskType),
            })}
          </Text>
        ),
      },
      {
        title: t('portal.design.shop', { defaultValue: 'Shop' }),
        key: 'shop',
        width: 120,
        render: (_, row) => <Text>{row.shopName || '-'}</Text>,
      },
      {
        title: t('portal.design.scoreLevel', { defaultValue: 'Level' }),
        key: 'scoreLevel',
        width: 100,
        render: (_, row) => (
          <StatusTag status={getLevelTone(row.scoreLevel)}>
            {t(`portal.design.scoreLevels.${row.scoreLevel}`, {
              defaultValue: formatEnumLabel(row.scoreLevel),
            })}
          </StatusTag>
        ),
      },
      {
        title: t('portal.design.basePoints', { defaultValue: 'Base pts' }),
        key: 'basePoints',
        width: 90,
        render: (_, row) => <Text type="secondary">{row.basePoints}</Text>,
      },
      {
        title: t('portal.design.finalPoints', { defaultValue: 'Final pts' }),
        key: 'finalPoints',
        width: 90,
        render: (_, row) => (
          <Text
            strong
            style={{ color: row.finalPoints !== row.basePoints ? '#1677ff' : undefined }}
          >
            {row.finalPoints}
          </Text>
        ),
      },
      {
        title: t('portal.design.scoreStatus', { defaultValue: 'Status' }),
        key: 'status',
        width: 100,
        render: (_, row) => (
          <StatusTag status={getScoreStatusTone(row.status)}>
            {t(`portal.design.scoreStatuses.${row.status}`, {
              defaultValue: formatEnumLabel(row.status),
            })}
          </StatusTag>
        ),
      },
      {
        title: t('portal.design.scoredAt', { defaultValue: 'Scored at' }),
        key: 'scoredAt',
        width: 155,
        render: (_, row) => <FormattedDateTime value={row.scoredAt} />,
      },
      ...(canAdjust
        ? [
            {
              title: t('common.actions', { defaultValue: 'Actions' }),
              key: 'actions',
              width: 100,
              render: (_: unknown, row: DesignSubmissionScore) =>
                row.status === 'ACTIVE' ? (
                  <Space size={4}>
                    <Tooltip
                      title={t('portal.design.overrideScore', { defaultValue: 'Override score' })}
                    >
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOverrideState({ score: row })
                        }}
                      />
                    </Tooltip>
                    <Tooltip title={t('portal.design.voidScore', { defaultValue: 'Void score' })}>
                      <Popconfirm
                        title={t('portal.design.voidScore', { defaultValue: 'Void score' })}
                        description={
                          <Input.TextArea
                            rows={3}
                            placeholder={t('portal.design.voidReason', {
                              defaultValue: 'Void reason (required)',
                            })}
                            onChange={(e) => setVoidState({ score: row, reason: e.target.value })}
                          />
                        }
                        onConfirm={() => {
                          if (!voidState?.reason?.trim()) {
                            toast(
                              'error',
                              t('portal.design.scores.voidReasonRequired', {
                                defaultValue: 'Void reason is required',
                              }),
                            )
                            return
                          }
                          voidMutation.mutate({
                            taskId: row.taskId,
                            submissionId: row.submissionId,
                            assetId: row.assetId,
                            voidReason: voidState.reason,
                          })
                        }}
                        okText={t('portal.design.voidScore', { defaultValue: 'Void' })}
                        okButtonProps={{ danger: true, loading: voidMutation.isPending }}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<StopOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            setVoidState({ score: row, reason: '' })
                          }}
                        />
                      </Popconfirm>
                    </Tooltip>
                  </Space>
                ) : null,
            },
          ]
        : []),
    ],
    [canAdjust, t, toast, voidMutation, voidState],
  )

  const scores = scoresQuery.data?.items ?? []
  const total = scoresQuery.data?.total ?? 0
  const summary = summaryQuery.data

  const topDesigners = useMemo(() => (summary?.byDesigner ?? []).slice(0, 5), [summary?.byDesigner])

  return (
    <section className={styles.page}>
      {/* Metric Cards */}
      <div className={styles.metrics}>
        <MetricCard
          icon={<TrophyOutlined />}
          variant="primary"
          label={t('portal.design.scores.totalPoints', { defaultValue: 'Total points' })}
          value={summary?.totalPoints ?? 0}
          loading={summaryQuery.isLoading}
        />
        <MetricCard
          icon={<FileDoneOutlined />}
          variant="neutral"
          label={t('portal.design.scores.totalFiles', { defaultValue: 'Scored files' })}
          value={summary?.totalFiles ?? 0}
          loading={summaryQuery.isLoading}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          variant="success"
          label={t('portal.design.scores.totalScores', { defaultValue: 'Total scores' })}
          value={summary?.total ?? 0}
          loading={summaryQuery.isLoading}
        />
      </div>

      {/* Top designers leaderboard */}
      {topDesigners.length > 0 ? (
        <div className={styles.leaderboardCard}>
          <span className={styles.leaderboardTitle}>
            <TrophyOutlined style={{ color: '#faad14' }} />
            {t('portal.design.scores.topDesigners', { defaultValue: 'Top designers' })}:
          </span>
          <div className={styles.leaderboardList}>
            {topDesigners.map((d, idx) => (
              <span key={d._id || idx} className={styles.leaderboardChip}>
                <span className={styles.rank}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </span>
                <span className={styles.name}>{d.designerName || d._id}</span>
                <span className={styles.pts}>
                  {t('portal.design.scores.pts', {
                    count: d.totalPoints,
                    defaultValue: '{{count}} pts',
                  })}
                </span>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  (
                  {t('portal.design.scores.files', {
                    count: d.totalFiles,
                    defaultValue: '{{count}} files',
                  })}
                  )
                </Typography.Text>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <Input
          allowClear
          className={styles.search}
          placeholder={t('common.search', { defaultValue: 'Search designer / task...' })}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <Select
          allowClear
          className={styles.designerFilter}
          placeholder={t('portal.design.allDesigners', { defaultValue: 'All designers' })}
          value={designerId}
          onChange={(v) => {
            setDesignerId(v)
            setPage(1)
          }}
          loading={assigneesQuery.isLoading}
          options={assigneeOptions}
          showSearch
          optionFilterProp="label"
        />
        <Select
          allowClear
          className={styles.filter}
          placeholder={t('portal.design.scoreLevel', { defaultValue: 'Score level' })}
          value={scoreLevel}
          onChange={(v) => {
            setScoreLevel(v)
            setPage(1)
          }}
          options={SCORE_LEVELS.map((v) => ({
            value: v,
            label: t(`portal.design.scoreLevels.${v}`, { defaultValue: formatEnumLabel(v) }),
          }))}
        />
        <Select
          className={styles.filter}
          value={scoreStatus}
          onChange={(v) => {
            setScoreStatus(v)
            setPage(1)
          }}
          options={SCORE_STATUSES.map((v) => ({
            value: v,
            label: t(`portal.design.scoreStatuses.${v}`, { defaultValue: formatEnumLabel(v) }),
          }))}
        />
        <DateRangePicker
          allowClear
          value={dates}
          onChange={(val) => {
            setDates(val)
            setPage(1)
          }}
        />
        <Tooltip title={t('common.refresh', { defaultValue: 'Refresh' })}>
          <Button icon={<ReloadOutlined />} onClick={invalidate} loading={scoresQuery.isFetching} />
        </Tooltip>
      </div>

      {/* Table */}
      <div className={styles.tableArea}>
        <CoreDataTable
          rowKey="id"
          columns={columns}
          dataSource={scores}
          loading={scoresQuery.isLoading}
          pagination={{
            current: page,
            pageSize: DEFAULT_PAGE_SIZE,
            total,
            showSizeChanger: false,
            onChange: (p) => setPage(p),
          }}
          scroll={{ x: 1100 }}
        />
      </div>

      {/* Override modal */}
      <Modal
        open={Boolean(overrideState)}
        title={t('portal.design.overrideScore', { defaultValue: 'Override score' })}
        okText={t('portal.design.scores.confirm', { defaultValue: 'Confirm' })}
        confirmLoading={overrideMutation.isPending}
        onCancel={() => setOverrideState(undefined)}
        onOk={() =>
          void overrideForm
            .validateFields()
            .then(
              (values: {
                points: number
                scoreLevel?: DesignScoreLevel
                overrideReason: string
              }) => {
                if (!overrideState) return
                overrideMutation.mutate({
                  scoreId: overrideState.score.id,
                  points: values.points,
                  scoreLevel: values.scoreLevel,
                  overrideReason: values.overrideReason,
                })
              },
            )
        }
        destroyOnHidden
      >
        <Form form={overrideForm} layout="vertical">
          <Form.Item
            name="points"
            label={t('portal.design.finalPoints', { defaultValue: 'Points' })}
            rules={[{ required: true }, { type: 'number', min: 0 }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="scoreLevel"
            label={t('portal.design.scoreLevel', { defaultValue: 'Score level' })}
          >
            <Select
              options={SCORE_LEVELS.map((v) => ({
                value: v,
                label: t(`portal.design.scoreLevels.${v}`, { defaultValue: formatEnumLabel(v) }),
              }))}
              allowClear
            />
          </Form.Item>
          <Form.Item
            name="overrideReason"
            label={t('portal.design.overrideReason', { defaultValue: 'Override reason' })}
            rules={[{ required: true, whitespace: true }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}
