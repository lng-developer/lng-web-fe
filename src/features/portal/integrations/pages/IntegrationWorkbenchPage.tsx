import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Alert, Button, Form, Input, Select, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import type {
  ExtensionTokenEnvironment,
  ExtensionTokenInput,
} from '@/features/auth/extension-tokens/api/extensionTokensApi'
import { createExtensionToken } from '@/features/auth/extension-tokens/api/extensionTokensApi'
import { type ImportBatch, listImportBatches } from '@/features/portal/finance/api/financeApi'
import { shopKeys } from '@/features/portal/shops/api/shopKeys'
import {
  DateRangePicker,
  FeedbackAlert,
  FilterBar,
  SectionCard,
  StatusTag,
  UiTabLabel,
  UiTabs,
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
import {
  canReadFinanceImports,
  canWriteOrdersForShop,
  canWriteOrdersSomewhere,
} from '../auth/integrationAccess'
import { ImportIssueQueue } from './ImportIssueQueue'
import { ImportJobPanel } from './ImportJobPanel'
import { ImportUploadModal } from './ImportUploadModal'
import styles from './IntegrationWorkbenchPage.module.scss'

const PAGE_SIZE = 20
const EXTENSION_API_BASE_URLS: Record<ExtensionTokenEnvironment, string> = {
  development: 'https://dev-api.lngmerch.co',
  production: 'https://api.lngmerch.co',
}
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
const ADS_IMPORT_STATUSES = ['PROCESSING', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED'] as const
type FinanceImportSourceType = 'ADS' | 'TRANSACTIONS' | 'SETTLEMENTS'
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
  const [tokenForm] = Form.useForm<ExtensionTokenInput>()
  const [createdToken, setCreatedToken] = useState<string>()
  const [adsShopId, setAdsShopId] = useState<string>()
  const [adsStatus, setAdsStatus] = useState<string>()
  const [adsDates, setAdsDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const [adsPage, setAdsPage] = useState(1)
  const [transactionShopId, setTransactionShopId] = useState<string>()
  const [transactionStatus, setTransactionStatus] = useState<string>()
  const [transactionDates, setTransactionDates] = useState<{ dateFrom?: string; dateTo?: string }>(
    {},
  )
  const [transactionPage, setTransactionPage] = useState(1)
  const [settlementShopId, setSettlementShopId] = useState<string>()
  const [settlementStatus, setSettlementStatus] = useState<string>()
  const [settlementDates, setSettlementDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const [settlementPage, setSettlementPage] = useState(1)
  const selectedEnvironment =
    Form.useWatch('environment', tokenForm) ?? ('development' as ExtensionTokenEnvironment)
  const selectedShopId = Form.useWatch('shopId', tokenForm)
  const params = readParams(searchParams)
  const selectedJobId = searchParams.get('selectedJobId') || undefined
  const canWrite = canWriteOrdersSomewhere(account)
  const canReadAdsImports = canReadFinanceImports(account)
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
  const adsImports = useQuery({
    queryKey: [
      ...integrationKeys.all,
      'ads-imports',
      { adsPage, adsShopId, adsStatus, ...adsDates },
    ],
    queryFn: () =>
      listImportBatches({
        page: adsPage,
        limit: PAGE_SIZE,
        sourceType: 'ADS',
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'AMAZON',
        shopId: adsShopId,
        status: adsStatus,
        ...adsDates,
      }),
    enabled: canReadAdsImports,
    retry: false,
  })
  const transactionImports = useQuery({
    queryKey: [
      ...integrationKeys.all,
      'transaction-imports',
      { transactionPage, transactionShopId, transactionStatus, ...transactionDates },
    ],
    queryFn: () =>
      listImportBatches({
        page: transactionPage,
        limit: PAGE_SIZE,
        sourceType: 'TRANSACTIONS',
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'AMAZON',
        shopId: transactionShopId,
        status: transactionStatus,
        ...transactionDates,
      }),
    enabled: canReadAdsImports,
    retry: false,
  })
  const settlementImports = useQuery({
    queryKey: [
      ...integrationKeys.all,
      'settlement-imports',
      { settlementPage, settlementShopId, settlementStatus, ...settlementDates },
    ],
    queryFn: () =>
      listImportBatches({
        page: settlementPage,
        limit: PAGE_SIZE,
        sourceType: 'SETTLEMENTS',
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'AMAZON',
        shopId: settlementShopId,
        status: settlementStatus,
        ...settlementDates,
      }),
    enabled: canReadAdsImports,
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
  const createToken = useMutation({
    mutationFn: (input: ExtensionTokenInput) =>
      createExtensionToken({ ...input, expiresAt: input.expiresAt || null }),
    onSuccess: (result) => {
      setCreatedToken(result.token)
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
  const setupShopOptions = (canWrite ? writableShops : (shops.data?.items ?? [])).map((shop) => ({
    label: shop.name,
    value: shop.id,
  }))
  const resetAdsPage = () => setAdsPage(1)
  const resetTransactionPage = () => setTransactionPage(1)
  const resetSettlementPage = () => setSettlementPage(1)
  const apiBaseUrl = EXTENSION_API_BASE_URLS[selectedEnvironment]
  useEffect(() => {
    if (!selectedShopId && setupShopOptions[0]?.value) {
      tokenForm.setFieldValue('shopId', setupShopOptions[0].value)
    }
  }, [selectedShopId, setupShopOptions, tokenForm])
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
  const adsImportColumns: TableColumnsType<ImportBatch> = [
    {
      title: t('portal.integrations.ads.createdAt', { defaultValue: 'Created' }),
      dataIndex: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: t('portal.integrations.shop', { defaultValue: 'Shop' }),
      dataIndex: 'shopId',
      render: (shopId: string | null) => (shopId ? (shopNames.get(shopId) ?? shopId) : '-'),
    },
    {
      title: t('portal.integrations.ads.status', { defaultValue: 'Status' }),
      dataIndex: 'status',
      render: (status: string) => (
        <StatusTag status={statusTone(status as ImportJobStatus)}>
          {t(`portal.integrations.ads.statuses.${status}`, { defaultValue: status })}
        </StatusTag>
      ),
    },
    {
      title: t('portal.integrations.ads.rows', { defaultValue: 'Rows' }),
      render: (_, batch) =>
        `${batch.processedRows} ${t('portal.integrations.ads.processed', { defaultValue: 'processed' })} / ${batch.validRows} ${t('portal.integrations.ads.valid', { defaultValue: 'valid' })}`,
    },
    {
      title: t('portal.integrations.ads.errors', { defaultValue: 'Errors' }),
      dataIndex: 'errorCount',
    },
    {
      title: t('portal.integrations.ads.file', { defaultValue: 'File' }),
      dataIndex: 'originalFilename',
      render: (value: string) => value || '-',
    },
  ]

  const ordersTab = (
    <>
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
        <CoreDataTable
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
    </>
  )

  const extensionTab = (
    <SectionCard title={t('portal.integrations.extension.title')}>
      <div className={styles.extensionSetup}>
        <Form
          form={tokenForm}
          layout="vertical"
          initialValues={{
            environment: 'development',
            name: t('portal.integrations.extension.defaultTokenName'),
            shopId: writableShops[0]?.id ?? shops.data?.items[0]?.id,
          }}
          onFinish={(values) => createToken.mutate(values)}
        >
          <div className={styles.extensionGrid}>
            <Form.Item
              label={t('portal.integrations.shop', { defaultValue: 'Shop' })}
              name="shopId"
              rules={[{ required: true }]}
            >
              <Select
                loading={shops.isLoading}
                options={setupShopOptions}
                placeholder={t('portal.integrations.allShops', { defaultValue: 'All shops' })}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item
              label={t('portal.integrations.extension.environment')}
              name="environment"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: t('portal.integrations.extension.development'), value: 'development' },
                  { label: t('portal.integrations.extension.production'), value: 'production' },
                ]}
              />
            </Form.Item>
            <Form.Item
              label={t('portal.integrations.extension.tokenName')}
              name="name"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item label={t('portal.integrations.extension.apiBaseUrl')}>
              <Typography.Text copyable>{apiBaseUrl}</Typography.Text>
            </Form.Item>
            <Form.Item label={t('portal.integrations.extension.shopId')}>
              <Typography.Text copyable>{selectedShopId || '-'}</Typography.Text>
            </Form.Item>
            <Form.Item label={t('portal.integrations.extension.apiAccessToken')}>
              {createdToken ? (
                <Typography.Text copyable className={styles.tokenText}>
                  {createdToken}
                </Typography.Text>
              ) : (
                <Typography.Text type="secondary">
                  {t('portal.integrations.extension.createTokenHint')}
                </Typography.Text>
              )}
            </Form.Item>
          </div>
          <Space wrap>
            <Button type="primary" htmlType="submit" loading={createToken.isPending}>
              {t('portal.integrations.extension.createToken')}
            </Button>
            <Typography.Text type="secondary">
              {t('portal.integrations.extension.flowHint')}
            </Typography.Text>
          </Space>
        </Form>
        {createdToken ? (
          <Alert
            type="warning"
            showIcon
            message={t('portal.integrations.extension.tokenWarning')}
          />
        ) : null}
        {createToken.error ? (
          <Alert type="error" showIcon message={(createToken.error as Error).message} />
        ) : null}
      </div>
    </SectionCard>
  )

  const renderFinanceImportTab = ({
    title,
    permissionHint,
    sourceType,
    imports,
    page,
    setPage,
    shopId,
    setShopId,
    status,
    setStatus,
    dates,
    setDates,
    resetPage,
  }: {
    title: string
    permissionHint: string
    sourceType: FinanceImportSourceType
    imports: typeof adsImports
    page: number
    setPage: (page: number) => void
    shopId: string | undefined
    setShopId: (shopId: string | undefined) => void
    status: string | undefined
    setStatus: (status: string | undefined) => void
    dates: { dateFrom?: string; dateTo?: string }
    setDates: (dates: { dateFrom?: string; dateTo?: string }) => void
    resetPage: () => void
  }) => (
    <SectionCard title={title}>
      {canReadAdsImports ? (
        <CoreDataTable
          columns={adsImportColumns}
          dataSource={imports.data?.items ?? []}
          loading={imports.isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: imports.data?.pagination.total,
            onChange: setPage,
          }}
          toolbar={
            <FilterBar
              label={t('portal.integrations.financeImports.filters', {
                defaultValue: `${sourceType} import filters`,
              })}
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
                value={shopId}
                onChange={(nextShopId) => {
                  setShopId(nextShopId)
                  resetPage()
                }}
              />
              <Select
                allowClear
                aria-label={t('portal.integrations.ads.status', { defaultValue: 'Status' })}
                className={styles.filterControl}
                options={ADS_IMPORT_STATUSES.map((status) => ({ label: status, value: status }))}
                placeholder={t('portal.integrations.allStatuses', {
                  defaultValue: 'All statuses',
                })}
                value={status}
                onChange={(nextStatus) => {
                  setStatus(nextStatus)
                  resetPage()
                }}
              />
              <DateRangePicker
                aria-label={t('portal.integrations.ads.dateRange', {
                  defaultValue: 'Created date range',
                })}
                value={dates}
                onChange={(nextDates) => {
                  setDates(nextDates)
                  resetPage()
                }}
              />
            </FilterBar>
          }
        />
      ) : (
        <Alert type="info" showIcon message={permissionHint} />
      )}
    </SectionCard>
  )

  const adsTab = renderFinanceImportTab({
    title: t('portal.integrations.ads.title', { defaultValue: 'Amazon Ads imports' }),
    permissionHint: t('portal.integrations.ads.permissionHint', {
      defaultValue: 'Finance read permission is required to view Ads import history.',
    }),
    sourceType: 'ADS',
    imports: adsImports,
    page: adsPage,
    setPage: setAdsPage,
    shopId: adsShopId,
    setShopId: setAdsShopId,
    status: adsStatus,
    setStatus: setAdsStatus,
    dates: adsDates,
    setDates: setAdsDates,
    resetPage: resetAdsPage,
  })
  const transactionsTab = renderFinanceImportTab({
    title: t('portal.integrations.transactions.title', {
      defaultValue: 'Amazon Transactions imports',
    }),
    permissionHint: t('portal.integrations.transactions.permissionHint', {
      defaultValue: 'Finance read permission is required to view Transactions import history.',
    }),
    sourceType: 'TRANSACTIONS',
    imports: transactionImports,
    page: transactionPage,
    setPage: setTransactionPage,
    shopId: transactionShopId,
    setShopId: setTransactionShopId,
    status: transactionStatus,
    setStatus: setTransactionStatus,
    dates: transactionDates,
    setDates: setTransactionDates,
    resetPage: resetTransactionPage,
  })
  const settlementsTab = renderFinanceImportTab({
    title: t('portal.integrations.settlements.title', {
      defaultValue: 'Amazon Settlements imports',
    }),
    permissionHint: t('portal.integrations.settlements.permissionHint', {
      defaultValue: 'Finance read permission is required to view Settlements import history.',
    }),
    sourceType: 'SETTLEMENTS',
    imports: settlementImports,
    page: settlementPage,
    setPage: setSettlementPage,
    shopId: settlementShopId,
    setShopId: setSettlementShopId,
    status: settlementStatus,
    setStatus: setSettlementStatus,
    dates: settlementDates,
    setDates: setSettlementDates,
    resetPage: resetSettlementPage,
  })

  return (
    <section className={styles.page}>
      <UiTabs
        destroyOnHidden={false}
        tabBarExtraContent={
          canWrite ? (
            <div className={styles.tabsAction}>
              <Button
                icon={<UploadOutlined aria-hidden />}
                type="primary"
                onClick={() => setUploadOpen(true)}
              >
                {t('portal.integrations.upload.action', { defaultValue: 'Upload report' })}
              </Button>
            </div>
          ) : null
        }
        items={[
          {
            key: 'orders',
            label: <UiTabLabel>{t('portal.integrations.tabs.orders')}</UiTabLabel>,
            children: ordersTab,
          },
          {
            key: 'extension',
            label: <UiTabLabel>{t('portal.integrations.tabs.extension')}</UiTabLabel>,
            children: extensionTab,
          },
          {
            key: 'ads',
            label: <UiTabLabel>{t('portal.integrations.tabs.ads')}</UiTabLabel>,
            children: adsTab,
          },
          {
            key: 'transactions',
            label: <UiTabLabel>{t('portal.integrations.tabs.transactions')}</UiTabLabel>,
            children: transactionsTab,
          },
          {
            key: 'settlements',
            label: <UiTabLabel>{t('portal.integrations.tabs.settlements')}</UiTabLabel>,
            children: settlementsTab,
          },
        ]}
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
