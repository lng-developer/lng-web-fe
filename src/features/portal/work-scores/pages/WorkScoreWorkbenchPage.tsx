import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  AppstoreOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileImageOutlined,
  PictureOutlined,
  ReloadOutlined,
  ScissorOutlined,
  StopOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Select, Space, Tag, Tooltip, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { ApiError } from '@/shared/api/apiError'
import { AuthenticatedMediaImage, downloadMediaAsset } from '@/shared/media'
import {
  DataTable,
  DateRangePicker,
  FeedbackAlert,
  FilterBar,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  getWorkScore,
  getWorkScoreSummary,
  listWorkScores,
  overrideWorkScore,
  voidWorkScore,
  type WorkScoreDetail,
  type WorkScoreLevel,
  type WorkScoreListItem,
  type WorkScoreSourceType,
} from '../api/workScoreApi'
import { workScoreKeys } from '../api/workScoreKeys'
import { WorkScoreAdjustmentModal } from './WorkScoreAdjustmentModal'
import { WorkScoreDetailDrawer } from './WorkScoreDetailDrawer'
import styles from './WorkScoreWorkbenchPage.module.scss'

const PAGE_SIZE = 20

const LEVEL_COLOR_MAP: Record<WorkScoreLevel, string> = {
  BASIC: 'blue',
  STANDARD: 'cyan',
  HARD: 'orange',
  BONUS: 'purple',
}

