import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  DownloadOutlined,
  EyeOutlined,
  SendOutlined,
  StopOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Input, Modal, Select, Space, Tag, Timeline, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  CopyableOrderId,
  DetailModal,
  CopyableSku,
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

import type {
  VendorSubmission,
  VendorSubmissionParams,
  VendorSubmissionStatus,
} from '../api/vendorSubmissionApi'
import { getVendorProductionLines } from '../api/vendorSubmissionApi'
import {
  useExportVendorSubmissionsCsvMutation,
  useVendorSubmissionActionMutation,
  useVendorSubmissionDetailQuery,
  useVendorSubmissionPayloadQuery,
  useVendorSubmissionsQuery,
  useVendorSubmissionSummaryQuery,
} from '../hooks'
import styles from './VendorSubmissionWorkbenchPage.module.scss'

const STATUSES: VendorSubmissionStatus[] = [
  'READY',
  'SUBMITTING',
  'NEEDS_REVIEW',
  'FAILED',
  'SUBMITTED',
  'CANCELLED',
]
const PAGE_SIZE = DEFAULT_PAGE_SIZE

function tone(status: VendorSubmissionStatus) {
  if (status === 'SUBMITTED') return 'operational'
  if (status === 'READY') return 'ready'
  if (status === 'SUBMITTING') return 'processing'
  if (status === 'FAILED') return 'critical'
  if (status === 'NEEDS_REVIEW') return 'warning'
  if (status === 'CANCELLED') return 'cancelled'
  return 'pending'
}

function formatVendorMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount === null || amount === undefined) return '-'
  return `${(amount / 100).toFixed(2)} ${currency || 'USD'}`
}

