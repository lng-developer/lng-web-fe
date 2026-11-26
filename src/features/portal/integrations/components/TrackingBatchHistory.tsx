import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, Input, Space, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { FeedbackAlert, FormattedDateTime } from '@/shared/ui'
import {
  getAmazonTrackingSubmission,
  listAmazonTrackingSubmissions,
  type AmazonTrackingSubmission,
  type AmazonTrackingSubmissionDetail,
} from '../api/integrationApi'

const activeStatuses = new Set(['PENDING', 'SUBMITTED', 'WAITING_AMAZON'])

function BatchOrders({ id }: { readonly id: string }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const detail = useQuery({
    queryKey: ['amazon-tracking-batches', 'detail', id],
    queryFn: ({ signal }) => getAmazonTrackingSubmission(id, signal),
    staleTime: 20_000,
    refetchInterval: (query) =>
      activeStatuses.has(query.state.data?.status ?? '') ? 15_000 : false,
  })
  const rows = useMemo(() => {
    const value = search.trim().toLowerCase()
    return (detail.data?.rows ?? [])
      .map((row, index) => ({ ...row, key: `${row.shipmentId}-${index}` }))
      .filter((row) => `${row.externalOrderId} ${row.trackingNumber}`.toLowerCase().includes(value))
  }, [detail.data?.rows, search])
  type Row = AmazonTrackingSubmissionDetail['rows'][number]
  const columns: TableColumnsType<Row> = [
    {
      title: t('portal.shipments.trackingPreview.orderId'),
      dataIndex: 'externalOrderId',
      render: (value: string) => <Typography.Text copyable>{value}</Typography.Text>,
    },
    { title: t('portal.shipments.trackingPreview.shipDate'), dataIndex: 'shipDate', width: 120 },
    {
      title: t('portal.shipments.trackingPreview.carrierCode'),
      dataIndex: 'carrierCode',
      width: 120,
    },
    { title: t('portal.shipments.trackingPreview.shipMethod'), dataIndex: 'shipMethod' },
    {
      title: t('portal.shipments.trackingPreview.trackingNumber'),
      dataIndex: 'trackingNumber',
      render: (value: string) => <Typography.Text copyable>{value}</Typography.Text>,
    },
  ]
  if (detail.isError)
    return (
      <FeedbackAlert
        type="error"
        title={t('trackingBatches.detailError')}
        action={<Button onClick={() => void detail.refetch()}>{t('trackingBatches.retry')}</Button>}
      />
    )
  return (
    <Space vertical size="small" style={{ width: '100%' }}>
      <Typography.Text type="secondary">{t('trackingBatches.snapshotNote')}</Typography.Text>
      {detail.data?.errorMessage ? (
        <FeedbackAlert type="error" title={detail.data.errorMessage} />
      ) : null}
      {detail.data?.result?.diagnostics?.length ? (
        <FeedbackAlert
          type="warning"
          title={t('trackingBatches.diagnostics')}
          description={detail.data.result.diagnostics.join('\n')}
        />
      ) : null}
      <Input.Search
        aria-label={t('trackingBatches.search')}
        placeholder={t('trackingBatches.search')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        allowClear
      />
      <Table
        columns={columns}
        rowKey="key"
        dataSource={rows}
        loading={detail.isLoading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 850 }}
      />
    </Space>
  )
}

export function TrackingBatchHistory({ shopId }: { readonly shopId: string }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string>()
  const batches = useQuery({
    queryKey: ['amazon-tracking-batches', 'list', shopId, page],
    queryFn: () => listAmazonTrackingSubmissions({ shopId, page, limit: 10 }),
    staleTime: 20_000,
    refetchInterval: (query) =>
      query.state.data?.items.some((batch) => activeStatuses.has(batch.status)) ? 15_000 : false,
  })
  const columns: TableColumnsType<AmazonTrackingSubmission> = [
    {
      title: t('trackingBatches.batch'),
      key: 'batch',
      render: (_, batch) => (
        <Space vertical size={0}>
          <Typography.Text copyable>{batch.amazonBatchId || batch.filename}</Typography.Text>
          {batch.amazonBatchId ? (
            <Typography.Text type="secondary">{batch.filename}</Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: t('trackingBatches.createdAt'),
      dataIndex: 'createdAt',
      width: 165,
      render: (value: string) => (
        <FormattedDateTime value={value} format="DD/MM/YYYY HH:mm" showRelative={false} />
      ),
    },
    {
      title: t('trackingBatches.status'),
      dataIndex: 'status',
      width: 160,
      render: (value: string) => (
        <Tag
          color={value === 'SUCCEEDED' ? 'success' : value === 'FAILED' ? 'error' : 'processing'}
        >
          {t(`trackingBatches.statuses.${value}`)}
        </Tag>
      ),
    },
    { title: t('trackingBatches.rows'), dataIndex: 'rowCount', width: 80 },
    {
      title: t('trackingBatches.result'),
      key: 'result',
      width: 180,
      render: (_, batch) =>
        activeStatuses.has(batch.status)
          ? t('trackingBatches.awaitingResult')
          : batch.status === 'FAILED' && !batch.result?.importedCount && !batch.result?.failedCount
            ? t('trackingBatches.noResult')
            : t('trackingBatches.resultCounts', {
                success: batch.result?.importedCount ?? 0,
                failed: batch.result?.failedCount ?? 0,
              }),
    },
  ]
  return (
    <Space vertical size="middle" style={{ width: '100%' }}>
      <Space wrap>
        <Typography.Text type="secondary">{t('trackingBatches.description')}</Typography.Text>
        <Button
          size="small"
          loading={batches.isFetching}
          onClick={() => {
            void batches.refetch()
          }}
        >
          {t('trackingBatches.refresh')}
        </Button>
      </Space>
      {batches.isError ? (
        <FeedbackAlert
          type="error"
          title={t('trackingBatches.listError')}
          action={
            <Button onClick={() => void batches.refetch()}>{t('trackingBatches.retry')}</Button>
          }
        />
      ) : (
        <Table<AmazonTrackingSubmission>
          columns={columns}
          dataSource={batches.data?.items ?? []}
          rowKey="id"
          size="small"
          loading={batches.isLoading}
          locale={{ emptyText: t('trackingBatches.empty') }}
          scroll={{ x: 950 }}
          pagination={{
            current: page,
            pageSize: 10,
            total: batches.data?.total ?? 0,
            showSizeChanger: false,
            onChange: (next) => {
              setPage(next)
              setExpandedId(undefined)
            },
          }}
          expandable={{
            expandedRowKeys: expandedId ? [expandedId] : [],
            onExpand: (expanded, row) => setExpandedId(expanded ? row.id : undefined),
            expandedRowRender: (batch) =>
              expandedId === batch.id ? <BatchOrders id={batch.id} /> : null,
          }}
        />
      )}
    </Space>
  )
}
