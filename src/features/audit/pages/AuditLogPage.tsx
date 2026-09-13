import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Modal, Result, Select, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { getPermissions } from '@/shared/auth/session'
import { DEFAULT_TABLE_PAGINATION } from '@/shared/constants/enum'
import {
  DateRangePicker,
  FeedbackAlert,
  FilterBar,
  MetricCard,
  PageHeader,
  SearchInput,
  StatusTag,
} from '@/shared/ui'

import { type AuditEvent, type AuditFilters } from '../api/auditApi'
import {
  useAuditEventDetailQuery,
  useAuditEventsInfiniteQuery,
  useExportAuditCsvMutation,
} from '../hooks'
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
  const { i18n, t } = useTranslation()
  const [filters, setFilters] = useState<AuditFilters>({})
  const [selected, setSelected] = useState<AuditEvent>()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_TABLE_PAGINATION.defaultPageSize)

  const query = useAuditEventsInfiniteQuery(filters)
  const detail = useAuditEventDetailQuery(selected?.id)
  const exportCsv = useExportAuditCsvMutation(filters)

  const events = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data])
  const event = detail.data ?? selected
  const updateFilters = useCallback((nextFilters: AuditFilters) => {
    setCurrentPage(1)
    setFilters(nextFilters)
  }, [])

  const totalCount = events.length
  const succeededCount = useMemo(
    () => events.filter((e) => e.outcome === 'SUCCEEDED').length,
    [events],
  )
  const failedCount = useMemo(() => events.filter((e) => e.outcome === 'FAILED').length, [events])

  const localizedCode = useCallback(
    (value: string) =>
      value
        .split(/[._:]+/)
        .filter(Boolean)
        .map((part) =>
          t(`audit.codeTerms.${part.toUpperCase()}`, {
            defaultValue: readableCode(part),
          }),
        )
        .join(' · '),
    [t],
  )

  const columns = useMemo<TableColumnsType<AuditEvent>>(
    () => [
      {
        title: t('audit.columns.time'),
        dataIndex: 'createdAt',
        width: 170,
        render: (value) =>
          new Date(value).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US'),
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
      { title: t('audit.columns.action'), dataIndex: 'action', render: localizedCode },
      {
        title: t('audit.columns.entity'),
        render: (_, event) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>
              {event.entityLabel ??
                (event.entityType === 'AUTH_SESSION' && event.actorLabel
                  ? `${event.actorLabel} - ${t('audit.entities.session')}`
                  : localizedCode(event.entityType))}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {localizedCode(event.entityType)} | {shortId(event.entityId)}
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
                {event.scopeLabel ?? localizedCode(event.scopeType)}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {localizedCode(event.scopeType)} | {shortId(event.scopeId)}
              </Typography.Text>
            </Space>
          ) : (
            t('audit.globalScope')
          ),
      },
      {
        title: t('audit.columns.source'),
        dataIndex: 'source',
        width: 110,
        render: (value) => t(`audit.sources.${value}`, { defaultValue: value }),
      },
      {
        title: t('audit.columns.outcome'),
        width: 120,
        render: (_, event) => (
          <StatusTag status={event.outcome === 'SUCCEEDED' ? 'approved' : 'rejected'}>
            {t(`audit.outcomes.${event.outcome}`)}
          </StatusTag>
        ),
      },
    ],
    [t, i18n.language, localizedCode],
  )

  if (!getPermissions().includes('AUDIT:READ')) return <Result status="403" title="403" />

  return (
    <section className="grid gap-6">
      <PageHeader
        actions={
          <Button
            icon={<DownloadOutlined />}
            loading={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            {t('audit.exportCsv')}
          </Button>
        }
      />

      {/* Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard
          icon={<HistoryOutlined />}
          variant="neutral"
          label={t('audit.metrics.total')}
          value={totalCount}
          loading={query.isLoading}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          variant="success"
          label={t('audit.metrics.succeeded')}
          value={succeededCount}
          loading={query.isLoading}
        />
        <MetricCard
          icon={<CloseCircleOutlined />}
          variant="danger"
          label={t('audit.metrics.failed')}
          value={failedCount}
          loading={query.isLoading}
        />
        <MetricCard
          icon={<SafetyOutlined />}
          variant="info"
          label={t('audit.metrics.security')}
          value={t('audit.metrics.systemWide')}
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

      <CoreDataTable
        rowKey="id"
        columns={columns}
        dataSource={events}
        loading={query.isLoading || query.isFetchingNextPage}
        onRow={(event) => ({ onClick: () => setSelected(event), className: 'cursor-pointer' })}
        pagination={{
          ...DEFAULT_TABLE_PAGINATION,
          current: currentPage,
          pageSize,
          total: events.length + (query.hasNextPage ? 1 : 0),
          onChange: (page, nextPageSize) => {
            const sizeChanged = nextPageSize !== pageSize
            const nextPage = sizeChanged ? 1 : page
            setCurrentPage(nextPage)
            setPageSize(nextPageSize)

            if (
              query.hasNextPage &&
              !query.isFetchingNextPage &&
              nextPage * nextPageSize >= events.length
            ) {
              void query.fetchNextPage()
            }
          },
        }}
        toolbar={
          <FilterBar label={t('audit.filters.label')} contentClassName={styles.filters}>
            <SearchInput
              placeholder={t('audit.filters.action')}
              value={filters.action}
              onSearchChange={(action) =>
                updateFilters({ ...filters, action: action || undefined })
              }
            />
            <SearchInput
              placeholder={t('audit.filters.entityType')}
              value={filters.entityType}
              onSearchChange={(entityType) =>
                updateFilters({ ...filters, entityType: entityType || undefined })
              }
            />
            <SearchInput
              placeholder={t('audit.filters.entityId')}
              value={filters.entityId}
              onSearchChange={(entityId) =>
                updateFilters({ ...filters, entityId: entityId || undefined })
              }
            />
            <Select
              allowClear
              placeholder={t('audit.filters.outcome')}
              options={outcomeOptions.map((value) => ({
                value,
                label: t(`audit.outcomes.${value}`),
              }))}
              onChange={(outcome) => updateFilters({ ...filters, outcome })}
            />
            <Select
              allowClear
              placeholder={t('audit.filters.source')}
              options={sourceOptions.map((value) => ({
                value,
                label: t(`audit.sources.${value}`),
              }))}
              onChange={(source) => updateFilters({ ...filters, source })}
            />
            <DateRangePicker
              value={filters}
              onChange={(range) => updateFilters({ ...filters, ...range })}
            />
          </FilterBar>
        }
        emptyText={t('audit.empty')}
      />

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
                    ? `${event.scopeLabel ?? localizedCode(event.scopeType)} (${event.scopeId})`
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