export function VendorSubmissionWorkbenchPage({
  account: accountProp,
}: {
  readonly account?: CurrentAccount
}) {
  const { t } = useTranslation()
  const loadedAccount = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const account = accountProp ?? loadedAccount
  const toast = useFeedbackToast()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<VendorSubmissionStatus>()
  const [externalOrderId, setExternalOrderId] = useState('')
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const [selectedId, setSelectedId] = useResourceSelection()
  const [reconcileRow, setReconcileRow] = useState<VendorSubmission>()
  const [vendorExternalOrderId, setVendorExternalOrderId] = useState('')
  const [payloadId, setPayloadId] = useState<string>()
  const [operationalAction, setOperationalAction] = useState<{
    kind: 'fail' | 'cancel'
    row: VendorSubmission
  }>()
  const [reason, setReason] = useState('')
  const [productionLineId, setProductionLineId] = useState<string>()

  const canWrite = useMemo(
    () =>
      Boolean(
        account &&
        [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)].includes(
          'VENDOR_SUBMISSIONS:WRITE',
        ),
      ),
    [account],
  )

  const params: VendorSubmissionParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      status,
      externalOrderId: externalOrderId || undefined,
      ...dates,
    }),
    [page, status, externalOrderId, dates],
  )

  const summaryFilters = useMemo(
    () => ({
      status,
      externalOrderId: externalOrderId || undefined,
      ...dates,
    }),
    [status, externalOrderId, dates],
  )

  const submissions = useVendorSubmissionsQuery(params)
  const summary = useVendorSubmissionSummaryQuery(summaryFilters)
  const payload = useVendorSubmissionPayloadQuery(payloadId)
  const detail = useVendorSubmissionDetailQuery(selectedId)

  const action = useVendorSubmissionActionMutation({
    onSuccess: () => {
      toast('success', t('portal.vendorSubmissions.updated'))
    },
    onError: (error) => {
      toast(
        'error',
        error instanceof Error ? error.message : t('portal.vendorSubmissions.actionFailed'),
      )
    },
  })

  const exportCsv = useExportVendorSubmissionsCsvMutation()

  const handleRun = useCallback(
    async (kind: 'submit' | 'retry' | 'found' | 'missing', row: VendorSubmission) => {
      if (kind === 'found') {
        setReconcileRow(row)
        setVendorExternalOrderId('')
        return
      }
      let lineOptions: Array<{ label: string; value: string }> = []
      let selectedLineId = productionLineId
      if (kind === 'submit' && row.provider === 'MANGOTEE' && row.vendorId) {
        const result = await getVendorProductionLines(row.vendorId, row.provider)
        lineOptions = result.items
          .filter((line) => line.isActive)
          .map((line) => ({ label: line.name, value: line.id }))
        if (!lineOptions.length) {
          toast('error', 'MangoTee không có production line đang hoạt động')
          return
        }
        selectedLineId = lineOptions[0].value
        setProductionLineId(selectedLineId)
      }
      Modal.confirm({
        title:
          kind === 'submit'
            ? t('portal.vendorSubmissions.confirmSubmit')
            : t('portal.vendorSubmissions.confirmReconcile'),
        content:
          kind === 'missing' ? (
            t('portal.vendorSubmissions.remoteMissingHelp')
          ) : lineOptions.length ? (
            <Select
              style={{ width: '100%' }}
              defaultValue={lineOptions[0].value}
              options={lineOptions}
              onChange={(value) => {
                selectedLineId = value
                setProductionLineId(value)
              }}
            />
          ) : undefined,
        okText: t('portal.vendorSubmissions.confirm'),
        onOk: () =>
          action.mutateAsync({
            kind,
            row,
            retryReason: t('portal.vendorSubmissions.reasons.payloadCorrected'),
            remoteMissingReason: t('portal.vendorSubmissions.reasons.remoteMissing'),
            productionLineId: kind === 'submit' ? selectedLineId : undefined,
          }),
      })
    },
    [action, productionLineId, t, toast],
  )

  const handleCloseDrawer = useCallback(() => {
    setSelectedId(undefined)
  }, [setSelectedId])

  const handleClosePayloadModal = useCallback(() => {
    setPayloadId(undefined)
  }, [])

  const handleCloseOperationalModal = useCallback(() => {
    setOperationalAction(undefined)
  }, [])

  const handleConfirmOperationalAction = useCallback(async () => {
    if (!operationalAction) return
    await action.mutateAsync({
      kind: operationalAction.kind,
      row: operationalAction.row,
      externalId: reason.trim(),
    })
    setOperationalAction(undefined)
  }, [action, operationalAction, reason])

  const handleCloseReconcileModal = useCallback(() => {
    setReconcileRow(undefined)
  }, [])

  const handleConfirmReconcile = useCallback(async () => {
    if (!reconcileRow) return
    await action.mutateAsync({
      kind: 'found',
      row: reconcileRow,
      externalId: vendorExternalOrderId.trim(),
      remoteFoundReason: t('portal.vendorSubmissions.reasons.remoteFound'),
    })
    setReconcileRow(undefined)
  }, [action, reconcileRow, vendorExternalOrderId, t])

  const rows = useMemo(() => {
    const items = submissions.data?.items ?? []
    const map = new Map<string, VendorSubmission & { bundledSubmissions: VendorSubmission[] }>()
    for (const sub of items) {
      const key = sub.externalOrderId || sub.id
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          ...sub,
          bundledSubmissions: [sub],
        })
      } else {
        existing.bundledSubmissions.push(sub)
      }
    }
    return Array.from(map.values())
  }, [submissions.data?.items])

  const columns: TableColumnsType<VendorSubmission> = useMemo(
    () => [
      {
        title: t('portal.vendorSubmissions.columns.order'),
        dataIndex: 'externalOrderId',
        width: 176,
        render: (value, row) => {
          const all: VendorSubmission[] = (
            row as unknown as { bundledSubmissions?: VendorSubmission[] }
          ).bundledSubmissions || [row]
          return (
            <Space size={6} wrap={false} align="center">
              <CopyableOrderId value={value} />
              {all.length > 1 ? (
                <Tag color="blue" style={{ marginInlineEnd: 0, fontWeight: 500 }}>
                  {all.length} items
                </Tag>
              ) : null}
            </Space>
          )
        },
      },
      {
        title: t('portal.vendorSubmissions.columns.product'),
        width: 180,
        render: (_, row) => {
          const all: VendorSubmission[] = (
            row as unknown as { bundledSubmissions?: VendorSubmission[] }
          ).bundledSubmissions || [row]
          if (all.length > 1) {
            return (
              <Space direction="vertical" size={2}>
                {all.map((item, idx) =>
                  item.sku ? (
                    <CopyableSku key={item.id || idx} strong value={item.sku} />
                  ) : (
                    <TableTextCell
                      key={item.id || idx}
                      strong
                      value={item.costCenterCode}
                      fallback="-"
                    />
                  ),
                )}
              </Space>
            )
          }
          return row.sku ? (
            <CopyableSku strong value={row.sku} />
          ) : (
            <TableTextCell strong value={row.costCenterCode} fallback="-" />
          )
        },
      },
      {
        title: t('portal.vendorSubmissions.columns.vendor'),
        width: 172,
        render: (_, row) => (
          <TableTextCell value={`${row.vendorName || '-'} / ${row.provider || '-'}`} />
        ),
      },
      {
        title: t('portal.vendorSubmissions.columns.status'),
        dataIndex: 'status',
        width: 128,
        render: (_, row) => {
          const all: VendorSubmission[] = (
            row as unknown as { bundledSubmissions?: VendorSubmission[] }
          ).bundledSubmissions || [row]
          const statuses = Array.from(new Set(all.map((item) => item.status)))
          return (
            <Space size={4} wrap>
              {statuses.map((s) => (
                <StatusTag key={s} status={tone(s)}>
                  {t(`portal.vendorSubmissions.statuses.${s}`)}
                </StatusTag>
              ))}
            </Space>
          )
        },
      },
      {
        title: t('portal.vendorSubmissions.columns.attempts'),
        dataIndex: 'submitAttemptCount',
        width: 90,
        render: (_, row) => {
          const all: VendorSubmission[] = (
            row as unknown as { bundledSubmissions?: VendorSubmission[] }
          ).bundledSubmissions || [row]
          return Math.max(...all.map((i) => i.submitAttemptCount || 0))
        },
      },
      {
        title: t('portal.vendorSubmissions.columns.failure'),
        dataIndex: 'failureReason',
        width: 240,
        render: (_, row) => {
          const all: VendorSubmission[] = (
            row as unknown as { bundledSubmissions?: VendorSubmission[] }
          ).bundledSubmissions || [row]
          const reasons = Array.from(new Set(all.map((i) => i.failureReason).filter(Boolean)))
          const value = reasons.join('; ')
          return (
            <TableTextCell
              value={value}
              fallback="—"
              expandable={Boolean(value && value.length > 36)}
            />
          )
        },
      },
      {
        title: t('portal.vendorSubmissions.columns.action'),
        key: 'action',
        width: 260,
        render: (_, row) => {
          const all: VendorSubmission[] = (
            row as unknown as { bundledSubmissions?: VendorSubmission[] }
          ).bundledSubmissions || [row]
          const anyReady = all.some((i) => i.status === 'READY')
          const anyFailed = all.some((i) => i.status === 'FAILED')
          const anyNeedsReview = all.some((i) => i.status === 'NEEDS_REVIEW')
          const primaryReadyRow = all.find((i) => i.status === 'READY') || row
          const primaryFailedRow = all.find((i) => i.status === 'FAILED') || row
          const primaryReviewRow = all.find((i) => i.status === 'NEEDS_REVIEW') || row

          return canWrite ? (
            <Space wrap>
              {anyReady ? (
                <Button
                  size="small"
                  icon={<SendOutlined />}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleRun('submit', primaryReadyRow)
                  }}
                >
                  {t('portal.vendorSubmissions.actions.submit')}
                </Button>
              ) : null}
              {anyFailed ? (
                <Button
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleRun('retry', primaryFailedRow)
                  }}
                >
                  {t('portal.vendorSubmissions.actions.returnReady')}
                </Button>
              ) : null}
              {anyNeedsReview ? (
                <>
                  <Button
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleRun('found', primaryReviewRow)
                    }}
                  >
                    {t('portal.vendorSubmissions.actions.remoteFound')}
                  </Button>
                  <Button
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleRun('missing', primaryReviewRow)
                    }}
                  >
                    {t('portal.vendorSubmissions.actions.remoteMissing')}
                  </Button>
                </>
              ) : null}
            </Space>
          ) : null
        },
      },
    ],
    [canWrite, handleRun, t],
  )

  const timelineItems = useMemo(
    () =>
      (detail.data?.statusHistory ?? [])
        .slice()
        .reverse()
        .map((entry) => ({
          children: (
            <>
              <strong>{t(`portal.vendorSubmissions.statuses.${entry.status}`)}</strong>
              <br />
              {entry.reason || ''}
              {entry.at ? (
                <div style={{ marginTop: 2 }}>
                  <FormattedDateTime value={entry.at} />
                </div>
              ) : null}
            </>
          ),
        })),
    [detail.data?.statusHistory, t],
  )

  const orderSummary = useMemo(() => {
    if (!externalOrderId && summary.data) {
      return summary.data
    }
    if (externalOrderId) {
      const total = rows.length
      const ready = rows.filter(
        (r) =>
          r.status === 'READY' || (r.bundledSubmissions || []).some((b) => b.status === 'READY'),
      ).length
      const submitted = rows.filter(
        (r) =>
          r.status === 'SUBMITTED' ||
          (r.bundledSubmissions || []).some((b) => b.status === 'SUBMITTED'),
      ).length
      const failed = rows.filter(
        (r) =>
          r.status === 'FAILED' || (r.bundledSubmissions || []).some((b) => b.status === 'FAILED'),
      ).length
      const cancelled = rows.filter(
        (r) =>
          r.status === 'CANCELLED' ||
          (r.bundledSubmissions || []).every((b) => b.status === 'CANCELLED'),
      ).length
      return {
        total,
        ready,
        submitted,
        failed,
        cancelled,
        byStatus: {},
      }
    }
    return summary.data
  }, [externalOrderId, rows, summary.data])

  return (
    <section className={styles.page}>
      {submissions.error ? (
        <FeedbackAlert type="error" title={t('portal.vendorSubmissions.unavailable')} />
      ) : null}
      <div className={styles.metrics}>
        {(['total', 'ready', 'submitted', 'failed', 'cancelled'] as const).map((key) => (
          <MetricCard
            key={key}
            label={t(`portal.vendorSubmissions.metrics.${key}`)}
            value={orderSummary?.[key] ?? 0}
            loading={summary.isLoading}
          />
        ))}
      </div>
      <div className={styles.tableArea}>
        <CoreDataTable
          fillViewport
          tableLayout="fixed"
          scroll={{ x: 1_100 }}
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={submissions.isLoading}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: externalOrderId ? rows.length : submissions.data?.pagination.total,
            showSizeChanger: true,
            onChange: setPage,
          }}
          toolbar={
            <FilterBar
              label={t('portal.vendorSubmissions.filters')}
              contentClassName={styles.filters}
              actions={
                <DataFreshness
                  timestamp={submissions.dataUpdatedAt}
                  onRefresh={() => void submissions.refetch()}
                  loading={submissions.isFetching}
                />
              }
            >
              <Input.Search
                allowClear
                placeholder={t('portal.vendorSubmissions.externalOrderId')}
                value={externalOrderId}
                onChange={(event) => setExternalOrderId(event.target.value)}
                onSearch={() => setPage(1)}
              />
              <Select
                allowClear
                className={styles.filterControl}
                placeholder={t('portal.vendorSubmissions.allStatuses')}
                options={STATUSES.map((value) => ({
                  value,
                  label: t(`portal.vendorSubmissions.statuses.${value}`),
                }))}
                value={status}
                onChange={(value) => {
                  setStatus(value)
                  setPage(1)
                }}
              />
              <DateRangePicker
                value={dates}
                onChange={(value) => {
                  setDates(value)
                  setPage(1)
                }}
              />
              <Button
                icon={<DownloadOutlined />}
                loading={exportCsv.isPending}
                onClick={() => exportCsv.mutate(params)}
              >
                {t('portal.vendorSubmissions.exportCsv')}
              </Button>
            </FilterBar>
          }
        />
      </div>
      <DetailModal
        destroyOnClose
        width="min(1360px, 92vw)"
        drawerWidth="min(860px, 65vw)"
        open={Boolean(selectedId)}
        title={t('portal.vendorSubmissions.detail')}
        onClose={handleCloseDrawer}
        loading={detail.isLoading}
        footer={
          detail.data ? (
            <Space>
              <Button icon={<EyeOutlined />} onClick={() => setPayloadId(detail.data!.id)}>
                {t('portal.vendorSubmissions.actions.previewPayload')}
              </Button>
              {canWrite && !['SUBMITTED', 'CANCELLED'].includes(detail.data.status) ? (
                <Button
                  danger
                  icon={<WarningOutlined />}
                  onClick={() => {
                    setReason('')
                    setOperationalAction({ kind: 'fail', row: detail.data! })
                  }}
                >
                  {t('portal.vendorSubmissions.actions.markFailed')}
                </Button>
              ) : null}
              {canWrite && !['SUBMITTED', 'CANCELLED'].includes(detail.data.status) ? (
                <Button
                  icon={<StopOutlined />}
                  onClick={() => {
                    setReason('')
                    setOperationalAction({ kind: 'cancel', row: detail.data! })
                  }}
                >
                  {t('portal.vendorSubmissions.actions.cancel')}
                </Button>
              ) : null}
            </Space>
          ) : null
        }
      >
        {detail.isError ? (
          <FeedbackAlert type="error" title={t('notifications.resourceUnavailable')} />
        ) : null}
        {detail.data ? (
          <div className={styles.detail}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 20,
                padding: '12px 16px',
                background: 'var(--ant-color-fill-quaternary)',
                borderRadius: 8,
              }}
            >
              <StatusTag status={tone(detail.data.status)}>
                {t(`portal.vendorSubmissions.statuses.${detail.data.status}`)}
              </StatusTag>
              <CopyableOrderId strong value={detail.data.externalOrderId} />
            </div>

            <Descriptions
              column={2}
              bordered
              size="small"
              style={{ marginBottom: 20 }}
              items={[
                {
                  key: 'order',
                  label: t('portal.vendorSubmissions.externalOrderId'),
                  children: <CopyableOrderId value={detail.data.externalOrderId} fallback="-" />,
                },
                {
                  key: 'vendorOrder',
                  label: t('portal.vendorSubmissions.vendorOrderId'),
                  children: detail.data.vendorExternalOrderId || '-',
                },
                {
                  key: 'provider',
                  label: t('portal.vendorSubmissions.vendorProvider'),
                  children: `${detail.data.vendorName || '-'} / ${detail.data.provider || '-'}`,
                },
                {
                  key: 'attempts',
                  label: t('portal.vendorSubmissions.submitAttempts'),
                  children: detail.data.submitAttemptCount,
                },
                ...(detail.data.vendorCost
                  ? [
                      {
                        key: 'vendorBaseCost',
                        label: 'Vendor base cost',
                        children: formatVendorMoney(
                          detail.data.vendorCost.vendorBaseCostAmount,
                          detail.data.vendorCost.currency,
                        ),
                      },
                      {
                        key: 'systemBaseCost',
                        label: 'System base cost (+$1)',
                        children: formatVendorMoney(
                          detail.data.vendorCost.baseCostAmount,
                          detail.data.vendorCost.currency,
                        ),
                      },
                      {
                        key: 'vendorShipping',
                        label: 'Vendor shipping',
                        children: formatVendorMoney(
                          detail.data.vendorCost.shippingAmount,
                          detail.data.vendorCost.currency,
                        ),
                      },
                      {
                        key: 'vendorTotal',
                        label: 'Vendor total',
                        children: formatVendorMoney(
                          detail.data.vendorCost.totalAmount,
                          detail.data.vendorCost.currency,
                        ),
                      },
                    ]
                  : []),
                {
                  key: 'failure',
                  label: t('portal.vendorSubmissions.columns.failure'),
                  span: 2,
                  children: (
                    <span className={styles.failure}>{detail.data.failureReason || '-'}</span>
                  ),
                },
              ]}
            />

            <Typography.Text strong style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              Status History
            </Typography.Text>
            <Timeline items={timelineItems} />
          </div>
        ) : null}
      </DetailModal>
      <Modal
        open={Boolean(payloadId)}
        width={760}
        footer={null}
        title={t('portal.vendorSubmissions.payloadPreview')}
        onCancel={handleClosePayloadModal}
      >
        {payload.isError ? (
          <FeedbackAlert type="error" title={t('portal.vendorSubmissions.payloadUnavailable')} />
        ) : (
          <pre className={styles.payload}>{JSON.stringify(payload.data ?? {}, null, 2)}</pre>
        )}
      </Modal>
      <Modal
        open={Boolean(operationalAction)}
        title={t(`portal.vendorSubmissions.actions.${operationalAction?.kind || 'cancel'}`)}
        okButtonProps={{
          danger: true,
          disabled: operationalAction?.kind === 'fail' && !reason.trim(),
        }}
        confirmLoading={action.isPending}
        onCancel={handleCloseOperationalModal}
        onOk={handleConfirmOperationalAction}
      >
        <Input.TextArea
          rows={4}
          value={reason}
          placeholder={t('portal.vendorSubmissions.reason')}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
      <Modal
        title={t('portal.vendorSubmissions.remoteOrderTitle')}
        open={Boolean(reconcileRow)}
        okText={t('portal.vendorSubmissions.markSubmitted')}
        okButtonProps={{ disabled: !vendorExternalOrderId.trim() }}
        confirmLoading={action.isPending}
        onCancel={handleCloseReconcileModal}
        onOk={handleConfirmReconcile}
      >
        <Input
          aria-label={t('portal.vendorSubmissions.vendorOrderId')}
          placeholder={t('portal.vendorSubmissions.vendorOrderId')}
          value={vendorExternalOrderId}
          onChange={(event) => setVendorExternalOrderId(event.target.value)}
        />
      </Modal>
    </section>
  )
}

export default VendorSubmissionWorkbenchPage
