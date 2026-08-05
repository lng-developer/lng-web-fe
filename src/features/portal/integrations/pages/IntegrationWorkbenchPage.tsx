import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Select } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { shopKeys } from '@/features/portal/shops/api/shopKeys'
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
  type ImportJob,
  type ImportJobListParams,
  type ImportJobStatus,
  type ImportSource,
  type ImportUploadInput,
  type ImportUploadSource,
  listImportJobs,
  uploadEtsySoldItems,
  uploadManualExcel,
} from '../api/integrationApi'
import { integrationKeys } from '../api/integrationKeys'
import { listAllActiveShops } from '../api/loadActiveShops'
import { canWriteOrdersForShop, canWriteOrdersSomewhere } from '../auth/integrationAccess'
import { ImportIssueQueue } from './ImportIssueQueue'
import { ImportJobPanel } from './ImportJobPanel'
import { ImportUploadModal } from './ImportUploadModal'
import styles from './IntegrationWorkbenchPage.module.scss'

const PAGE_SIZE = 20
const JOB_STATUSES: ImportJobStatus[] = [
  'PENDING',
  'PARSING',
  'IMPORTING',
  'COMPLETED',
  'PARTIAL_FAILED',
  'FAILED',
  'CANCELLED',
]
const SOURCES: ImportSource[] = ['MANUAL_EXCEL', 'AMAZON_EXTENSION_REPORT']
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function readValidDateParam(value: string | null) {
  if (!value) return undefined

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return undefined

  if (DATE_ONLY_PATTERN.test(value)) {
    return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
      ? value
      : undefined
  }

  return ISO_DATE_TIME_PATTERN.test(value) && new Date(timestamp).toISOString() === value
    ? value
    : undefined
}

