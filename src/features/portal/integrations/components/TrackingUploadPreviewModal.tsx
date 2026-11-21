import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Alert,
  Button,
  Collapse,
  message,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { CopyOutlined, CheckOutlined, FileTextOutlined } from '@ant-design/icons'

import {
  createAmazonTrackingSubmission,
  createExtensionCommand,
  listExtensionManagementAgents,
  previewAmazonTrackingSubmission,
  type AmazonTrackingPreviewRow,
} from '@/features/portal/integrations/api/integrationApi'

function canSelectRowForUpload(row: AmazonTrackingPreviewRow) {
  return (
    row.isReady &&
    row.marketplaceConfirmationStatus !== 'CONFIRMED' &&
    row.marketplaceConfirmationStatus !== 'SUBMITTED'
  )
}

export function TrackingUploadPreviewModal({
  shopId,
  agentId,
  mode = 'AMAZON',
  onClose,
}: {
  readonly shopId: string
  readonly agentId?: string
  readonly mode?: 'AMAZON' | 'ETSY'
  readonly onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedKeysOverride, setSelectedKeysOverride] = useState<string[]>()
  const [selectedAgentIdOverride, setSelectedAgentIdOverride] = useState<string>()
  const [filterMode, setFilterMode] = useState<'PENDING' | 'CONFIRMED' | 'ALL'>('PENDING')
  const [hasCopiedTsv, setHasCopiedTsv] = useState(false)

  const previewQuery = useQuery({
    queryKey: ['amazon-tracking-preview', shopId],
    queryFn: () => previewAmazonTrackingSubmission({ shopId }),
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

  const allItems = useMemo(() => previewQuery.data?.items ?? [], [previewQuery.data?.items])
  const summary = previewQuery.data?.summary

  const pendingCount = useMemo(() => {
    return allItems.filter((i) => i.marketplaceConfirmationStatus !== 'CONFIRMED').length
  }, [allItems])

  const confirmedCount = useMemo(() => {
    return allItems.filter((i) => i.marketplaceConfirmationStatus === 'CONFIRMED').length
  }, [allItems])

  const totalCount = allItems.length

  const displayedRows = useMemo(() => {
    if (filterMode === 'PENDING') {
      return allItems.filter((i) => i.marketplaceConfirmationStatus !== 'CONFIRMED')
    }
    if (filterMode === 'CONFIRMED') {
      return allItems.filter((i) => i.marketplaceConfirmationStatus === 'CONFIRMED')
    }
    return allItems
  }, [allItems, filterMode])

  const readyRowKeys = useMemo(
    () => allItems.filter(canSelectRowForUpload).map((r) => r.key),
    [allItems],
  )
  const selectedRowKeys = selectedKeysOverride ?? readyRowKeys

  const selectedRows = useMemo(() => {
    const keySet = new Set(selectedRowKeys)
    return allItems.filter((r) => keySet.has(r.key))
  }, [allItems, selectedRowKeys])

  const selectedShipmentIds = useMemo(() => {
    return selectedRows.flatMap((r) => r.shipmentIds)
  }, [selectedRows])

  const isEtsy = mode === 'ETSY'

  const readyOrderCount = selectedRows.length
  const readyItemCount = selectedShipmentIds.length

  const submitMutation = useMutation({
    mutationFn: async (shipmentIds: string[]) => {
      if (!effectiveAgentId) {
        throw new Error(
          t('portal.shipments.trackingPreview.agentRequired', {
            defaultValue: 'Extension agent is required',
          }),
        )
      }
      if (isEtsy) {
        await createExtensionCommand({
          type: 'UPLOAD_TRACKING',
          shopId,
          agentId: effectiveAgentId,
          items: selectedRows.map((row) => ({
            orderId: row.externalOrderId,
            trackingNumber: row.trackingNumber,
            carrier: row.carrierCode || row.carrier,
          })),
        })
      } else {
        await createAmazonTrackingSubmission({ shopId, agentId: effectiveAgentId, shipmentIds })
      }
    },
    onSuccess: () => {
      message.success(
        t(
          isEtsy
            ? 'portal.shipments.trackingPreview.etsySubmitSuccess'
            : 'portal.shipments.trackingPreview.submitSuccess',
          { defaultValue: 'Tracking command queued for Etsy Extension.' },
        ),
      )
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['amazon-tracking-preview'] })
      queryClient.invalidateQueries({ queryKey: ['extension-commands'] })
      onClose()
    },
    onError: (error: Error) => {
      message.error(
        error.message ||
          t(
            isEtsy
              ? 'portal.shipments.trackingPreview.etsySubmitError'
              : 'portal.shipments.trackingPreview.submitError',
            {
              defaultValue: isEtsy
                ? 'Failed to create Etsy tracking command'
                : 'Failed to submit tracking to Amazon',
            },
          ),
      )
    },
  })

  const copyTsv = () => {
    if (!previewQuery.data?.tsv) return
    navigator.clipboard.writeText(previewQuery.data.tsv)
    setHasCopiedTsv(true)
    message.success(
      t('portal.shipments.trackingPreview.copySuccess', {
        defaultValue: 'Amazon TSV feed content copied to clipboard',
      }),
    )
    setTimeout(() => setHasCopiedTsv(false), 2000)
  }

  const columns: TableColumnsType<AmazonTrackingPreviewRow> = [
    {
      title: (
        <div>
          <div>{t('portal.shipments.trackingPreview.orderId', { defaultValue: 'Order ID' })}</div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            order-id
          </Typography.Text>
        </div>
      ),
      dataIndex: 'externalOrderId',
      render: (value: string, record: AmazonTrackingPreviewRow) => (
        <Space vertical size={2}>
          <Space size={6} align="center">
            <Typography.Text copyable={Boolean(value && value !== '-')}>
              {value || '-'}
            </Typography.Text>
            {record.itemCount > 1 ? (
              <Tag color="blue">
                {t('portal.shipments.trackingPreview.itemCount', {
                  count: record.itemCount,
                  defaultValue: `${record.itemCount} items`,
                })}
              </Tag>
            ) : null}
          </Space>
          {record.externalItemId ? (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {t('portal.shipments.trackingPreview.itemPrefix', {
                id: record.externalItemId,
                defaultValue: `Item: ${record.externalItemId}`,
              })}{' '}
              {record.quantity ? `(x${record.quantity})` : ''}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: (
        <div>
          <div>{t('portal.shipments.trackingPreview.shipDate', { defaultValue: 'Ship Date' })}</div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            ship-date
          </Typography.Text>
        </div>
      ),
      dataIndex: 'shipDate',
      width: 125,
      render: (value: string) => (
        <Typography.Text strong style={{ fontFamily: 'monospace' }}>
          {value || '-'}
        </Typography.Text>
      ),
    },
    {
      title: (
        <div>
          <div>
            {t('portal.shipments.trackingPreview.carrierCode', { defaultValue: 'Carrier Code' })}
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            carrier-code
          </Typography.Text>
        </div>
      ),
      dataIndex: 'carrierCode',
      width: 125,
      render: (value: string) => (
        <Tag
          color={
            value === 'USPS'
              ? 'blue'
              : value === 'UPS'
                ? 'gold'
                : value === 'FedEx'
                  ? 'purple'
                  : 'default'
          }
        >
          {value || '-'}
        </Tag>
      ),
    },
    {
      title: (
        <div>
          <div>
            {t('portal.shipments.trackingPreview.carrierName', { defaultValue: 'Carrier Name' })}
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            carrier-name
          </Typography.Text>
        </div>
      ),
      dataIndex: 'carrierName',
      width: 130,
      render: (value: string) => value || <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: (
        <div>
          <div>
            {t('portal.shipments.trackingPreview.shipMethod', { defaultValue: 'Shipping Method' })}
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            ship-method
          </Typography.Text>
        </div>
      ),
      dataIndex: 'shipMethod',
      width: 175,
      render: (value: string) => <Typography.Text>{value || 'Standard'}</Typography.Text>,
    },
    {
      title: (
        <div>
          <div>
            {t('portal.shipments.trackingPreview.trackingNumber', {
              defaultValue: 'Tracking Number',
            })}
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            tracking-number
          </Typography.Text>
        </div>
      ),
      dataIndex: 'trackingNumber',
      render: (value: string) => (
        <Typography.Text copyable={Boolean(value)} style={{ fontFamily: 'monospace' }}>
          {value || '-'}
        </Typography.Text>
      ),
    },
    {
      title: t('portal.shipments.trackingPreview.status', { defaultValue: 'Status' }),
      width: 160,
      render: (_: unknown, record: AmazonTrackingPreviewRow) => {
        if (record.marketplaceConfirmationStatus === 'CONFIRMED') {
          return (
            <Tag color="success">
              {t('portal.shipments.trackingPreview.statusConfirmed', {
                defaultValue: '✓ Confirmed',
              })}
            </Tag>
          )
        }
        if (record.marketplaceConfirmationStatus === 'SUBMITTED') {
          return (
            <Tag color="processing">
              {t('portal.shipments.trackingPreview.statusSubmitted', {
                defaultValue: '⏳ Submitting to Amazon',
              })}
            </Tag>
          )
        }
        if (record.marketplaceConfirmationStatus === 'FAILED') {
          return (
            <Tag color="error">
              {t('portal.shipments.trackingPreview.statusFailed', {
                defaultValue: 'Submission Failed',
              })}
            </Tag>
          )
        }
        if (record.isReady) {
          return (
            <Tag color="cyan">
              {t('portal.shipments.trackingPreview.statusReady', {
                defaultValue: 'Ready to Submit',
              })}
            </Tag>
          )
        }
        const missingLabel = t('portal.shipments.trackingPreview.statusMissingData', {
          defaultValue: 'Missing Data',
        })
        return (
          <Tooltip title={record.issues?.join(', ') || missingLabel}>
            <Tag color="warning">{missingLabel}</Tag>
          </Tooltip>
        )
      },
    },
  ]

  return (
    <Modal
      footer={
        <Space>
          <Button onClick={onClose}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
          {effectiveAgentId ? (
            <Button
              type="primary"
              loading={submitMutation.isPending}
              disabled={readyOrderCount === 0}
              onClick={() => submitMutation.mutate(selectedShipmentIds)}
            >
              {isEtsy
                ? t('portal.shipments.trackingPreview.submitToEtsy', {
                    count: readyOrderCount,
                    defaultValue: `Create Etsy command for ${readyOrderCount} order(s)`,
                  })
                : readyItemCount > readyOrderCount
                  ? t('portal.shipments.trackingPreview.submitToAmazonWithItems', {
                      orderCount: readyOrderCount,
                      itemCount: readyItemCount,
                      defaultValue: `Submit ${readyOrderCount} orders (${readyItemCount} items) to Amazon`,
                    })
                  : t('portal.shipments.trackingPreview.submitToAmazon', {
                      count: readyOrderCount,
                      defaultValue: `Submit ${readyOrderCount} to Amazon`,
                    })}
            </Button>
          ) : null}
        </Space>
      }
      open
      title={t(
        isEtsy
          ? 'portal.shipments.trackingPreview.etsyTitle'
          : 'portal.shipments.trackingPreview.title',
        {
          defaultValue: isEtsy ? 'Etsy Tracking Upload Preview' : 'Amazon Tracking Upload Preview',
        },
      )}
      width="min(1250px, 94vw)"
      onCancel={onClose}
    >
      <Typography.Paragraph type="secondary">
        {t(
          isEtsy
            ? 'portal.shipments.trackingPreview.etsyDescription'
            : 'portal.shipments.trackingPreview.description',
          {
            defaultValue: isEtsy
              ? 'Select the pending orders to send as one tracking command to the Etsy Extension Worker.'
              : 'Preview the actual data fields that will be included in the TSV feed file and uploaded to Amazon Seller Central via the Extension Worker.',
          },
        )}
      </Typography.Paragraph>
      <Alert
        showIcon
        type="info"
        title={t(
          isEtsy
            ? 'portal.shipments.trackingPreview.etsyFeedSyncNote'
            : 'portal.shipments.trackingPreview.feedSyncNote',
          {
            defaultValue: isEtsy
              ? 'Selected orders will be included in one Etsy tracking command for the connected Extension Worker.'
              : 'Displayed data fields (order-id, ship-date, carrier-code, carrier-name, ship-method, tracking-number) are 100% synchronized with the Amazon TSV feed.',
          },
        )}
      />

      {availableAgents.length > 1 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <Typography.Text strong>
            {t('portal.shipments.trackingPreview.workerExtension', {
              defaultValue: 'Worker Extension:',
            })}
          </Typography.Text>
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
          title={t('portal.shipments.trackingPreview.noAgentWarning', {
            defaultValue: 'No connected Extension Worker',
          })}
          description={t('portal.shipments.trackingPreview.noAgentDesc', {
            defaultValue:
              'No Worker Extension is currently connected for this store (or it is offline). You can only preview the list; an online Worker Extension is required to submit tracking to the marketplace.',
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
            {
              label: t('portal.shipments.trackingPreview.filterPending', {
                count: summary?.readyOrders ?? pendingCount,
                defaultValue: `Pending (${summary?.readyOrders ?? pendingCount})`,
              }),
              value: 'PENDING',
            },
            {
              label: t('portal.shipments.trackingPreview.filterConfirmed', {
                count: summary?.confirmedOrders ?? confirmedCount,
                defaultValue: `Confirmed (${summary?.confirmedOrders ?? confirmedCount})`,
              }),
              value: 'CONFIRMED',
            },
            {
              label: t('portal.shipments.trackingPreview.filterAll', {
                count: totalCount,
                defaultValue: `All (${totalCount})`,
              }),
              value: 'ALL',
            },
          ]}
        />
        <Typography.Text type="secondary">
          {isEtsy
            ? t('portal.shipments.trackingPreview.selectedOrdersForEtsy', {
                count: readyOrderCount,
                defaultValue: `${readyOrderCount} order(s) selected for Etsy`,
              })
            : readyItemCount > readyOrderCount
              ? t('portal.shipments.trackingPreview.selectedOrdersWithItems', {
                  orderCount: readyOrderCount,
                  itemCount: readyItemCount,
                  defaultValue: `${readyOrderCount} orders (${readyItemCount} items) selected to submit to Amazon`,
                })
              : t('portal.shipments.trackingPreview.selectedOrders', {
                  count: readyOrderCount,
                  defaultValue: `${readyOrderCount} order(s) selected to submit to Amazon`,
                })}
        </Typography.Text>
      </div>

      <Table<AmazonTrackingPreviewRow>
        columns={columns}
        dataSource={displayedRows}
        loading={previewQuery.isLoading}
        pagination={false}
        rowKey="key"
        rowSelection={
          effectiveAgentId
            ? {
                selectedRowKeys,
                onChange: (keys) => setSelectedKeysOverride(keys as string[]),
                getCheckboxProps: (record) => ({
                  disabled: !canSelectRowForUpload(record),
                }),
              }
            : undefined
        }
        scroll={{ x: 1050 }}
        style={{ marginTop: 12 }}
      />

      {!isEtsy ? (
        <Collapse
          ghost
          style={{ marginTop: 16, border: '1px solid #d9d9d9', borderRadius: 8 }}
          items={[
            {
              key: 'tsv-feed',
              label: (
                <Space>
                  <FileTextOutlined />
                  <Typography.Text strong>
                    {t('portal.shipments.trackingPreview.tsvFeedPreviewTitle', {
                      count: previewQuery.data?.rowCount || 0,
                      defaultValue: `Amazon Feed Preview (TSV Preview - ${previewQuery.data?.rowCount || 0} rows)`,
                    })}
                  </Typography.Text>
                </Space>
              ),
              extra: previewQuery.data?.tsv ? (
                <Button
                  size="small"
                  icon={hasCopiedTsv ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    copyTsv()
                  }}
                >
                  {hasCopiedTsv
                    ? t('portal.shipments.trackingPreview.copiedTsv', { defaultValue: 'Copied' })
                    : t('portal.shipments.trackingPreview.copyTsv', { defaultValue: 'Copy TSV' })}
                </Button>
              ) : null,
              children: (
                <div>
                  <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                    {t('portal.shipments.trackingPreview.tsvDescription', {
                      defaultValue:
                        'The TSV file strictly follows the 19 columns of the Amazon Shipping Confirmation Template. The Extension Worker will upload this file to Amazon Seller Central.',
                    })}
                  </Typography.Paragraph>
                  <div
                    style={{
                      backgroundColor: '#1e1e1e',
                      color: '#d4d4d4',
                      padding: 12,
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      overflowX: 'auto',
                      whiteSpace: 'pre',
                      maxHeight: 240,
                    }}
                  >
                    {previewQuery.data?.tsv ||
                      t('portal.shipments.trackingPreview.tsvEmpty', {
                        defaultValue: 'No feed rows ready to submit.',
                      })}
                  </div>
                </div>
              ),
            },
          ]}
        />
      ) : null}
    </Modal>
  )
}
