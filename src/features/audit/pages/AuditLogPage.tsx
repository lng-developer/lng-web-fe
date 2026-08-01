import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReloadOutlined } from '@ant-design/icons'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Modal, Result, Select, Space, Typography } from 'antd'

import { getPermissions } from '@/shared/auth/session'
import {
  DataTable,
  DateRangePicker,
  FeedbackAlert,
  FilterBar,
  PageHeader,
  SearchInput,
  StatusTag,
} from '@/shared/ui'

import { type AuditEvent, type AuditFilters, listAuditEvents } from '../api/auditApi'
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
  const events = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data])
  if (!getPermissions().includes('AUDIT:READ')) return <Result status="403" title="403" />

  const columns: TableColumnsType<AuditEvent> = [
    {
      title: t('audit.columns.time'),
      dataIndex: 'createdAt',
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      title: t('audit.columns.actor'),
      render: (_, event) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>
            {event.actorLabel ?? String(event.actorSnapshot.email ?? event.actorType)}
          </Typography.Text>
          <Typography.Text type="secondary">
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
          <Typography.Text type="secondary">
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
            <Typography.Text type="secondary">
              {readableCode(event.scopeType)} | {shortId(event.scopeId)}
            </Typography.Text>
          </Space>
        ) : (
          t('audit.globalScope')
        ),
    },
    { title: t('audit.columns.source'), dataIndex: 'source' },
    {
      title: t('audit.columns.outcome'),
      render: (_, event) => (
        <StatusTag status={event.outcome === 'SUCCEEDED' ? 'approved' : 'rejected'}>
          {t(`audit.outcomes.${event.outcome}`)}
        </StatusTag>
      ),
    },
  ]

  return (
    <section className="grid gap-6">
      <PageHeader title={t('audit.title')} description={t('audit.description')} />
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
        {selected ? (
          <>
            <Descriptions
              bordered
              column={2}
              size="small"
              items={[
                {
                  key: 'request',
                  label: t('audit.detail.requestId'),
                  children: selected.requestId ?? t('audit.notAvailable'),
                },
                {
                  key: 'ip',
                  label: t('audit.detail.ip'),
                  children: selected.ipAddress ?? t('audit.notAvailable'),
                },
                {
                  key: 'actor',
                  label: t('audit.columns.actor'),
                  children: selected.actorLabel
                    ? `${selected.actorLabel} (${selected.actorEmail ?? selected.actorType})`
                    : (selected.actorAccountId ?? selected.actorType),
                },
                {
                  key: 'scope',
                  label: t('audit.columns.scope'),
                  children: selected.scopeType
                    ? `${selected.scopeLabel ?? readableCode(selected.scopeType)} (${selected.scopeId})`
                    : t('audit.globalScope'),
                },
              ]}
            />
            <Typography.Title level={5}>{t('audit.detail.changes')}</Typography.Title>
            <pre className="max-h-64 overflow-auto rounded-lg bg-page p-4">
              {JSON.stringify(selected.changes ?? {}, null, 2)}
            </pre>
            <Typography.Title level={5}>{t('audit.detail.metadata')}</Typography.Title>
            <pre className="max-h-64 overflow-auto rounded-lg bg-page p-4">
              {JSON.stringify(selected.metadata, null, 2)}
            </pre>
          </>
        ) : null}
      </Modal>
    </section>
  )
}
