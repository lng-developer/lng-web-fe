import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { DownloadOutlined, EditOutlined, SyncOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Button,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Select,
  Space,
  Timeline,
  Typography,
} from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  CopyableOrderId,
  DateRangePicker,
  FeedbackAlert,
  FilterBar,
  MetricCard,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  exportShipmentsCsv,
  getShipment,
  listShipments,
  listWebhookLogs,
  recheckShipment,
  recheckSubmittedShipments,
  type Shipment,
  type ShipmentStatus,
  summarizeShipments,
  updateShipmentStatus,
  updateShipmentTracking,
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
const DEFAULT_PAGE_SIZE = 20

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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [status, setStatus] = useState<ShipmentStatus>()
  const [externalOrderId, setExternalOrderId] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const [selectedId, setSelectedId] = useState<string>()
  const [editMode, setEditMode] = useState<'tracking' | 'status'>()
  const [carrier, setCarrier] = useState('')
  const [newTrackingNumber, setNewTrackingNumber] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [nextStatus, setNextStatus] = useState<
    'DELIVERED' | 'EXCEPTION' | 'RETURNED' | 'CANCELLED'
  >('DELIVERED')
  const [note, setNote] = useState('')
  const permissions = account
    ? [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)]
    : []
  const canWrite = permissions.includes('SHIPMENTS:WRITE')
  const params = {
    page,
    limit: pageSize,
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
  const operation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error(t('portal.shipments.noSelection'))
      if (editMode === 'tracking') {
        return updateShipmentTracking(selectedId, {
          carrier: carrier.trim(),
          trackingNumber: newTrackingNumber.trim(),
          trackingUrl: trackingUrl.trim() || null,
          note: note.trim() || null,
        })
      }
      return updateShipmentStatus(selectedId, { status: nextStatus, note: note.trim() || null })
    },
    onSuccess: async () => {
      setEditMode(undefined)
      await queryClient.invalidateQueries({ queryKey: shipmentKeys.all })
      toast('success', t('portal.shipments.updated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.shipments.updateFailed')),
  })
  const batchRecheck = useMutation({
    mutationFn: () => recheckSubmittedShipments({ limit: 100 }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: shipmentKeys.all })
      toast('success', t('portal.shipments.recheckComplete'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.shipments.recheckFailed')),
  })
  const exportCsv = useMutation({
    mutationFn: () => exportShipmentsCsv(params),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result)
      const link = document.createElement('a')
      link.href = url
      link.download = 'shipments.csv'
      link.click()
      URL.revokeObjectURL(url)
    },
  })
  const columns: TableColumnsType<Shipment> = [
    {
      title: t('portal.shipments.columns.order'),
      dataIndex: 'externalOrderId',
      render: (value) => <CopyableOrderId value={value} />,
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
      {shipments.error || summary.error ? (
        <FeedbackAlert type="error" title={t('portal.shipments.unavailable')} />
      ) : null}
      <div className={styles.metrics}>
        {metrics.map(([key, value]) => (
          <MetricCard
            key={key}
            label={t(`portal.shipments.metrics.${key}`)}
            value={value}
            loading={summary.isLoading}
          />
        ))}
      </div>
      <SectionCard>
        <CoreDataTable
          rowKey="id"
          columns={columns}
          dataSource={shipments.data?.items ?? []}
          loading={shipments.isLoading}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
          pagination={{
            current: page,
            pageSize,
            total: shipments.data?.pagination.total,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
            },
          }}
          scroll={{ x: '100%' }}
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
              <Button
                icon={<DownloadOutlined />}
                loading={exportCsv.isPending}
                onClick={() => exportCsv.mutate()}
              >
                {t('portal.shipments.exportCsv')}
              </Button>
              {canWrite ? (
                <Button
                  icon={<SyncOutlined />}
                  loading={batchRecheck.isPending}
                  onClick={() => batchRecheck.mutate()}
                >
                  {t('portal.shipments.recheckSubmitted')}
                </Button>
              ) : null}
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
        extra={
          canWrite && detail.data ? (
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  setCarrier(detail.data!.carrier || '')
                  setNewTrackingNumber(detail.data!.trackingNumber || '')
                  setTrackingUrl(detail.data!.trackingUrl || '')
                  setNote(detail.data!.note || '')
                  setEditMode('tracking')
                }}
              >
                {t('portal.shipments.editTracking')}
              </Button>
              <Button
                onClick={() => {
                  setNote(detail.data!.note || '')
                  setEditMode('status')
                }}
              >
                {t('portal.shipments.changeStatus')}
              </Button>
            </Space>
          ) : null
        }
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
                  children: <CopyableOrderId value={detail.data.externalOrderId} />,
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
      <Modal
        open={editMode === 'tracking'}
        title={t('portal.shipments.editTracking')}
        confirmLoading={operation.isPending}
        okButtonProps={{ disabled: !carrier.trim() || !newTrackingNumber.trim() }}
        onCancel={() => setEditMode(undefined)}
        onOk={() => operation.mutate()}
      >
        <Space direction="vertical" className={styles.modalFields}>
          <Input
            value={carrier}
            placeholder={t('portal.shipments.carrier')}
            onChange={(event) => setCarrier(event.target.value)}
          />
          <Input
            value={newTrackingNumber}
            placeholder={t('portal.shipments.trackingNumber')}
            onChange={(event) => setNewTrackingNumber(event.target.value)}
          />
          <Input
            value={trackingUrl}
            placeholder={t('portal.shipments.trackingUrl')}
            onChange={(event) => setTrackingUrl(event.target.value)}
          />
          <Input.TextArea
            value={note}
            placeholder={t('portal.shipments.note')}
            onChange={(event) => setNote(event.target.value)}
          />
        </Space>
      </Modal>
      <Modal
        open={editMode === 'status'}
        title={t('portal.shipments.changeStatus')}
        confirmLoading={operation.isPending}
        onCancel={() => setEditMode(undefined)}
        onOk={() => operation.mutate()}
      >
        <Space direction="vertical" className={styles.modalFields}>
          <Select
            className={styles.fullWidth}
            value={nextStatus}
            options={(['DELIVERED', 'EXCEPTION', 'RETURNED', 'CANCELLED'] as const).map(
              (value) => ({
                value,
                label: t(`portal.shipments.statuses.${value}`),
              }),
            )}
            onChange={setNextStatus}
          />
          <Input.TextArea
            value={note}
            placeholder={t('portal.shipments.note')}
            onChange={(event) => setNote(event.target.value)}
          />
        </Space>
      </Modal>
    </section>
  )
}

export default ShipmentWorkbenchPage
