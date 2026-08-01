import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { ReloadOutlined, SendOutlined } from '@ant-design/icons'
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
  getVendorSubmission,
  listVendorSubmissions,
  reconcileVendorSubmission,
  retryVendorSubmission,
  submitVendorSubmission,
  type VendorSubmission,
  type VendorSubmissionStatus,
} from '../api/vendorSubmissionApi'
import { vendorSubmissionKeys } from '../api/vendorSubmissionKeys'
import styles from './VendorSubmissionWorkbenchPage.module.scss'

const STATUSES: VendorSubmissionStatus[] = [
  'READY',
  'SUBMITTING',
  'NEEDS_REVIEW',
  'FAILED',
  'SUBMITTED',
  'CANCELLED',
]
const PAGE_SIZE = 20

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
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<VendorSubmissionStatus>()
  const [externalOrderId, setExternalOrderId] = useState('')
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const [selectedId, setSelectedId] = useState<string>()
  const [reconcileRow, setReconcileRow] = useState<VendorSubmission>()
  const [vendorExternalOrderId, setVendorExternalOrderId] = useState('')
  const canWrite = Boolean(
    account &&
    [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)].includes(
      'VENDOR_SUBMISSIONS:WRITE',
    ),
  )
  const params = {
    page,
    limit: PAGE_SIZE,
    status,
    externalOrderId: externalOrderId || undefined,
    ...dates,
  }
  const submissions = useQuery({
    queryKey: vendorSubmissionKeys.list(params),
    queryFn: () => listVendorSubmissions(params),
    retry: false,
  })
  const detail = useQuery({
    queryKey: vendorSubmissionKeys.detail(selectedId ?? ''),
    queryFn: () => getVendorSubmission(selectedId!),
    enabled: Boolean(selectedId),
    retry: false,
  })
  const refresh = async () => queryClient.invalidateQueries({ queryKey: vendorSubmissionKeys.all })
  const action = useMutation({
    mutationFn: async ({
      kind,
      row,
      externalId,
    }: {
      kind: 'submit' | 'retry' | 'found' | 'missing'
      row: VendorSubmission
      externalId?: string
    }) => {
      if (kind === 'submit') return submitVendorSubmission(row.id)
      if (kind === 'retry')
        return retryVendorSubmission(row.id, t('portal.vendorSubmissions.reasons.payloadCorrected'))
      if (kind === 'missing')
        return reconcileVendorSubmission(row.id, {
          outcome: 'REMOTE_NOT_FOUND',
          reason: t('portal.vendorSubmissions.reasons.remoteMissing'),
        })
      if (!externalId) throw new Error(t('portal.vendorSubmissions.externalIdRequired'))
      return reconcileVendorSubmission(row.id, {
        outcome: 'REMOTE_FOUND',
        vendorExternalOrderId: externalId,
        reason: t('portal.vendorSubmissions.reasons.remoteFound'),
      })
    },
    onSuccess: async () => {
      await refresh()
      toast('success', t('portal.vendorSubmissions.updated'))
    },
    onError: (error) =>
      toast(
        'error',
        error instanceof Error ? error.message : t('portal.vendorSubmissions.actionFailed'),
      ),
  })
  const run = (kind: 'submit' | 'retry' | 'found' | 'missing', row: VendorSubmission) => {
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
      onOk: () => action.mutateAsync({ kind, row }),
    })
  }
  const columns: TableColumnsType<VendorSubmission> = [
    {
      title: t('portal.vendorSubmissions.columns.order'),
      dataIndex: 'externalOrderId',
      render: (value, row) => value || row.id,
    },
    {
      title: t('portal.vendorSubmissions.columns.product'),
      render: (_, row) => (
        <>
          <Typography.Text>{row.listingTitle || row.vendorProductName || '-'}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{row.sku || row.costCenterCode || '-'}</Typography.Text>
        </>
      ),
    },
    {
      title: t('portal.vendorSubmissions.columns.vendor'),
      render: (_, row) => `${row.vendorName || '-'} / ${row.provider || '-'}`,
    },
    {
      title: t('portal.vendorSubmissions.columns.status'),
      dataIndex: 'status',
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
                  run('submit', row)
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
                  run('retry', row)
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
                    run('found', row)
                  }}
                >
                  {t('portal.vendorSubmissions.actions.remoteFound')}
                </Button>
                <Button
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation()
                    run('missing', row)
                  }}
                >
                  {t('portal.vendorSubmissions.actions.remoteMissing')}
                </Button>
              </>
            ) : null}
          </Space>
        ) : null,
    },
  ]

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.vendorSubmissions.title')}
        description={t('portal.vendorSubmissions.description')}
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void submissions.refetch()}>
            {t('portal.vendorSubmissions.refresh')}
          </Button>
        }
      />
      {submissions.error ? (
        <FeedbackAlert type="error" title={t('portal.vendorSubmissions.unavailable')} />
      ) : null}
      <SectionCard>
        <DataTable
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
            </FilterBar>
          }
        />
      </SectionCard>
      <Drawer
        width={560}
        open={Boolean(selectedId)}
        title={t('portal.vendorSubmissions.detail')}
        onClose={() => setSelectedId(undefined)}
        loading={detail.isLoading}
      >
        {detail.data ? (
          <div className={styles.detail}>
            <Descriptions
              column={1}
              bordered
              size="small"
              items={[
                {
                  key: 'order',
                  label: t('portal.vendorSubmissions.externalOrderId'),
                  children: detail.data.externalOrderId || '-',
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
                  children: (
                    <span className={styles.failure}>{detail.data.failureReason || '-'}</span>
                  ),
                },
              ]}
            />
            <Timeline
              items={(detail.data.statusHistory ?? [])
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
                }))}
            />
          </div>
        ) : null}
      </Drawer>
      <Modal
        title={t('portal.vendorSubmissions.remoteOrderTitle')}
        open={Boolean(reconcileRow)}
        okText={t('portal.vendorSubmissions.markSubmitted')}
        okButtonProps={{ disabled: !vendorExternalOrderId.trim() }}
        confirmLoading={action.isPending}
        onCancel={() => setReconcileRow(undefined)}
        onOk={async () => {
          if (!reconcileRow) return
          await action.mutateAsync({
            kind: 'found',
            row: reconcileRow,
            externalId: vendorExternalOrderId.trim(),
          })
          setReconcileRow(undefined)
        }}
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
