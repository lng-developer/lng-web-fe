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
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
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

import type {
  VendorSubmission,
  VendorSubmissionParams,
  VendorSubmissionStatus,
} from '../api/vendorSubmissionApi'
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
  const [selectedId, setSelectedId] = useState<string>()
  const [reconcileRow, setReconcileRow] = useState<VendorSubmission>()
  const [vendorExternalOrderId, setVendorExternalOrderId] = useState('')
  const [payloadId, setPayloadId] = useState<string>()
  const [operationalAction, setOperationalAction] = useState<{
    kind: 'fail' | 'cancel'
    row: VendorSubmission
  }>()
  const [reason, setReason] = useState('')

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
    (kind: 'submit' | 'retry' | 'found' | 'missing', row: VendorSubmission) => {
      if (kind === 'found') {
        setReconcileRow(row)
        setVendorExternalOrderId('')
        return
      }
      Modal.confirm({
        title:
          kind === 'submit'
            ? t('portal.vendorSubmissions.confirmSubmit')
            : t('portal.vendorSubmissions.confirmReconcile'),
        content: kind === 'missing' ? t('portal.vendorSubmissions.remoteMissingHelp') : undefined,
        okText: t('portal.vendorSubmissions.confirm'),
        onOk: () =>
          action.mutateAsync({
            kind,
            row,
            retryReason: t('portal.vendorSubmissions.reasons.payloadCorrected'),
            remoteMissingReason: t('portal.vendorSubmissions.reasons.remoteMissing'),
          }),
      })
    },
    [action, t],
  )

  const handleCloseDrawer = useCallback(() => {
    setSelectedId(undefined)
  }, [])

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

  const columns: TableColumnsType<VendorSubmission> = useMemo(
    () => [
      {
        title: t('portal.vendorSubmissions.columns.order'),
        dataIndex: 'externalOrderId',
        width: 176,
        render: (value) => <CopyableOrderId value={value} />,
      },
      {
        title: t('portal.vendorSubmissions.columns.product'),
        render: (_, row) => (
          <Typography.Text strong>{row.sku || row.costCenterCode || '-'}</Typography.Text>
        ),
      },
      {
        title: t('portal.vendorSubmissions.columns.vendor'),
        width: 172,
        render: (_, row) => `${row.vendorName || '-'} / ${row.provider || '-'}`,
      },
      {
        title: t('portal.vendorSubmissions.columns.status'),
        dataIndex: 'status',
        width: 128,
        render: (value: VendorSubmissionStatus) => (
          <StatusTag status={tone(value)}>
            {t(`portal.vendorSubmissions.statuses.${value}`)}
          </StatusTag>
        ),
      },
      {
        title: t('portal.vendorSubmissions.columns.attempts'),
        dataIndex: 'submitAttemptCount',
        width: 90,
      },
      {
        title: t('portal.vendorSubmissions.columns.failure'),
        dataIndex: 'failureReason',
        ellipsis: true,
      },
      {
        title: t('portal.vendorSubmissions.columns.action'),
        key: 'action',
        width: 260,
        render: (_, row) =>
          canWrite ? (
            <Space wrap>
              {row.status === 'READY' ? (
                <Button
                  size="small"
                  icon={<SendOutlined />}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleRun('submit', row)
                  }}
                >
                  {t('portal.vendorSubmissions.actions.submit')}
                </Button>
              ) : null}
              {row.status === 'FAILED' ? (
                <Button
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleRun('retry', row)
                  }}
                >
                  {t('portal.vendorSubmissions.actions.returnReady')}
                </Button>
              ) : null}
              {row.status === 'NEEDS_REVIEW' ? (
                <>
                  <Button
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleRun('found', row)
                    }}
                  >
                    {t('portal.vendorSubmissions.actions.remoteFound')}
                  </Button>
                  <Button
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleRun('missing', row)
                    }}
                  >
                    {t('portal.vendorSubmissions.actions.remoteMissing')}
                  </Button>
                </>
              ) : null}
            </Space>
          ) : null,
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
              <br />
              <Typography.Text type="secondary">
                {entry.at ? new Date(entry.at).toLocaleString() : ''}
              </Typography.Text>
            </>
          ),
        })),
    [detail.data?.statusHistory, t],
  )

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
            value={summary.data?.[key] ?? 0}
            loading={summary.isLoading}
          />
        ))}
      </div>
      <SectionCard>
        <CoreDataTable
          tableLayout="fixed"
          scroll={{ x: 1_100 }}
          rowKey="id"
          columns={columns}
          dataSource={submissions.data?.items ?? []}
          loading={submissions.isLoading}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: submissions.data?.pagination.total,
            onChange: setPage,
          }}
          toolbar={
            <FilterBar
              label={t('portal.vendorSubmissions.filters')}
              contentClassName={styles.filters}
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
      </SectionCard>
      <Drawer
        size={720}
        open={Boolean(selectedId)}
        title={t('portal.vendorSubmissions.detail')}
        onClose={handleCloseDrawer}
        loading={detail.isLoading}
        extra={
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
      </Drawer>
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
