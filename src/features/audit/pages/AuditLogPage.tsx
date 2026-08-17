import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Modal, Result, Select, Space, Typography } from 'antd'

import { getPermissions } from '@/shared/auth/session'
import {
  DataTable,
  DateRangePicker,
  FeedbackAlert,
  FilterBar,
  MetricCard,
  PageHeader,
  SearchInput,
  StatusTag,
} from '@/shared/ui'

import {
  type AuditEvent,
  type AuditFilters,
  exportAuditEventsCsv,
  getAuditEvent,
  listAuditEvents,
} from '../api/auditApi'
import styles from './AuditLogPage.module.scss'

const outcomeOptions = ['SUCCEEDED', 'FAILED'] as const
const sourceOptions = ['HTTP', 'WORKER', 'SYSTEM', 'IMPORT'] as const

const readableCode = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
const shortId = (value: string | null) => (value ? `#${value.slice(-8)}` : '')

export function AuditLogPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<AuditFilters>({})
  const [selected, setSelected] = useState<AuditEvent>()

  const query = useInfiniteQuery({
    queryKey: ['audit-events', filters],
    queryFn: ({ pageParam }) => listAuditEvents(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  const detail = useQuery({
    queryKey: ['audit-event', selected?.id],
    queryFn: () => getAuditEvent(selected!.id),
    enabled: Boolean(selected?.id),
    retry: false,
  })
  const exportCsv = useMutation({
    mutationFn: () => exportAuditEventsCsv(filters),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result)
      const link = document.createElement('a')
      link.href = url
      link.download = 'audit-events.csv'
      link.click()
      URL.revokeObjectURL(url)
    },
  })

  const events = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data])
  const event = detail.data ?? selected

  const totalCount = events.length
  const succeededCount = useMemo(
    () => events.filter((e) => e.outcome === 'SUCCEEDED').length,
    [events],
  )
  const failedCount = useMemo(() => events.filter((e) => e.outcome === 'FAILED').length, [events])

  if (!getPermissions().includes('AUDIT:READ')) return <Result status="403" title="403" />

  const columns: TableColumnsType<AuditEvent> = [
    {
      title: t('audit.columns.time'),
      dataIndex: 'createdAt',
      width: 170,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      title: t('audit.columns.actor'),
      render: (_, event) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>
            {event.actorLabel ?? String(event.actorSnapshot.email ?? event.actorType)}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {[event.actorEmployeeCode, event.actorEmail, shortId(event.actorAccountId)]
              .filter(Boolean)
              .filter((value, index, values) => values.indexOf(value) === index)
              .join(' | ')}
          </Typography.Text>
        </Space>
      ),
    },
    { title: t('audit.columns.action'), dataIndex: 'action', render: readableCode },
    {
      title: t('audit.columns.entity'),
      render: (_, event) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>
            {event.entityLabel ??
              (event.entityType === 'AUTH_SESSION' && event.actorLabel
                ? `${event.actorLabel} - ${t('audit.entities.session')}`
                : readableCode(event.entityType))}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {readableCode(event.entityType)} | {shortId(event.entityId)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: t('audit.columns.scope'),
      render: (_, event) =>
        event.scopeType ? (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>
              {event.scopeLabel ?? readableCode(event.scopeType)}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {readableCode(event.scopeType)} | {shortId(event.scopeId)}
            </Typography.Text>
          </Space>
        ) : (
          t('audit.globalScope')
        ),
    },
    { title: t('audit.columns.source'), dataIndex: 'source', width: 90 },
    {
      title: t('audit.columns.outcome'),
      width: 120,
      render: (_, event) => (
        <StatusTag status={event.outcome === 'SUCCEEDED' ? 'approved' : 'rejected'}>
          {t(`audit.outcomes.${event.outcome}`)}
        </StatusTag>
      ),
    },
  ]

  return (
    <section className="grid gap-6">
      <PageHeader
        title={t('audit.title')}
        description={t('audit.description')}
        actions={
          <Button
            icon={<DownloadOutlined />}
            loading={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            {t('audit.exportCsv', { defaultValue: 'Export CSV' })}
          </Button>
        }
      />

      {/* Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard
          icon={<HistoryOutlined />}
          variant="neutral"
          label={t('audit.metrics.total', { defaultValue: 'Total Events' })}
          value={totalCount}
          loading={query.isLoading}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          variant="success"
          label={t('audit.metrics.succeeded', { defaultValue: 'Succeeded Actions' })}
          value={succeededCount}
          loading={query.isLoading}
        />
        <MetricCard
          icon={<CloseCircleOutlined />}
          variant="danger"
          label={t('audit.metrics.failed', { defaultValue: 'Failed Actions' })}
          value={failedCount}
          loading={query.isLoading}
        />
        <MetricCard
          icon={<SafetyOutlined />}
          variant="info"
          label={t('audit.metrics.security', { defaultValue: 'Audit Scope' })}
          value="System Wide"
          loading={query.isLoading}
        />
      </div>

      {query.error ? (
        <FeedbackAlert
          type="error"
          title={t('audit.loadFailed')}
          action={
            <Button type="link" icon={<ReloadOutlined />} onClick={() => void query.refetch()}>
              {t('audit.retry')}
            </Button>
          }
        />
      ) : null}

      <DataTable
        rowKey="id"
        columns={columns}
        dataSource={events}
        loading={query.isLoading}
        onRow={(event) => ({ onClick: () => setSelected(event), className: 'cursor-pointer' })}
        pagination={false}
        toolbar={
          <FilterBar label={t('audit.filters.label')} contentClassName={styles.filters}>
            <SearchInput
              placeholder={t('audit.filters.action')}
              value={filters.action}
              onSearchChange={(action) =>
                setFilters((value) => ({ ...value, action: action || undefined }))
              }
            />
            <SearchInput
              placeholder={t('audit.filters.entityType')}
              value={filters.entityType}
              onSearchChange={(entityType) =>
                setFilters((value) => ({ ...value, entityType: entityType || undefined }))
              }
            />
            <SearchInput
              placeholder={t('audit.filters.entityId')}
              value={filters.entityId}
              onSearchChange={(entityId) =>
                setFilters((value) => ({ ...value, entityId: entityId || undefined }))
              }
            />
            <Select
              allowClear
              placeholder={t('audit.filters.outcome')}
              options={outcomeOptions.map((value) => ({
                value,
                label: t(`audit.outcomes.${value}`),
              }))}
              onChange={(outcome) => setFilters((value) => ({ ...value, outcome }))}
            />
            <Select
              allowClear
              placeholder={t('audit.filters.source')}
              options={sourceOptions.map((value) => ({ value, label: value }))}
              onChange={(source) => setFilters((value) => ({ ...value, source }))}
            />
            <DateRangePicker
              value={filters}
              onChange={(range) => setFilters((value) => ({ ...value, ...range }))}
            />
          </FilterBar>
        }
        emptyText={t('audit.empty')}
      />

      {query.hasNextPage ? (
        <Button loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {t('audit.loadMore')}
        </Button>
      ) : null}

      <Modal
        open={Boolean(selected)}
        width={900}
        title={t('audit.detailTitle')}
        footer={null}
        onCancel={() => setSelected(undefined)}
      >
        {detail.isLoading ? (
          <Result status="info" title={t('audit.loadingDetail')} />
        ) : event ? (
          <>
            <Descriptions
              bordered
              column={2}
              size="small"
              items={[
                {
                  key: 'request',
                  label: t('audit.detail.requestId'),
                  children: event.requestId ?? t('audit.notAvailable'),
                },
                {
                  key: 'ip',
                  label: t('audit.detail.ip'),
                  children: event.ipAddress ?? t('audit.notAvailable'),
                },
                {
                  key: 'actor',
                  label: t('audit.columns.actor'),
                  children: event.actorLabel
                    ? `${event.actorLabel} (${event.actorEmail ?? event.actorType})`
                    : (event.actorAccountId ?? event.actorType),
                },
                {
                  key: 'scope',
                  label: t('audit.columns.scope'),
                  children: event.scopeType
                    ? `${event.scopeLabel ?? readableCode(event.scopeType)} (${event.scopeId})`
                    : t('audit.globalScope'),
                },
              ]}
            />
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              {t('audit.detail.changes')}
            </Typography.Title>
            <pre
              className="max-h-64 overflow-auto rounded-lg bg-page p-4"
              style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}
            >
              {JSON.stringify(event.changes ?? {}, null, 2)}
            </pre>
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              {t('audit.detail.metadata')}
            </Typography.Title>
            <pre
              className="max-h-64 overflow-auto rounded-lg bg-page p-4"
              style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}
            >
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </>
        ) : null}
      </Modal>
    </section>
  )
}

export default AuditLogPage
