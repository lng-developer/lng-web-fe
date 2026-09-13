import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  AppstoreOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PictureOutlined,
  ScissorOutlined,
  SettingOutlined,
  StopOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Select, Space, Tooltip, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { ApiError } from '@/shared/api/apiError'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { AuthenticatedMediaImage, downloadMediaAsset } from '@/shared/media'
import {
  DateRangePicker,
  FeedbackAlert,
  FilterBar,
  MetricCard,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  getWorkScore,
  overrideWorkScore,
  voidWorkScore,
  type WorkScoreDetail,
  type WorkScoreLevel,
  type WorkScoreListItem,
  type WorkScoreSourceType,
} from '../api/workScoreApi'
import { workScoreKeys } from '../api/workScoreKeys'
import { useWorkScoreDetailQuery, useWorkScoresQuery, useWorkScoreSummaryQuery } from '../hooks'
import { WorkScoreAdjustmentModal } from './WorkScoreAdjustmentModal'
import { WorkScoreDetailDrawer } from './WorkScoreDetailDrawer'
import { WorkScoreRuleModal } from './WorkScoreRuleModal'
import styles from './WorkScoreWorkbenchPage.module.scss'

const RULE_SOURCE_TYPES: WorkScoreSourceType[] = ['DESIGN_SUBMISSION', 'PRODUCTION_SCALE']
const objectIdPattern = /^[a-f\d]{24}$/i
const defaultAssetPreview =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' rx='10' fill='%23f1f5f9'/><path d='M28 70h44M34 30h32v28H34z' fill='none' stroke='%2394a3b8' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'/></svg>"

function textOrNull(value: unknown) {
  const text = String(value || '').trim()
  return text && !objectIdPattern.test(text) ? text : null
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
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
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
      limit: DEFAULT_PAGE_SIZE,
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

  const rows = useWorkScoresQuery(params)
  const summary = useWorkScoreSummaryQuery(summaryParams)
  const detail = useWorkScoreDetailQuery(selectedId)

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
  const taskTypeLabel = useCallback(
    (value: string) => t(`portal.workScores.taskTypes.${value}`, { defaultValue: value }),
    [t],
  )
  const scaleDifficultyLabel = useCallback(
    (value: string) => t(`portal.workScores.scaleDifficulties.${value}`, { defaultValue: value }),
    [t],
  )

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
          const taskType = textOrNull(snapshot.taskType)
          const title =
            textOrNull(snapshot.slotLabel) ||
            textOrNull(snapshot.taskTitle) ||
            textOrNull(snapshot.fileName) ||
            taskType ||
            t(`portal.workScores.sources.${row.sourceType}`)
          const sku =
            textOrNull(snapshot.sku) ||
            textOrNull(snapshot.externalOrderId) ||
            textOrNull(snapshot.asin) ||
            title
          const listingImageUrl =
            textOrNull(snapshot.productImageUrl) ||
            textOrNull(snapshot.listingPreviewImageUrl) ||
            textOrNull(snapshot.mainListingImageUrl)
          const shouldUseListingImage =
            row.sourceType === 'DESIGN_SUBMISSION' && taskType === 'PSD_TEMPLATE'
          return (
            <div className={styles.assetCell}>
              {listingImageUrl && shouldUseListingImage ? (
                <img alt={title} className={styles.assetThumb} src={listingImageUrl} />
              ) : row.assetDownloadUrl && !shouldUseListingImage ? (
                <AuthenticatedMediaImage
                  downloadUrl={row.assetDownloadUrl}
                  alt={title}
                  className={styles.assetThumb}
                  fallback={listingImageUrl || defaultAssetPreview}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  alt={title}
                  className={styles.assetThumb}
                  src={listingImageUrl || defaultAssetPreview}
                />
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
        width: 190,
        render: (_, row) => {
          const snapshot = row.contextSnapshot ?? {}
          const subtype =
            row.sourceType === 'DESIGN_SUBMISSION'
              ? snapshot.taskType
              : snapshot.scaleDifficultyLevel
          return (
            <Space direction="vertical" size={2}>
              <StatusTag status={row.sourceType === 'DESIGN_SUBMISSION' ? 'processing' : 'ready'}>
                {t(`portal.workScores.sources.${row.sourceType}`)}
              </StatusTag>
              {subtype ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {row.sourceType === 'DESIGN_SUBMISSION'
                    ? taskTypeLabel(String(subtype))
                    : scaleDifficultyLabel(String(subtype))}
                </Typography.Text>
              ) : null}
            </Space>
          )
        },
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
        title: t('portal.workScores.columns.points'),
        width: 110,
        render: (_, row) => (
          <Typography.Text
            strong
            style={{ color: row.finalPoints !== row.basePoints ? '#1677ff' : undefined }}
          >
            {row.finalPoints}{' '}
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {t('portal.workScores.units.basePoints', { count: row.basePoints })}
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
    [canAdjust, openAction, scaleDifficultyLabel, t, taskTypeLabel],
  )

  const designFiles = summary.data?.bySourceType?.find((item) => item._id === 'DESIGN_SUBMISSION')
  const scaleFiles = summary.data?.bySourceType?.find((item) => item._id === 'PRODUCTION_SCALE')
  const topWorkers = useMemo(
    () => (summary.data?.byWorker ?? []).slice(0, 5),
    [summary.data?.byWorker],
  )

  return (
    <section className={styles.page}>
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
            {t('portal.workScores.topWorkers')}:
          </span>
          <div className={styles.leaderboardList}>
            {topWorkers.map((w, idx) => (
              <span key={w._id || idx} className={styles.leaderboardChip}>
                <span className={styles.rank}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </span>
                <span className={styles.name}>{w.workerName || w._id}</span>
                <span className={styles.pts}>
                  {t('portal.workScores.units.points', { count: w.totalPoints })}
                </span>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  ({t('portal.workScores.units.files', { count: w.totalFiles })})
                </Typography.Text>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.controlsBar}>
        <div className={styles.filtersWrapper}>
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
              options={RULE_SOURCE_TYPES.map((value) => ({
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
        </div>
        {canAdjust ? (
          <div className={styles.actionsWrapper}>
            <Button
              aria-label={t('portal.workScores.rules.title')}
              icon={<SettingOutlined />}
              onClick={() => setRuleModalOpen(true)}
            >
              {t('portal.workScores.rules.title')}
            </Button>
          </div>
        ) : null}
      </div>

      <SectionCard className={styles.tableCard}>
        <CoreDataTable
          fillViewport
          rowKey="id"
          columns={columns}
          dataSource={rows.data?.items ?? []}
          loading={rows.isLoading}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
          pagination={{
            current: page,
            pageSize: DEFAULT_PAGE_SIZE,
            total: rows.data?.total,
            onChange: setPage,
          }}
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

      {canAdjust ? (
        <WorkScoreRuleModal open={ruleModalOpen} onClose={() => setRuleModalOpen(false)} />
      ) : null}
    </section>
  )
}

export default WorkScoreWorkbenchPage
