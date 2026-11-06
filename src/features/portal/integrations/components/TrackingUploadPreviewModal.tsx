import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Alert, Button, message, Modal, Space, Table, Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import { listShipments, type Shipment } from '@/features/portal/shipments/api/shipmentApi'
import { createAmazonTrackingSubmission } from '@/features/portal/integrations/api/integrationApi'

type PreviewShipment = Pick<
  Shipment,
  'id' | 'externalOrderId' | 'carrier' | 'trackingNumber' | 'shippedAt'
>

function isReady(shipment: PreviewShipment) {
  return Boolean(
    shipment.externalOrderId && shipment.carrier && shipment.trackingNumber && shipment.shippedAt,
  )
}

export function TrackingUploadPreviewModal({
  shopId,
  agentId,
  onClose,
}: {
  readonly shopId: string
  readonly agentId?: string
  readonly onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedKeysOverride, setSelectedKeysOverride] = useState<string[]>()

  const shipments = useQuery({
    queryKey: ['shipments', 'amazon-tracking-preview', shopId],
    queryFn: () => listShipments({ shopId, status: 'SHIPPED', page: 1, limit: 100 }),
    staleTime: 20_000,
    retry: false,
  })

  const readyShipmentIds = useMemo(
    () => (shipments.data?.items ?? []).filter(isReady).map((s) => s.id),
    [shipments.data?.items],
  )
  const selectedRowKeys = selectedKeysOverride ?? readyShipmentIds

  const submitMutation = useMutation({
    mutationFn: (shipmentIds: string[]) => {
      if (!agentId) throw new Error('Extension agent is required')
      return createAmazonTrackingSubmission({ shopId, agentId, shipmentIds })
    },
    onSuccess: () => {
      message.success(
        t('portal.shipments.trackingPreview.submitSuccess', {
          defaultValue: 'Tracking submission queued for Amazon Extension.',
        }),
      )
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['extension-commands'] })
      onClose()
    },
    onError: (error: Error) => {
      message.error(error.message || 'Failed to submit tracking')
    },
  })

  const columns: TableColumnsType<PreviewShipment> = [
    {
      title: t('portal.shipments.trackingPreview.orderId'),
      dataIndex: 'externalOrderId',
      render: (value) => value || '-',
    },
    {
      title: t('portal.shipments.trackingPreview.shipDate'),
      dataIndex: 'shippedAt',
      render: (value) => (value ? dayjs(value).format('YYYY-MM-DD') : '-'),
    },
    {
      title: t('portal.shipments.trackingPreview.carrier'),
      dataIndex: 'carrier',
      render: (value) => value || '-',
    },
    {
      title: t('portal.shipments.trackingPreview.trackingNumber'),
      dataIndex: 'trackingNumber',
      render: (value) => value || '-',
    },
    {
      title: t('portal.shipments.trackingPreview.status'),
      width: 150,
      render: (_, shipment) =>
        isReady(shipment) ? (
          <Tag color="success">{t('portal.shipments.trackingPreview.ready')}</Tag>
        ) : (
          <Tag color="warning">{t('portal.shipments.trackingPreview.waitVendor')}</Tag>
        ),
    },
  ]

  const readyCount = selectedRowKeys.length

  return (
    <Modal
      footer={
        agentId ? (
          <Space>
            <Button onClick={onClose}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
            <Button
              type="primary"
              loading={submitMutation.isPending}
              disabled={readyCount === 0}
              onClick={() => submitMutation.mutate(selectedRowKeys)}
            >
              {t('portal.shipments.trackingPreview.submitToAmazon', {
                count: readyCount,
                defaultValue: `Submit ${readyCount} to Amazon`,
              })}
            </Button>
          </Space>
        ) : null
      }
      open
      title={t('portal.shipments.trackingPreview.title')}
      width="min(1200px, 92vw)"
      onCancel={onClose}
    >
      <Typography.Paragraph type="secondary">
        {t('portal.shipments.trackingPreview.description')}
      </Typography.Paragraph>
      <Alert showIcon type="info" title={t('portal.shipments.trackingPreview.noFallback')} />
      <Table<PreviewShipment>
        columns={columns}
        dataSource={shipments.data?.items ?? []}
        loading={shipments.isLoading}
        pagination={false}
        rowKey="id"
        rowSelection={
          agentId
            ? {
                selectedRowKeys,
                onChange: (keys) => setSelectedKeysOverride(keys as string[]),
                getCheckboxProps: (record) => ({
                  disabled: !isReady(record),
                }),
              }
            : undefined
        }
        scroll={{ x: 900 }}
        style={{ marginTop: 16 }}
      />
      {shipments.data && shipments.data.pagination.total > shipments.data.items.length ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          {t('portal.shipments.trackingPreview.limit', {
            shown: shipments.data.items.length,
            total: shipments.data.pagination.total,
          })}
        </Typography.Paragraph>
      ) : null}
    </Modal>
  )
}
