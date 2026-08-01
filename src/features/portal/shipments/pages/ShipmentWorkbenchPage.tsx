import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { ReloadOutlined, SyncOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Drawer, Input, Select, Space, Timeline, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
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
  getShipment,
  listShipments,
  listWebhookLogs,
  recheckShipment,
  type Shipment,
  type ShipmentStatus,
  summarizeShipments,
} from '../api/shipmentApi'
import { shipmentKeys } from '../api/shipmentKeys'
import styles from './ShipmentWorkbenchPage.module.scss'

const STATUSES: ShipmentStatus[] = [
  'TRACKING_PENDING',
  'SHIPPED',
  'DELIVERED',
  'EXCEPTION',
  'RETURNED',
  'CANCELLED',
]
const PAGE_SIZE = 20

function tone(status: ShipmentStatus) {
  if (status === 'DELIVERED') return 'operational'
  if (status === 'SHIPPED') return 'processing'
  if (status === 'TRACKING_PENDING') return 'pending'
  if (status === 'EXCEPTION' || status === 'RETURNED') return 'critical'
  return 'cancelled'
}

export function ShipmentWorkbenchPage({
  account: accountProp,
}: {
  readonly account?: CurrentAccount
}) {
  const { t } = useTranslation()
  const loadedAccount = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const account = accountProp ?? loadedAccount
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<ShipmentStatus>()
  const [externalOrderId, setExternalOrderId] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const [selectedId, setSelectedId] = useState<string>()
  const permissions = account
    ? [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)]
    : []
  const canWrite = permissions.includes('SHIPMENTS:WRITE')
  const params = {
    page,
    limit: PAGE_SIZE,
    status,
    externalOrderId: externalOrderId || undefined,
    trackingNumber: trackingNumber || undefined,
    ...dates,
  }
  const filters = {
    status,
    externalOrderId: params.externalOrderId,
    trackingNumber: params.trackingNumber,
    ...dates,
  }
  const shipments = useQuery({
    queryKey: shipmentKeys.list(params),
    queryFn: () => listShipments(params),
    retry: false,
  })
  const summary = useQuery({
    queryKey: shipmentKeys.summary(filters),
    queryFn: () => summarizeShipments(filters),
    retry: false,
  })
  const detail = useQuery({
    queryKey: shipmentKeys.detail(selectedId ?? ''),
    queryFn: () => getShipment(selectedId!),
    enabled: Boolean(selectedId),
    retry: false,
  })
  const logs = useQuery({
    queryKey: shipmentKeys.logs(detail.data?.vendorSubmissionId ?? ''),
    queryFn: () =>
      listWebhookLogs({ page: 1, limit: 20, vendorSubmissionId: detail.data!.vendorSubmissionId }),
    enabled: Boolean(detail.data?.vendorSubmissionId),
    retry: false,
  })
  const recheck = useMutation({
    mutationFn: recheckShipment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: shipmentKeys.all })
      toast('success', t('portal.shipments.recheckComplete'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.shipments.recheckFailed')),
  })
  const columns: TableColumnsType<Shipment> = [
    {
      title: t('portal.shipments.columns.order'),
      dataIndex: 'externalOrderId',
      render: (value, row) => value || row.orderId,
    },
    { title: t('portal.shipments.columns.vendorOrder'), dataIndex: 'vendorExternalOrderId' },
    { title: t('portal.shipments.columns.provider'), dataIndex: 'provider', width: 120 },
    {
      title: t('portal.shipments.columns.tracking'),
      render: (_, row) => (
        <>
          <Typography.Text>{row.trackingNumber || '-'}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{row.carrier || '-'}</Typography.Text>
        </>
      ),
    },
    {
      title: t('portal.shipments.columns.status'),
      dataIndex: 'status',
      width: 150,
      render: (value: ShipmentStatus) => (
        <StatusTag status={tone(value)}>{t(`portal.shipments.statuses.${value}`)}</StatusTag>
      ),
    },
    {
      title: t('portal.shipments.columns.updated'),
      dataIndex: 'updatedAt',
      width: 170,
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      title: t('portal.shipments.columns.action'),
      width: 110,
      render: (_, row) =>
        canWrite ? (
          <Button
            size="small"
            icon={<SyncOutlined />}
            loading={recheck.isPending}
            onClick={(event) => {
              event.stopPropagation()
              recheck.mutate(row.id)
            }}
          >
            {t('portal.shipments.recheck')}
          </Button>
        ) : null,
    },
  ]
  const metrics = [
    ['total', summary.data?.total ?? 0],
    ['trackingPending', summary.data?.trackingPending ?? 0],
    ['shipped', summary.data?.shipped ?? 0],
    ['delivered', summary.data?.delivered ?? 0],
    ['exception', summary.data?.exception ?? 0],
  ] as const

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.shipments.title')}
        description={t('portal.shipments.description')}
        actions={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void queryClient.invalidateQueries({ queryKey: shipmentKeys.all })}
          >
            {t('portal.shipments.refresh')}
          </Button>
        }
      />
      {shipments.error || summary.error ? (
        <FeedbackAlert type="error" title={t('portal.shipments.unavailable')} />
      ) : null}
      <div className={styles.metrics}>
        {metrics.map(([key, value]) => (
          <div className={styles.metric} key={key}>
            <Typography.Text type="secondary">
              {t(`portal.shipments.metrics.${key}`)}
            </Typography.Text>
            <Typography.Title level={3}>{value}</Typography.Title>
          </div>
        ))}
      </div>
      <SectionCard>
        <DataTable
          rowKey="id"
          columns={columns}
          dataSource={shipments.data?.items ?? []}
          loading={shipments.isLoading}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: shipments.data?.pagination.total,
            onChange: setPage,
          }}
          toolbar={
            <FilterBar label={t('portal.shipments.filters')} contentClassName={styles.filters}>
              <Input.Search
                allowClear
                className={styles.searchControl}
                placeholder={t('portal.shipments.externalOrderId')}
                value={externalOrderId}
                onChange={(event) => setExternalOrderId(event.target.value)}
                onSearch={() => setPage(1)}
              />
              <Input.Search
                allowClear
                className={styles.searchControl}
                placeholder={t('portal.shipments.trackingNumber')}
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                onSearch={() => setPage(1)}
              />
              <Select
                allowClear
                className={styles.filterControl}
                placeholder={t('portal.shipments.allStatuses')}
                options={STATUSES.map((value) => ({
                  value,
                  label: t(`portal.shipments.statuses.${value}`),
                }))}
                value={status}
                onChange={(value) => {
                  setStatus(value)
                  setPage(1)
                }}
              />
              <div className={styles.dateControl}>
                <DateRangePicker
                  value={dates}
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
      <Drawer
        width={560}
        open={Boolean(selectedId)}
        title={t('portal.shipments.detail')}
        onClose={() => setSelectedId(undefined)}
        loading={detail.isLoading}
      >
        {detail.data ? (
          <div className={styles.detail}>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                {
                  key: 'status',
                  label: t('portal.shipments.columns.status'),
                  children: (
                    <StatusTag status={tone(detail.data.status)}>
                      {t(`portal.shipments.statuses.${detail.data.status}`)}
                    </StatusTag>
                  ),
                },
                {
                  key: 'order',
                  label: t('portal.shipments.columns.order'),
                  children: detail.data.externalOrderId || detail.data.orderId,
                },
                {
                  key: 'vendor',
                  label: t('portal.shipments.columns.vendorOrder'),
                  children: detail.data.vendorExternalOrderId || '-',
                },
                {
                  key: 'tracking',
                  label: t('portal.shipments.columns.tracking'),
                  children: (
                    <Space direction="vertical" size={0}>
                      <span className={styles.breakable}>{detail.data.trackingNumber || '-'}</span>
                      <Typography.Text type="secondary">
                        {detail.data.carrier || '-'}
                      </Typography.Text>
                    </Space>
                  ),
                },
                {
                  key: 'note',
                  label: t('portal.shipments.note'),
                  children: detail.data.note || '-',
                },
              ]}
            />
            <Typography.Title level={5}>{t('portal.shipments.webhookHistory')}</Typography.Title>
            {logs.error ? (
              <FeedbackAlert type="error" title={t('portal.shipments.logsUnavailable')} />
            ) : null}
            <Timeline
              pending={logs.isLoading ? t('portal.shipments.loadingLogs') : undefined}
              items={(logs.data?.items ?? []).map((entry) => ({
                color:
                  entry.outcome === 'SUCCESS'
                    ? 'green'
                    : entry.outcome === 'ERROR'
                      ? 'red'
                      : 'orange',
                children: (
                  <>
                    <strong>
                      {entry.provider} · {entry.outcome}
                    </strong>
                    <br />
                    <span className={styles.breakable}>{entry.message || '-'}</span>
                    <br />
                    <Typography.Text type="secondary">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                    </Typography.Text>
                  </>
                ),
              }))}
            />
          </div>
        ) : null}
      </Drawer>
    </section>
  )
}

export default ShipmentWorkbenchPage
