import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Alert, Modal, Table, Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import { listShipments, type Shipment } from '@/features/portal/shipments/api/shipmentApi'

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
  onClose,
}: {
  readonly shopId: string
  readonly onClose: () => void
}) {
  const { t } = useTranslation()
  const shipments = useQuery({
    queryKey: ['shipments', 'amazon-tracking-preview', shopId],
    queryFn: () => listShipments({ shopId, status: 'SHIPPED', page: 1, limit: 100 }),
    staleTime: 20_000,
    retry: false,
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

  return (
    <Modal
      footer={null}
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