export function WorkScoreWorkbenchPage({
  account: accountProp,
}: {
  readonly account?: CurrentAccount
}) {
  const { t } = useTranslation()
  const loaded = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const account = accountProp ?? loaded
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [sourceType, setSourceType] = useState<WorkScoreSourceType>()
  const [scoreStatus, setScoreStatus] = useState<'ACTIVE' | 'VOIDED' | 'ALL'>('ACTIVE')
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const [selectedId, setSelectedId] = useState<string>()
  const [adjustment, setAdjustment] = useState<{
    mode: 'override' | 'void'
    score: WorkScoreDetail
  }>()

  const permissions = useMemo(
    () =>
      account
        ? [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)]
        : [],
    [account],
  )
  const canAdjust = permissions.includes('WORK_SCORES:ADJUST')

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: deferredSearch || undefined,
      sourceType,
      scoreStatus,
      ...dates,
    }),
    [page, deferredSearch, sourceType, scoreStatus, dates],
  )

  const summaryParams = useMemo(
    () => ({
      search: deferredSearch || undefined,
      sourceType,
      scoreStatus,
      ...dates,
    }),
    [deferredSearch, sourceType, scoreStatus, dates],
  )

  const rows = useQuery({
    queryKey: workScoreKeys.list(params),
    queryFn: () => listWorkScores(params),
    retry: false,
  })
  const summary = useQuery({
    queryKey: workScoreKeys.summary(summaryParams),
    queryFn: () => getWorkScoreSummary(summaryParams),
    retry: false,
  })
  const detail = useQuery({
    queryKey: workScoreKeys.detail(selectedId ?? ''),
    queryFn: () => getWorkScore(selectedId!),
    enabled: Boolean(selectedId),
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: async (input: {
      points?: number
      scoreLevel?: WorkScoreDetail['scoreLevel']
      reason: string
      expectedVersion: number
      targetId?: string
    }) => {
      const targetId = input.targetId ?? adjustment?.score.id
      const isVoid = input.points === undefined && !input.scoreLevel
      if (!targetId) throw new Error(t('portal.workScores.actionFailed'))

      if (isVoid) {
        return voidWorkScore(targetId, {
          reason: input.reason,
          expectedVersion: input.expectedVersion,
        })
      }
      return overrideWorkScore(targetId, {
        points: input.points!,
        scoreLevel: input.scoreLevel,
        reason: input.reason,
        expectedVersion: input.expectedVersion,
      })
    },
    onSuccess: async () => {
      setAdjustment(undefined)
      await queryClient.invalidateQueries({ queryKey: workScoreKeys.all })
      toast('success', t('portal.workScores.updated'))
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409 && adjustment) {
        const freshScore = await queryClient.fetchQuery({
          queryKey: workScoreKeys.detail(adjustment.score.id),
          queryFn: () => getWorkScore(adjustment.score.id),
        })
        setAdjustment((current) => (current ? { ...current, score: freshScore } : current))
      }
      toast('error', error instanceof Error ? error.message : t('portal.workScores.actionFailed'))
    },
  })

  const openAction = useCallback((mode: 'override' | 'void', score: WorkScoreDetail) => {
    setSelectedId(undefined)
    setAdjustment({ mode, score })
  }, [])

  const handleDrawerOverride = useCallback(
    async (input: {
      points: number
      scoreLevel?: WorkScoreLevel
      reason: string
      expectedVersion: number
    }) => {
      if (!detail.data) return
      await mutation.mutateAsync({
        targetId: detail.data.id,
        points: input.points,
        scoreLevel: input.scoreLevel,
        reason: input.reason,
        expectedVersion: input.expectedVersion,
      })
    },
    [detail.data, mutation],
  )

  const handleDrawerVoid = useCallback(
    async (input: { reason: string; expectedVersion: number }) => {
      if (!detail.data) return
      await mutation.mutateAsync({
        targetId: detail.data.id,
        reason: input.reason,
        expectedVersion: input.expectedVersion,
      })
    },
    [detail.data, mutation],
  )

  const columns = useMemo<TableColumnsType<WorkScoreListItem>>(
    () => [
      {
        title: t('portal.workScores.columns.asset', { defaultValue: 'Asset' }),
        width: 220,
        render: (_, row) => {
          const snapshot = row.contextSnapshot ?? {}
          const sku = String(snapshot.sku || snapshot.externalOrderId || row.sourceTaskId)
          const title = String(
            snapshot.slotLabel || snapshot.taskTitle || snapshot.fileName || row.sourceUnitId,
          )
          return (
            <div className={styles.assetCell}>
              {row.assetDownloadUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={row.assetDownloadUrl}
                  alt={title}
                  className={styles.assetThumb}
                  fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23666'><rect width='100' height='100'/></svg>"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className={styles.assetThumb}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FileImageOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />
                </div>
              )}
              <div className={styles.assetMeta}>
                <Typography.Text className={styles.assetName} title={sku}>
                  {sku}
                </Typography.Text>
                <Typography.Text className={styles.assetSub} title={title}>
                  {title}
                </Typography.Text>
              </div>
            </div>
          )
        },
      },
      {
        title: t('portal.workScores.columns.source'),
        dataIndex: 'sourceType',
        width: 160,
        render: (value) => (
          <StatusTag status={value === 'DESIGN_SUBMISSION' ? 'processing' : 'ready'}>
            {t(`portal.workScores.sources.${value}`)}
          </StatusTag>
        ),
      },
      {
        title: t('portal.workScores.columns.worker'),
        render: (_, row) => (
          <Typography.Text strong style={{ fontSize: 13 }}>
            {row.workerName || row.workerId}
          </Typography.Text>
        ),
      },
      {
        title: t('portal.workScores.columns.level'),
        dataIndex: 'scoreLevel',
        width: 120,
        render: (level: WorkScoreLevel) => (
          <Tag color={LEVEL_COLOR_MAP[level] ?? 'blue'} style={{ fontWeight: 600 }}>
            {level}
          </Tag>
        ),
      },
      {
        title: t('portal.workScores.columns.points'),
        width: 110,
        render: (_, row) => (
          <Typography.Text
            strong
            style={{ color: row.finalPoints !== row.basePoints ? '#1677ff' : undefined }}
          >
            {row.finalPoints}{' '}
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              / {row.basePoints}pt
            </Typography.Text>
          </Typography.Text>
        ),
      },
      {
        title: t('portal.workScores.columns.status'),
        dataIndex: 'status',
        width: 100,
        render: (value) => (
          <StatusTag status={value === 'ACTIVE' ? 'operational' : 'cancelled'}>
            {t(`portal.workScores.statuses.${value}`)}
          </StatusTag>
        ),
      },
      {
        title: t('portal.workScores.columns.scoredAt'),
        dataIndex: 'scoredAt',
        width: 160,
        render: (value) => (value ? new Date(value).toLocaleString() : '-'),
      },
      {
        title: t('portal.workScores.columns.action'),
        width: 140,
        render: (_, row) => (
          <Space size={4}>
            <Tooltip title={t('portal.workScores.actions.view')}>
              <Button
                aria-label={t('portal.workScores.actions.view')}
                size="small"
                icon={<EyeOutlined />}
                onClick={(event) => {
                  event.stopPropagation()
                  setSelectedId(row.id)
                }}
              />
            </Tooltip>
            {row.assetDownloadUrl ? (
              <Tooltip title={t('portal.workScores.actions.download')}>
                <Button
                  aria-label={t('portal.workScores.actions.download')}
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={(event) => {
                    event.stopPropagation()
                    void downloadMediaAsset(row.assetDownloadUrl!)
                  }}
                />
              </Tooltip>
            ) : null}
            {canAdjust && row.status === 'ACTIVE' ? (
              <>
                <Tooltip title={t('portal.workScores.actions.override')}>
                  <Button
                    aria-label={t('portal.workScores.actions.override')}
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(event) => {
                      event.stopPropagation()
                      openAction('override', row)
                    }}
                  />
                </Tooltip>
                <Tooltip title={t('portal.workScores.actions.void')}>
                  <Button
                    danger
                    aria-label={t('portal.workScores.actions.void')}
                    size="small"
                    icon={<StopOutlined />}
                    onClick={(event) => {
                      event.stopPropagation()
                      openAction('void', row)
                    }}
                  />
                </Tooltip>
              </>
            ) : null}
          </Space>
        ),
      },
    ],
    [canAdjust, openAction, t],
  )

  const designFiles = summary.data?.bySourceType?.find((item) => item._id === 'DESIGN_SUBMISSION')
  const scaleFiles = summary.data?.bySourceType?.find((item) => item._id === 'PRODUCTION_SCALE')
  const topWorkers = useMemo(
    () => (summary.data?.byWorker ?? []).slice(0, 5),
    [summary.data?.byWorker],
  )

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.workScores.title')}
        description={t('portal.workScores.description')}
        actions={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void queryClient.invalidateQueries({ queryKey: workScoreKeys.all })}
          >
            {t('portal.workScores.refresh')}
          </Button>
        }
      />

      {rows.error || summary.error ? (
        <FeedbackAlert type="error" title={t('portal.workScores.unavailable')} />
      ) : null}

      {/* Synchronized Summary Metric Cards */}
      <div className={styles.metrics}>
        <MetricCard
          icon={<AppstoreOutlined />}
          variant="neutral"
          label={t('portal.workScores.metrics.totalFiles')}
          value={summary.data?.totalFiles ?? 0}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<TrophyOutlined />}
          variant="primary"
          label={t('portal.workScores.metrics.totalPoints')}
          value={summary.data?.totalPoints ?? 0}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<PictureOutlined />}
          variant="info"
          label={t('portal.workScores.metrics.designFiles')}
          value={designFiles?.totalFiles ?? 0}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<ScissorOutlined />}
          variant="success"
          label={t('portal.workScores.metrics.scaleFiles')}
          value={scaleFiles?.totalFiles ?? 0}
          loading={summary.isLoading}
        />
      </div>

      {/* Top Worker Performance Leaderboard Bar */}
      {topWorkers.length > 0 ? (
        <div className={styles.leaderboardCard}>
          <span className={styles.leaderboardTitle}>
            <TrophyOutlined style={{ color: '#faad14' }} />
            {t('portal.workScores.topWorkers', { defaultValue: 'Top Contributors' })}:
          </span>
          <div className={styles.leaderboardList}>
            {topWorkers.map((w, idx) => (
              <span key={w._id || idx} className={styles.leaderboardChip}>
                <span className={styles.rank}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </span>
                <span className={styles.name}>{w.workerName || w._id}</span>
                <span className={styles.pts}>{w.totalPoints} pts</span>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  ({w.totalFiles} files)
                </Typography.Text>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <SectionCard>
        <DataTable
          rowKey="id"
          columns={columns}
          dataSource={rows.data?.items ?? []}
          loading={rows.isLoading}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: rows.data?.total,
            onChange: setPage,
          }}
          toolbar={
            <FilterBar label={t('portal.workScores.filters')} contentClassName={styles.filters}>
              <Input.Search
                allowClear
                className={styles.search}
                placeholder={t('portal.workScores.search')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onSearch={() => setPage(1)}
              />
              <Select
                allowClear
                className={styles.filter}
                placeholder={t('portal.workScores.allSources')}
                value={sourceType}
                onChange={(value) => {
                  setSourceType(value)
                  setPage(1)
                }}
                options={['DESIGN_SUBMISSION', 'PRODUCTION_SCALE'].map((value) => ({
                  value,
                  label: t(`portal.workScores.sources.${value}`),
                }))}
              />
              <Select
                className={styles.filter}
                value={scoreStatus}
                onChange={(value) => {
                  setScoreStatus(value)
                  setPage(1)
                }}
                options={['ACTIVE', 'VOIDED', 'ALL'].map((value) => ({
                  value,
                  label: t(`portal.workScores.statuses.${value}`),
                }))}
              />
              <div className={styles.dates}>
                <DateRangePicker
                  onChange={(value) => {
                    setDates(value)
                    setPage(1)
                  }}
                />
              </div>
            </FilterBar>
          }
        />
      </SectionCard>

      <WorkScoreDetailDrawer
        open={Boolean(selectedId)}
        canAdjust={canAdjust}
        score={detail.data}
        loading={detail.isLoading}
        error={detail.isError}
        saving={mutation.isPending}
        onClose={() => setSelectedId(undefined)}
        onSubmitOverride={handleDrawerOverride}
        onSubmitVoid={handleDrawerVoid}
      />

      <WorkScoreAdjustmentModal
        open={Boolean(adjustment)}
        mode={adjustment?.mode ?? 'override'}
        score={adjustment?.score}
        loading={mutation.isPending}
        onClose={() => setAdjustment(undefined)}
        onSubmit={(input) => mutation.mutate(input)}
      />
    </section>
  )
}

export default WorkScoreWorkbenchPage
