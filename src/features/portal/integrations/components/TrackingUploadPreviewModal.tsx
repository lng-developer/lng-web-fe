import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Alert,
  Button,
  message,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import { listShipments, type Shipment } from '@/features/portal/shipments/api/shipmentApi'
import {
  createAmazonTrackingSubmission,
  listExtensionManagementAgents,
} from '@/features/portal/integrations/api/integrationApi'

type PreviewShipment = Pick<
  Shipment,
  | 'id'
  | 'externalOrderId'
  | 'carrier'
  | 'trackingNumber'
  | 'shippedAt'
  | 'marketplaceConfirmationStatus'
  | 'marketplaceConfirmedAt'
>

function isReady(shipment: PreviewShipment) {
  return Boolean(
    shipment.externalOrderId && shipment.carrier && shipment.trackingNumber && shipment.shippedAt,
  )
}

function canSelectForUpload(shipment: PreviewShipment) {
  return (
    isReady(shipment) &&
    shipment.marketplaceConfirmationStatus !== 'CONFIRMED' &&
    shipment.marketplaceConfirmationStatus !== 'SUBMITTED'
  )
}

function formatShipDate(dateValue?: string | Date | null) {
  if (!dateValue) return '-'
  try {
    const d = new Date(dateValue)
    const pstFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' })
    const formatted = pstFormatter.format(d)
    const todayInPst = pstFormatter.format(new Date())
    return formatted > todayInPst ? todayInPst : formatted
  } catch {
    return dayjs(dateValue).format('YYYY-MM-DD')
  }
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
  const [selectedAgentIdOverride, setSelectedAgentIdOverride] = useState<string>()
  const [filterMode, setFilterMode] = useState<'PENDING' | 'CONFIRMED' | 'ALL'>('PENDING')

  const shipments = useQuery({
    queryKey: ['shipments', 'amazon-tracking-preview', shopId],
    queryFn: () => listShipments({ shopId, status: 'SHIPPED', page: 1, limit: 100 }),
    staleTime: 20_000,
    retry: false,
  })

  const agentsQuery = useQuery({
    queryKey: ['extension-management-agents'],
    queryFn: listExtensionManagementAgents,
    staleTime: 30_000,
  })

  const availableAgents = useMemo(() => {
    return (agentsQuery.data?.items ?? []).filter((a) => a.shopId === shopId)
  }, [agentsQuery.data?.items, shopId])

  const effectiveAgentId = useMemo(() => {
    if (selectedAgentIdOverride) return selectedAgentIdOverride
    if (agentId) return agentId
    const online = availableAgents.find((a) => a.status === 'ONLINE')
    if (online) return online.id
    return availableAgents[0]?.id
  }, [selectedAgentIdOverride, agentId, availableAgents])

  const allItems = useMemo(() => shipments.data?.items ?? [], [shipments.data?.items])

  const pendingCount = useMemo(
    () => allItems.filter((s) => s.marketplaceConfirmationStatus !== 'CONFIRMED').length,
    [allItems],
  )
  const confirmedCount = useMemo(
    () => allItems.filter((s) => s.marketplaceConfirmationStatus === 'CONFIRMED').length,
    [allItems],
  )
  const totalCount = allItems.length

  const displayedShipments = useMemo(() => {
    if (filterMode === 'PENDING') {
      return allItems.filter((s) => s.marketplaceConfirmationStatus !== 'CONFIRMED')
    }
    if (filterMode === 'CONFIRMED') {
      return allItems.filter((s) => s.marketplaceConfirmationStatus === 'CONFIRMED')
    }
    return allItems
  }, [allItems, filterMode])

  const readyShipmentIds = useMemo(
    () => allItems.filter(canSelectForUpload).map((s) => s.id),
    [allItems],
  )
  const selectedRowKeys = selectedKeysOverride ?? readyShipmentIds

  const submitMutation = useMutation({
    mutationFn: (shipmentIds: string[]) => {
      if (!effectiveAgentId) throw new Error('Extension agent is required')
      return createAmazonTrackingSubmission({ shopId, agentId: effectiveAgentId, shipmentIds })
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
      title: t('portal.shipments.trackingPreview.orderId', { defaultValue: 'Order ID' }),
      dataIndex: 'externalOrderId',
      render: (value) => (
        <Typography.Text copyable={Boolean(value)}>{value || '-'}</Typography.Text>
      ),
    },
    {
      title: t('portal.shipments.trackingPreview.shipDate', { defaultValue: 'Ship Date' }),
      dataIndex: 'shippedAt',
      render: (value) => formatShipDate(value),
    },
    {
      title: t('portal.shipments.trackingPreview.carrier', { defaultValue: 'Carrier' }),
      dataIndex: 'carrier',
      render: (value) => value || '-',
    },
    {
      title: t('portal.shipments.trackingPreview.trackingNumber', {
        defaultValue: 'Tracking Number',
      }),
      dataIndex: 'trackingNumber',
      render: (value) => (
        <Typography.Text copyable={Boolean(value)}>{value || '-'}</Typography.Text>
      ),
    },
    {
      title: t('portal.shipments.trackingPreview.status', { defaultValue: 'Status' }),
      width: 170,
      render: (_, shipment) => {
        if (shipment.marketplaceConfirmationStatus === 'CONFIRMED') {
          return <Tag color="success">✓ Confirmed</Tag>
        }
        if (shipment.marketplaceConfirmationStatus === 'SUBMITTED') {
          return <Tag color="processing">⏳ Submitted</Tag>
        }
        if (shipment.marketplaceConfirmationStatus === 'FAILED') {
          return <Tag color="error">Upload Failed</Tag>
        }
        return isReady(shipment) ? (
          <Tag color="cyan">Ready to upload</Tag>
        ) : (
          <Tag color="warning">Missing Info</Tag>
        )
      },
    },
  ]

  const readyCount = selectedRowKeys.length

  return (
    <Modal
      footer={
        <Space>
          <Button onClick={onClose}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
          {effectiveAgentId ? (
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
          ) : null}
        </Space>
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

      {availableAgents.length > 1 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <Typography.Text strong>Worker Extension:</Typography.Text>
          <Select
            value={effectiveAgentId}
            onChange={setSelectedAgentIdOverride}
            style={{ minWidth: 260 }}
            options={availableAgents.map((a) => ({
              value: a.id,
              label: `${a.label || a.clientId} (${a.status})`,
            }))}
          />
        </div>
      ) : null}

      {!effectiveAgentId && !agentsQuery.isLoading ? (
        <Alert
          showIcon
          type="warning"
          message={t('portal.shipments.trackingPreview.noAgentWarning', {
            defaultValue: 'Chưa có Worker Extension kết nối',
          })}
          description={t('portal.shipments.trackingPreview.noAgentDesc', {
            defaultValue:
              'Shop này hiện chưa có Worker Extension nào kết nối (hoặc extension đang offline). Bạn chỉ có thể xem trước danh sách, cần Worker Extension online để gửi tracking lên sàn.',
          })}
          style={{ marginTop: 12 }}
        />
      ) : null}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Segmented
          value={filterMode}
          onChange={(val) => setFilterMode(val as 'PENDING' | 'CONFIRMED' | 'ALL')}
          options={[
            { label: `Cần gửi (${pendingCount})`, value: 'PENDING' },
            { label: `Đã xác nhận (${confirmedCount})`, value: 'CONFIRMED' },
            { label: `Tất cả (${totalCount})`, value: 'ALL' },
          ]}
        />
        <Typography.Text type="secondary">
          {readyCount} đơn được chọn để gửi lên Amazon
        </Typography.Text>
      </div>

      <Table<PreviewShipment>
        columns={columns}
        dataSource={displayedShipments}
        loading={shipments.isLoading}
        pagination={false}
        rowKey="id"
        rowSelection={
          effectiveAgentId
            ? {
                selectedRowKeys,
                onChange: (keys) => setSelectedKeysOverride(keys as string[]),
                getCheckboxProps: (record) => ({
                  disabled: !canSelectForUpload(record),
                }),
              }
            : undefined
        }
        scroll={{ x: 900 }}
        style={{ marginTop: 12 }}
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