function readParams(searchParams: URLSearchParams): ImportJobListParams {
  const pageValue = Number(searchParams.get('page'))
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1
  const shopId = searchParams.get('shopId') || undefined
  const rawSource = searchParams.get('source')
  const source = SOURCES.find((item) => item === rawSource)
  const rawStatus = searchParams.get('status')
  const status = JOB_STATUSES.find((item) => item === rawStatus)
  let dateFrom = readValidDateParam(searchParams.get('dateFrom'))
  let dateTo = readValidDateParam(searchParams.get('dateTo'))
  if (dateFrom && dateTo && Date.parse(dateFrom) > Date.parse(dateTo)) {
    dateFrom = undefined
    dateTo = undefined
  }
  return {
    page,
    limit: PAGE_SIZE,
    ...(shopId ? { shopId } : {}),
    ...(source ? { source } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  }
}

function statusTone(status: ImportJobStatus) {
  if (status === 'COMPLETED') return 'operational'
  if (status === 'FAILED') return 'critical'
  if (status === 'PARTIAL_FAILED') return 'warning'
  if (status === 'CANCELLED') return 'cancelled'
  return 'pending'
}

export interface IntegrationWorkbenchPageProps {
  readonly account?: CurrentAccount
}

function LoadedIntegrationWorkbenchPage() {
  const account = useRouteLoaderData('workspace') as CurrentAccount
  return <IntegrationWorkbench account={account} />
}

export function IntegrationWorkbenchPage({ account }: IntegrationWorkbenchPageProps) {
  return account ? <IntegrationWorkbench account={account} /> : <LoadedIntegrationWorkbenchPage />
}

function IntegrationWorkbench({ account }: { readonly account: CurrentAccount }) {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [uploadOpen, setUploadOpen] = useState(false)
  const params = readParams(searchParams)
  const selectedJobId = searchParams.get('selectedJobId') || undefined
  const canWrite = canWriteOrdersSomewhere(account)
  const shops = useQuery({
    queryKey: shopKeys.list({ page: 1, limit: 100, status: 'ACTIVE' }),
    queryFn: listAllActiveShops,
    retry: false,
  })
  const jobs = useQuery({
    queryKey: integrationKeys.jobs(params),
    queryFn: () => listImportJobs(params),
    retry: false,
  })
  const upload = useMutation({
    mutationFn: ({ source, ...input }: ImportUploadInput & { source: ImportUploadSource }) =>
      source === 'ETSY_SOLD_ORDER_ITEMS' ? uploadEtsySoldItems(input) : uploadManualExcel(input),
    onSuccess: async (job) => {
      await queryClient.invalidateQueries({ queryKey: [...integrationKeys.all, 'jobs'] })
      setUploadOpen(false)
      updateParams({ selectedJobId: job.jobId }, false)
      showFeedbackToast(
        'success',
        t('portal.integrations.upload.success', {
          defaultValue: 'Import queued. You can follow its progress here.',
        }),
      )
    },
  })

  const updateParams = (next: Record<string, string | undefined>, resetPage = true) => {
    const updated = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([key, value]) => {
      if (value) updated.set(key, value)
      else updated.delete(key)
    })
    if (resetPage && !Object.hasOwn(next, 'page')) updated.delete('page')
    setSearchParams(updated)
  }
  const shopNames = new Map((shops.data?.items ?? []).map((shop) => [shop.id, shop.name]))
  const writableShops = (shops.data?.items ?? []).filter((shop) =>
    canWriteOrdersForShop(account, shop.id),
  )
  const columns: TableColumnsType<ImportJob> = [
    {
      title: t('portal.integrations.jobs.createdAt', { defaultValue: 'Created' }),
      dataIndex: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: t('portal.integrations.shop', { defaultValue: 'Shop' }),
      dataIndex: 'shopId',
      render: (shopId: string | null) => (shopId ? (shopNames.get(shopId) ?? shopId) : '-'),
    },
    {
      title: t('portal.integrations.jobs.source', { defaultValue: 'Source' }),
      render: (_, job) =>
        `${t(`portal.integrations.sources.${job.source}`, { defaultValue: job.source })} / ${job.marketplaceCode}`,
    },
    {
      title: t('portal.integrations.jobs.status', { defaultValue: 'Status' }),
      dataIndex: 'status',
      render: (status: ImportJobStatus) => (
        <StatusTag status={statusTone(status)}>
          {t(`portal.integrations.statuses.${status}`, { defaultValue: status })}
        </StatusTag>
      ),
    },
    {
      title: t('portal.integrations.jobs.counts', { defaultValue: 'Results' }),
      render: (_, job) =>
        `${job.importedCount} ${t('portal.integrations.jobs.imported', { defaultValue: 'imported' })} / ${job.skippedCount} ${t('portal.integrations.jobs.skipped', { defaultValue: 'skipped' })} / ${job.failedCount} ${t('portal.integrations.jobs.failed', { defaultValue: 'failed' })}`,
    },
  ]

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.integrations.title', { defaultValue: 'External order imports' })}
        description={t('portal.integrations.description', {
          defaultValue: 'Upload reports, monitor imports, and resolve operational issues.',
        })}
        actions={
          canWrite ? (
            <Button
              icon={<UploadOutlined aria-hidden />}
              type="primary"
              onClick={() => setUploadOpen(true)}
            >
              {t('portal.integrations.upload.action', { defaultValue: 'Upload report' })}
            </Button>
          ) : null
        }
      />
      {jobs.error ? (
        <FeedbackAlert
          type="error"
          title={t('portal.integrations.jobs.unavailable', {
            defaultValue: 'Import jobs are unavailable',
          })}
          action={
            <Button
              icon={<ReloadOutlined aria-hidden />}
              type="link"
              onClick={() => void jobs.refetch()}
            >
              {t('portal.integrations.retry', { defaultValue: 'Retry' })}
            </Button>
          }
        />
      ) : null}
      <SectionCard>
        <DataTable
          columns={columns}
          dataSource={jobs.data?.items ?? []}
          loading={jobs.isLoading}
          rowKey="id"
          onRow={(job) => ({
            onClick: () => updateParams({ selectedJobId: job.id }, false),
          })}
          pagination={{
            current: params.page,
            pageSize: params.limit,
            total: jobs.data?.pagination.total,
            onChange: (page) => updateParams({ page: String(page) }, false),
          }}
          toolbar={
            <FilterBar
              label={t('portal.integrations.filters', { defaultValue: 'Import filters' })}
              contentClassName={styles.filters}
            >
              <Select
                allowClear
                aria-label={t('portal.integrations.shop', { defaultValue: 'Shop' })}
                className={styles.filterControl}
                loading={shops.isLoading}
                options={(shops.data?.items ?? []).map((shop) => ({
                  label: shop.name,
                  value: shop.id,
                }))}
                placeholder={t('portal.integrations.allShops', { defaultValue: 'All shops' })}
                showSearch
                optionFilterProp="label"
                value={params.shopId}
                onChange={(shopId) => updateParams({ shopId })}
              />
              <Select
                allowClear
                aria-label={t('portal.integrations.jobs.source', { defaultValue: 'Source' })}
                className={styles.filterControl}
                options={SOURCES.map((source) => ({
                  label: t(`portal.integrations.sources.${source}`, { defaultValue: source }),
                  value: source,
                }))}
                placeholder={t('portal.integrations.allSources', { defaultValue: 'All sources' })}
                value={params.source}
                onChange={(source) => updateParams({ source })}
              />
              <Select
                allowClear
                aria-label={t('portal.integrations.jobs.status', { defaultValue: 'Status' })}
                className={styles.filterControl}
                options={JOB_STATUSES.map((status) => ({
                  label: t(`portal.integrations.statuses.${status}`, { defaultValue: status }),
                  value: status,
                }))}
                placeholder={t('portal.integrations.allStatuses', { defaultValue: 'All statuses' })}
                value={params.status}
                onChange={(status) => updateParams({ status })}
              />
              <DateRangePicker
                aria-label={t('portal.integrations.dateRange', {
                  defaultValue: 'Created date range',
                })}
                value={{ dateFrom: params.dateFrom, dateTo: params.dateTo }}
                onChange={({ dateFrom, dateTo }) => updateParams({ dateFrom, dateTo })}
              />
            </FilterBar>
          }
        />
      </SectionCard>
      <ImportIssueQueue
        account={account}
        shops={shops.data?.items ?? []}
        selectedJobId={selectedJobId}
      />
      <ImportJobPanel
        account={account}
        jobId={selectedJobId}
        status={jobs.data?.items.find((job) => job.id === selectedJobId)?.status}
        open={Boolean(selectedJobId)}
        onClose={() => updateParams({ selectedJobId: undefined }, false)}
      />
      <ImportUploadModal
        error={upload.error}
        open={uploadOpen}
        saving={upload.isPending}
        shops={writableShops}
        onClose={() => setUploadOpen(false)}
        onSubmit={(input) => upload.mutate(input)}
      />
    </section>
  )
}

export default IntegrationWorkbenchPage
