import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { DownloadOutlined, EditOutlined, SyncOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Input, Modal, Select, Space, Timeline, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  CopyableOrderId,
  DataFreshness,
  DateRangePicker,
  FeedbackAlert,
  FilterBar,
  FormattedDateTime,
  MetricCard,
  StatusTag,
  TableTextCell,
  useFeedbackToast,
  useResourceSelection,
} from '@/shared/ui'

import type { Shipment, ShipmentParams, ShipmentStatus } from '../api/shipmentApi'
import { TrackingSyncCard } from '../components/TrackingSyncCard'
import {
  useBatchRecheckShipmentsMutation,
  useExportShipmentsCsvMutation,
  useRecheckShipmentMutation,
  useShipmentDetailQuery,
  useShipmentLogsQuery,
  useShipmentsQuery,
  useShipmentSummaryQuery,
  useTrackingSyncConfigQuery,
  useUpdateTrackingSyncConfigMutation,
  useUpdateShipmentStatusMutation,
  useUpdateShipmentTrackingMutation,
  useRunTrackingSyncNowMutation,
} from '../hooks'
import styles from './ShipmentWorkbenchPage.module.scss'

const STATUSES: ShipmentStatus[] = [
  'TRACKING_PENDING',
  'SHIPPED',
  'DELIVERED',
  'EXCEPTION',
  'RETURNED',
  'CANCELLED',
]
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
  const toast = useFeedbackToast()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [status, setStatus] = useState<ShipmentStatus>()
  const [externalOrderId, setExternalOrderId] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const [selectedId, setSelectedId] = useResourceSelection()
  const [editMode, setEditMode] = useState<'tracking' | 'status'>()
  const [carrier, setCarrier] = useState('')
  const [newTrackingNumber, setNewTrackingNumber] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [nextStatus, setNextStatus] = useState<
    'DELIVERED' | 'EXCEPTION' | 'RETURNED' | 'CANCELLED'
  >('DELIVERED')
  const [note, setNote] = useState('')

  const permissions = useMemo(
    () =>
      account
        ? [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)]
        : [],
    [account],
  )
  const canWrite = permissions.includes('SHIPMENTS:WRITE')

  const params: ShipmentParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      status,
      externalOrderId: externalOrderId || undefined,
      trackingNumber: trackingNumber || undefined,
      ...dates,
    }),
    [page, pageSize, status, externalOrderId, trackingNumber, dates],
  )

  const filters = useMemo(
    () => ({
      status,
      externalOrderId: params.externalOrderId,
      trackingNumber: params.trackingNumber,
      ...dates,
    }),
    [status, params.externalOrderId, params.trackingNumber, dates],
  )

  const shipments = useShipmentsQuery(params)
  const summary = useShipmentSummaryQuery(filters)
  const detail = useShipmentDetailQuery(selectedId)
  const logs = useShipmentLogsQuery(detail.data?.vendorSubmissionId)
  const trackingSyncConfig = useTrackingSyncConfigQuery({ enabled: canWrite })

  const recheck = useRecheckShipmentMutation({
    onSuccess: () => {
      toast('success', t('portal.shipments.recheckComplete'))
    },
    onError: (error) => {
      toast('error', error instanceof Error ? error.message : t('portal.shipments.recheckFailed'))
    },
  })

  const updateTracking = useUpdateShipmentTrackingMutation({
    onSuccess: () => {
      setEditMode(undefined)
      toast('success', t('portal.shipments.updated'))
    },
    onError: (error) => {
      toast('error', error instanceof Error ? error.message : t('portal.shipments.updateFailed'))
    },
  })

  const updateStatus = useUpdateShipmentStatusMutation({
    onSuccess: () => {
      setEditMode(undefined)
      toast('success', t('portal.shipments.updated'))
    },
    onError: (error) => {
      toast('error', error instanceof Error ? error.message : t('portal.shipments.updateFailed'))
    },
  })

  const batchRecheck = useBatchRecheckShipmentsMutation({
    onSuccess: () => {
      toast('success', t('portal.shipments.recheckComplete'))
    },
    onError: (error) => {
      toast('error', error instanceof Error ? error.message : t('portal.shipments.recheckFailed'))
    },
  })

  const exportCsv = useExportShipmentsCsvMutation()
  const updateTrackingSyncConfig = useUpdateTrackingSyncConfigMutation({
    onSuccess: () => toast('success', t('portal.shipments.trackingSync.saved')),
    onError: (error) =>
      toast(
        'error',
        error instanceof Error ? error.message : t('portal.shipments.trackingSync.saveFailed'),
      ),
  })
  const runTrackingSyncNow = useRunTrackingSyncNowMutation({
    onSuccess: () => toast('success', t('portal.shipments.trackingSync.runComplete')),
    onError: (error) =>
      toast(
        'error',
        error instanceof Error ? error.message : t('portal.shipments.trackingSync.runFailed'),
      ),
  })

  const handleRecheckRow = useCallback(
    (event: React.MouseEvent, rowId: string) => {
      event.stopPropagation()
      recheck.mutate(rowId)
    },
    [recheck],
  )

  const handleOpenTrackingEdit = useCallback(() => {
    if (!detail.data) return
    setCarrier(detail.data.carrier || '')
    setNewTrackingNumber(detail.data.trackingNumber || '')
    setTrackingUrl(detail.data.trackingUrl || '')
    setNote(detail.data.note || '')
    setEditMode('tracking')
  }, [detail.data])

  const handleOpenStatusEdit = useCallback(() => {
    if (!detail.data) return
    setNote(detail.data.note || '')
    setEditMode('status')
  }, [detail.data])

  const handleSaveTracking = useCallback(() => {
    if (!selectedId) return
    updateTracking.mutate({
      id: selectedId,
      input: {
        carrier: carrier.trim(),
        trackingNumber: newTrackingNumber.trim(),
        trackingUrl: trackingUrl.trim() || null,
        note: note.trim() || null,
      },
    })
  }, [selectedId, carrier, newTrackingNumber, trackingUrl, note, updateTracking])

  const handleSaveStatus = useCallback(() => {
    if (!selectedId) return
    updateStatus.mutate({
      id: selectedId,
      input: {
        status: nextStatus,
        note: note.trim() || null,
      },
    })
  }, [selectedId, nextStatus, note, updateStatus])

  const handleCloseDrawer = useCallback(() => {
    setSelectedId(undefined)
  }, [setSelectedId])

  const handleCloseModal = useCallback(() => {
    setEditMode(undefined)
  }, [])

  const columns: TableColumnsType<Shipment> = useMemo(
    () => [
      {
        title: t('portal.shipments.columns.order'),
        dataIndex: 'externalOrderId',
        width: 176,
        render: (value) => <CopyableOrderId value={value} />,
      },
      {
        title: t('portal.shipments.columns.vendorOrder'),
        dataIndex: 'vendorExternalOrderId',
        width: 172,
        render: (value) => <TableTextCell value={value} fallback="-" />,
      },
      {
        title: t('portal.shipments.columns.provider'),
        dataIndex: 'provider',
        width: 120,
        render: (value) => <TableTextCell value={value} fallback="-" />,
      },
      {
        title: t('portal.shipments.columns.tracking'),
        width: 220,
        render: (_, row) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}
          >
            <TableTextCell code value={row.trackingNumber} fallback="-" />
            <TableTextCell secondary value={row.carrier} fallback="-" />
          </div>
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
        width: 150,
        render: (value) => <FormattedDateTime value={value} />,
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
              onClick={(event) => handleRecheckRow(event, row.id)}
            >
              {t('portal.shipments.recheck')}
            </Button>
          ) : null,
      },
    ],
    [canWrite, handleRecheckRow, recheck.isPending, t],
  )

  const metrics = useMemo(
    () =>
      [
        ['total', summary.data?.total ?? 0],
        ['trackingPending', summary.data?.trackingPending ?? 0],
        ['shipped', summary.data?.shipped ?? 0],
        ['delivered', summary.data?.delivered ?? 0],
        ['exception', summary.data?.exception ?? 0],
      ] as const,
    [summary.data],
  )

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
      {canWrite ? (
        <TrackingSyncCard
          config={trackingSyncConfig.data}
          loading={trackingSyncConfig.isLoading}
          saving={updateTrackingSyncConfig.isPending}
          running={runTrackingSyncNow.isPending}
          onChange={(input) => updateTrackingSyncConfig.mutate(input)}
          onRunNow={() => runTrackingSyncNow.mutate()}
        />
      ) : null}
      <div className={styles.tableArea}>
        <CoreDataTable
          fillViewport
          tableLayout="fixed"
          rowKey="id"
          columns={columns}
          dataSource={shipments.data?.items ?? []}
          loading={shipments.isLoading}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
          pagination={{
            current: page,
            pageSize,
            total: shipments.data?.pagination.total,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
            },
          }}
          scroll={{ x: 1_100 }}
          toolbar={
            <FilterBar
              label={t('portal.shipments.filters')}
              contentClassName={styles.filters}
              actions={
                <DataFreshness
                  timestamp={shipments.dataUpdatedAt}
                  onRefresh={() => void shipments.refetch()}
                  loading={shipments.isFetching}
                />
              }
            >
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
                onClick={() => exportCsv.mutate(params)}
              >
                {t('portal.shipments.exportCsv')}
              </Button>
              {canWrite ? (
                <Button
                  icon={<SyncOutlined />}
                  loading={batchRecheck.isPending}
                  onClick={() => batchRecheck.mutate({ limit: 100 })}
                >
                  {t('portal.shipments.recheckSubmitted')}
                </Button>
              ) : null}
            </FilterBar>
          }
        />
      </div>
      <Modal
        destroyOnClose
        width="min(1200px, 88vw)"
        style={{ top: 40 }}
        open={Boolean(selectedId)}
        title={t('portal.shipments.detail')}
        onCancel={handleCloseDrawer}
        loading={detail.isLoading}
        footer={
          canWrite && detail.data ? (
            <Space>
              <Button icon={<EditOutlined />} onClick={handleOpenTrackingEdit}>
                {t('portal.shipments.editTracking')}
              </Button>
              <Button onClick={handleOpenStatusEdit}>{t('portal.shipments.changeStatus')}</Button>
            </Space>
          ) : null
        }
      >
        {detail.isError ? (
          <FeedbackAlert type="error" title={t('notifications.resourceUnavailable')} />
        ) : null}
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
                    <FormattedDateTime value={entry.createdAt} />
                  </>
                ),
              }))}
            />
          </div>
        ) : null}
      </Modal>
      <Modal
        open={editMode === 'tracking'}
        title={t('portal.shipments.editTracking')}
        confirmLoading={updateTracking.isPending}
        okButtonProps={{ disabled: !carrier.trim() || !newTrackingNumber.trim() }}
        onCancel={handleCloseModal}
        onOk={handleSaveTracking}
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
        confirmLoading={updateStatus.isPending}
        onCancel={handleCloseModal}
        onOk={handleSaveStatus}
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
