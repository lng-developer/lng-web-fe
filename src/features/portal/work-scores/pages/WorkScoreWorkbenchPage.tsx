import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Select, Space, Tooltip, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { ApiError } from '@/shared/api/apiError'
import { downloadMediaAsset } from '@/shared/media'
import {
  DataTable,
  DateRangePicker,
  FeedbackAlert,
  FilterBar,
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
  type WorkScoreListItem,
  type WorkScoreSourceType,
} from '../api/workScoreApi'
import { workScoreKeys } from '../api/workScoreKeys'
import { WorkScoreAdjustmentModal } from './WorkScoreAdjustmentModal'
import { WorkScoreDetailDrawer } from './WorkScoreDetailDrawer'
import styles from './WorkScoreWorkbenchPage.module.scss'

const PAGE_SIZE = 20

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
  const [sourceType, setSourceType] = useState<WorkScoreSourceType>()
  const [scoreStatus, setScoreStatus] = useState<'ACTIVE' | 'VOIDED' | 'ALL'>('ACTIVE')
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const [selectedId, setSelectedId] = useState<string>()
  const [adjustment, setAdjustment] = useState<{
    mode: 'override' | 'void'
    score: WorkScoreDetail
  }>()
  const permissions = account
    ? [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)]
    : []
  const canAdjust = permissions.includes('WORK_SCORES:ADJUST')
  const params = {
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    sourceType,
    scoreStatus,
    ...dates,
  }
  const summaryParams = { search: params.search, sourceType, scoreStatus, ...dates }
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
    }) => {
      if (!adjustment) throw new Error(t('portal.workScores.actionFailed'))
      if (adjustment.mode === 'void')
        return voidWorkScore(adjustment.score.id, {
          reason: input.reason,
          expectedVersion: input.expectedVersion,
        })
      return overrideWorkScore(adjustment.score.id, {
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
  const openAction = (mode: 'override' | 'void', score: WorkScoreDetail) => {
    setSelectedId(undefined)
    setAdjustment({ mode, score })
  }
  const columns: TableColumnsType<WorkScoreListItem> = [
    {
      title: t('portal.workScores.columns.source'),
      dataIndex: 'sourceType',
      width: 170,
      render: (value) => (
        <StatusTag status={value === 'DESIGN_SUBMISSION' ? 'processing' : 'ready'}>
          {t(`portal.workScores.sources.${value}`)}
        </StatusTag>
      ),
    },
    {
      title: t('portal.workScores.columns.context'),
      render: (_, row) => (
        <>
          <Typography.Text>
            {String(
              row.contextSnapshot?.sku || row.contextSnapshot?.externalOrderId || row.sourceTaskId,
            )}
          </Typography.Text>
          <br />
          <Typography.Text type="secondary">
            {String(
              row.contextSnapshot?.slotLabel || row.contextSnapshot?.taskType || row.sourceUnitId,
            )}
          </Typography.Text>
        </>
      ),
    },
    {
      title: t('portal.workScores.columns.worker'),
      render: (_, row) => row.workerName || row.workerId,
    },
    {
      title: t('portal.workScores.columns.points'),
      width: 110,
      render: (_, row) => `${row.finalPoints} / ${row.basePoints}`,
    },
    { title: t('portal.workScores.columns.level'), dataIndex: 'scoreLevel', width: 110 },
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
      width: 170,
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      title: t('portal.workScores.columns.action'),
      width: 150,
      render: (_, row) => (
        <Space>
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
  ]
  const metrics = [
    ['totalFiles', summary.data?.totalFiles ?? 0],
    ['totalPoints', summary.data?.totalPoints ?? 0],
    [
      'designFiles',
      summary.data?.bySourceType?.find((item) => item._id === 'DESIGN_SUBMISSION')?.totalFiles ?? 0,
    ],
    [
      'scaleFiles',
      summary.data?.bySourceType?.find((item) => item._id === 'PRODUCTION_SCALE')?.totalFiles ?? 0,
    ],
  ] as const
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
      <div className={styles.metrics}>
        {metrics.map(([key, value]) => (
          <div className={styles.metric} key={key}>
            <Typography.Text type="secondary">
              {t(`portal.workScores.metrics.${key}`)}
            </Typography.Text>
            <Typography.Title level={3}>{value}</Typography.Title>
          </div>
        ))}
      </div>
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
        score={detail.data}
        loading={detail.isLoading}
        error={detail.isError}
        onClose={() => setSelectedId(undefined)}
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
