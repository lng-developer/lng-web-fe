import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { importFinanceFile } from '@/features/portal/finance/api/financeApi'
import { FinanceImportModal } from '@/features/portal/finance/pages/FinanceImportModal'
import { shopKeys } from '@/features/portal/shops/api/shopKeys'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { StatusTag, useFeedbackToast } from '@/shared/ui'

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
import {
  canWriteFinanceForShop,
  canWriteOrdersForShop,
  canWriteOrdersSomewhere,
} from '../auth/integrationAccess'
import { ExtensionTabContent } from '../components/ExtensionTabContent'
import { FinanceImportsTab } from '../components/FinanceImportsTab'
import { ImportUploadModal } from './ImportUploadModal'
import { IntegrationImportsWorkbench } from './IntegrationImportsWorkbench'
import styles from './IntegrationWorkbenchPage.module.scss'
import { IntegrationWorkbenchTabs } from './IntegrationWorkbenchTabs'

const PAGE_SIZE = DEFAULT_PAGE_SIZE
const INTEGRATION_TABS = ['orders', 'extension', 'finance'] as const
type IntegrationWorkbenchTab = (typeof INTEGRATION_TABS)[number]
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
  const [financeUploadOpen, setFinanceUploadOpen] = useState(false)
  const requestedTab = searchParams.get('tab')
  const activeTab: IntegrationWorkbenchTab =
    requestedTab && (INTEGRATION_TABS as readonly string[]).includes(requestedTab)
      ? (requestedTab as IntegrationWorkbenchTab)
      : 'orders'

  const handleTabChange = (nextTab: IntegrationWorkbenchTab) => {
    const next = new URLSearchParams(searchParams)
    if (nextTab === 'orders') {
      next.delete('tab')
    } else {
      next.set('tab', nextTab)
    }
    if (nextTab !== 'orders') {
      next.delete('selectedJobId')
    }
    setSearchParams(next, { replace: true })
  }
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
    enabled: activeTab === 'orders',
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

  const shopNames = useMemo(
    () => new Map((shops.data?.items ?? []).map((shop) => [shop.id, shop.name])),
    [shops.data?.items],
  )

  const writableShops = useMemo(
    () => (shops.data?.items ?? []).filter((shop) => canWriteOrdersForShop(account, shop.id)),
    [account, shops.data?.items],
  )

  const financeWritableShops = useMemo(
    () => (shops.data?.items ?? []).filter((shop) => canWriteFinanceForShop(account, shop.id)),
    [account, shops.data?.items],
  )

  const setupShopOptions = useMemo(
    () =>
      (canWrite ? writableShops : (shops.data?.items ?? [])).map((shop) => ({
        label: shop.name,
        value: shop.id,
      })),
    [canWrite, shops.data?.items, writableShops],
  )

  const financeUpload = useMutation({
    mutationFn: ({
      kind,
      file,
      ...context
    }: import('@/features/portal/finance/api/financeApi').FinanceImportInput) =>
      importFinanceFile(kind, file, context),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: integrationKeys.all })
      setFinanceUploadOpen(false)
      showFeedbackToast('success', 'Finance import queued')
    },
    onError: (error) => showFeedbackToast('error', 'Finance import failed', error.message),
  })

  const columns: TableColumnsType<ImportJob> = useMemo(
    () => [
      {
        title: t('portal.integrations.jobs.createdAt', { defaultValue: 'Created' }),
        dataIndex: 'createdAt',
        width: 160,
        render: (value: string) => new Date(value).toLocaleString(),
      },
      {
        title: t('portal.integrations.shop', { defaultValue: 'Shop' }),
        dataIndex: 'shopId',
        width: 160,
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
        width: 132,
        render: (status: ImportJobStatus) => (
          <StatusTag status={statusTone(status)}>
            {t(`portal.integrations.statuses.${status}`, { defaultValue: status })}
          </StatusTag>
        ),
      },
      {
        title: t('portal.integrations.jobs.counts', { defaultValue: 'Results' }),
        width: 220,
        render: (_, job) =>
          `${job.importedCount} ${t('portal.integrations.jobs.imported', { defaultValue: 'imported' })} / ${job.skippedCount} ${t('portal.integrations.jobs.skipped', { defaultValue: 'skipped' })} / ${job.failedCount} ${t('portal.integrations.jobs.failed', { defaultValue: 'failed' })}`,
      },
    ],
    [shopNames, t],
  )

  const importJobCounts = useMemo(
    () =>
      (jobs.data?.items ?? []).reduce(
        (counts, job) => {
          if (['FAILED', 'PARTIAL_FAILED'].includes(job.status)) counts.needsReview += 1
          else if (['QUEUED', 'PROCESSING'].includes(job.status)) counts.processing += 1
          else counts.completed += 1
          return counts
        },
        { needsReview: 0, processing: 0, completed: 0 },
      ),
    [jobs.data?.items],
  )

  const financeTab = (
    <FinanceImportsTab
      account={account}
      shops={shops.data?.items ?? []}
      isShopsLoading={shops.isLoading}
      shopNames={shopNames}
    />
  )

  const extensionTab = (
    <ExtensionTabContent
      account={account}
      shops={shops.data?.items ?? []}
      isShopsLoading={shops.isLoading}
      shopNames={shopNames}
      setupShopOptions={setupShopOptions}
      writableShops={writableShops}
      canWrite={canWrite}
      canWriteFinance={financeWritableShops.length > 0}
    />
  )

  return (
    <section className={styles.page}>
      <IntegrationWorkbenchTabs
        activeTab={activeTab}
        canUpload={canWrite}
        canUploadFinance={financeWritableShops.length > 0}
        extension={extensionTab}
        finance={financeTab}
        imports={
          <IntegrationImportsWorkbench
            account={account}
            columns={columns}
            counts={importJobCounts}
            error={jobs.error}
            isLoading={jobs.isLoading}
            jobs={jobs.data?.items ?? []}
            params={params}
            selectedJobId={selectedJobId}
            shops={shops.data?.items ?? []}
            sourceOptions={SOURCES}
            statusOptions={JOB_STATUSES}
            total={jobs.data?.pagination.total}
            onChange={updateParams}
            onRetry={() => void jobs.refetch()}
          />
        }
        onChange={handleTabChange}
        onFinanceUpload={() => setFinanceUploadOpen(true)}
        onUpload={() => setUploadOpen(true)}
      />
      <ImportUploadModal
        error={upload.error}
        open={uploadOpen}
        saving={upload.isPending}
        shops={writableShops}
        onClose={() => setUploadOpen(false)}
        onSubmit={(input) => upload.mutate(input)}
      />
      <FinanceImportModal
        error={financeUpload.error}
        open={financeUploadOpen}
        saving={financeUpload.isPending}
        shops={financeWritableShops}
        onClose={() => setFinanceUploadOpen(false)}
        onSubmit={(input) => financeUpload.mutate(input)}
      />
    </section>
  )
}

export default IntegrationWorkbenchPage
