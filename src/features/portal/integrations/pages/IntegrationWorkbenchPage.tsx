import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import {
  ApiOutlined,
  ClockCircleOutlined,
  CloudDownloadOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  ReloadOutlined,
  StopOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Alert,
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Popover,
  Select,
  Space,
  Tooltip,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import type {
  ExtensionTokenEnvironment,
  ExtensionTokenInput,
} from '@/features/auth/extension-tokens/api/extensionTokensApi'
import {
  createExtensionToken,
  revokeExtensionToken,
} from '@/features/auth/extension-tokens/api/extensionTokensApi'
import {
  type AdsShopMappingInput,
  type AdsUnassignedRow,
  type ImportBatch,
  listAdsUnassignedRows,
  listImportBatches,
  upsertAdsShopMapping,
} from '@/features/portal/finance/api/financeApi'
import { shopKeys } from '@/features/portal/shops/api/shopKeys'
import { env } from '@/shared/config/env'
import {
  DataTable,
  DateRangePicker,
  FeedbackAlert,
  FilterBar,
  PageHeader,
  SectionCard,
  StatusTag,
  UiTabLabel,
  UiTabs,
  useFeedbackToast,
} from '@/shared/ui'

import {
  createExtensionCommand,
  type ExtensionCommand,
  type ExtensionCommandType,
  type ExtensionImportDays,
  type ExtensionManagementAgent,
  type ImportJob,
  type ImportJobListParams,
  type ImportJobStatus,
  type ImportSource,
  type ImportUploadInput,
  type ImportUploadSource,
  listExtensionAgents,
  listExtensionCommands,
  listExtensionManagementAgents,
  listExtensionOrderSchedules,
  listImportJobs,
  uploadEtsySoldItems,
  uploadManualExcel,
  upsertExtensionOrderSchedule,
} from '../api/integrationApi'
import { integrationKeys } from '../api/integrationKeys'
import { listAllActiveShops } from '../api/loadActiveShops'
import {
  canReadFinanceImports,
  canWriteFinanceForShop,
  canWriteOrdersForShop,
  canWriteOrdersSomewhere,
} from '../auth/integrationAccess'
import { ImportIssueQueue } from './ImportIssueQueue'
import { ImportJobPanel } from './ImportJobPanel'
import { ImportUploadModal } from './ImportUploadModal'
import styles from './IntegrationWorkbenchPage.module.scss'

const PAGE_SIZE = 20
const EXTENSION_API_BASE_URLS: Record<ExtensionTokenEnvironment, string> = {
  development: env.apiBaseUrl || 'https://dev-api.lngmerch.co',
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
const RECENT_RECONNECT_MS = 5 * 60 * 1000

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

function nextPollLabel(lastSeenAt: string, now: number) {
  const remaining = Math.max(0, 60_000 - (now - Date.parse(lastSeenAt)))
  if (!remaining) return 'Polling…'
  return `Poll in ${Math.ceil(remaining / 1000)}s`
}

function isRecentlyReconnected(agent: ExtensionManagementAgent, now: number) {
  return (
    agent.status === 'ONLINE' &&
    Boolean(agent.lastReconnectedAt) &&
    now - Date.parse(agent.lastReconnectedAt!) <= RECENT_RECONNECT_MS
  )
}

export interface IntegrationWorkbenchPageProps {
  readonly account?: CurrentAccount
}

function LazyActionPopover({
  renderContent,
  renderTrigger,
  title,
}: {
  readonly renderContent: () => ReactNode
  readonly renderTrigger: (onOpen: () => void) => ReactNode
  readonly title: ReactNode
}) {
  const [open, setOpen] = useState(false)

  if (!open) return renderTrigger(() => setOpen(true))

  return (
    <Popover
      destroyOnHidden
      title={title}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      content={open ? renderContent() : null}
    >
      {renderTrigger(() => undefined)}
    </Popover>
  )
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
  const [selectedCommand, setSelectedCommand] = useState<ExtensionCommand>()
  const [commandImportDays, setCommandImportDays] = useState<Record<string, ExtensionImportDays>>(
    {},
  )
  const [adsCommandDates, setAdsCommandDates] = useState<
    Record<string, { dateFrom?: string; dateTo?: string }>
  >({})
  const [now, setNow] = useState(() => Date.now())
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
  const [selectedAdsUnassignedRow, setSelectedAdsUnassignedRow] = useState<AdsUnassignedRow>()
  const [adsMappingForm] = Form.useForm<{ shopId: string; matchType: 'CAMPAIGN' | 'PORTFOLIO' }>()
  const selectedEnvironment =
    Form.useWatch('environment', tokenForm) ?? ('development' as ExtensionTokenEnvironment)
  const selectedShopId = Form.useWatch('shopId', tokenForm)
  const params = readParams(searchParams)
  const selectedJobId = searchParams.get('selectedJobId') || undefined
  const canWrite = canWriteOrdersSomewhere(account)
  const canReadAdsImports = canReadFinanceImports(account)
  const canManageAdsMappings = account.permissions.includes('FINANCE:WRITE')
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
  const extensionAgents = useQuery({
    queryKey: integrationKeys.extensionAgents(),
    queryFn: listExtensionAgents,
    enabled: canWrite,
    retry: false,
    refetchInterval: 30_000,
  })
  const extensionManagementAgents = useQuery({
    queryKey: integrationKeys.extensionManagementAgents(),
    queryFn: listExtensionManagementAgents,
    enabled: canWrite,
    retry: false,
    refetchInterval: 30_000,
  })
  const extensionCommands = useQuery({
    queryKey: integrationKeys.extensionCommands(),
    queryFn: () => listExtensionCommands({ page: 1, limit: 10 }),
    enabled: canWrite,
    retry: false,
    refetchInterval: 10_000,
  })
  const extensionOrderSchedules = useQuery({
    queryKey: integrationKeys.extensionOrderSchedules(),
    queryFn: listExtensionOrderSchedules,
    enabled: canWrite,
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
        marketplaceCode: 'US',
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
  const adsUnassignedRows = useQuery({
    queryKey: [...integrationKeys.all, 'ads-unassigned-rows'],
    queryFn: () => listAdsUnassignedRows({ status: 'PENDING', page: 1, limit: 100 }),
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
  const createCommand = useMutation({
    mutationFn: ({
      agentId,
      type,
      numDays,
      dateFrom,
      dateTo,
    }: {
      agentId: string
      type: ExtensionCommandType
      numDays?: ExtensionImportDays
      dateFrom?: string
      dateTo?: string
    }) => {
      const agent = extensionAgents.data?.items.find((item) => item.id === agentId)
      if (!agent) throw new Error('Extension agent is unavailable')
      if (
        type === 'IMPORT_ADS_SPEND' &&
        (!dateFrom || !dateTo || dayjs(dateTo).diff(dayjs(dateFrom), 'day') > 119)
      )
        throw new Error('Choose an Ads date range of up to 120 days')
      return createExtensionCommand({
        type,
        shopId: agent.shopId,
        agentId,
        ...(numDays ? { numDays } : {}),
        ...(dateFrom ? { dateFrom: dayjs(dateFrom).format('YYYY-MM-DD') } : {}),
        ...(dateTo ? { dateTo: dayjs(dateTo).format('YYYY-MM-DD') } : {}),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: integrationKeys.extensionCommands() })
      showFeedbackToast(
        'success',
        t('portal.integrations.extension.commandQueued', {
          defaultValue: 'Import command queued.',
        }),
      )
    },
  })
  const revokeToken = useMutation({
    mutationFn: revokeExtensionToken,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: integrationKeys.extensionAgents() }),
        queryClient.invalidateQueries({ queryKey: integrationKeys.extensionManagementAgents() }),
      ])
      showFeedbackToast('success', 'Extension token revoked.')
    },
  })
  const saveOrderSchedule = useMutation({
    mutationFn: ({
      agentId,
      enabled,
      intervalMinutes,
    }: {
      agentId: string
      enabled: boolean
      intervalMinutes: 60 | 120 | 180 | 240
    }) => upsertExtensionOrderSchedule(agentId, { enabled, intervalMinutes }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: integrationKeys.extensionOrderSchedules() })
      showFeedbackToast('success', 'Order schedule saved.')
    },
  })
  const saveAdsMapping = useMutation({
    mutationFn: upsertAdsShopMapping,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...integrationKeys.all, 'ads-unassigned-rows'],
      })
      setSelectedAdsUnassignedRow(undefined)
      adsMappingForm.resetFields()
      showFeedbackToast(
        'success',
        'Mapping saved. The unread Amazon email will retry on the next scan.',
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
  const setupShopOptions = (canWrite ? writableShops : (shops.data?.items ?? [])).map((shop) => ({
    label: shop.name,
    value: shop.id,
  }))
  const resetAdsPage = () => setAdsPage(1)
  const resetTransactionPage = () => setTransactionPage(1)
  const resetSettlementPage = () => setSettlementPage(1)
  const apiBaseUrl = EXTENSION_API_BASE_URLS[selectedEnvironment]
  const extensionAgentById = new Map(
    (extensionManagementAgents.data?.items ?? []).map((agent) => [agent.id, agent]),
  )
  const orderScheduleByAgentId = new Map(
    (extensionOrderSchedules.data?.items ?? []).map((schedule) => [schedule.agentId, schedule]),
  )
  useEffect(() => {
    if (!selectedShopId && setupShopOptions[0]?.value) {
      tokenForm.setFieldValue('shopId', setupShopOptions[0].value)
    }
  }, [selectedShopId, setupShopOptions, tokenForm])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
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
    </>
  )

  const extensionTab = (
    <SectionCard
      title={t('portal.integrations.extension.title', {
        defaultValue: 'Amazon Extension setup',
      })}
    >
      <div className={styles.extensionSetup}>
        <Form
          form={tokenForm}
          layout="vertical"
          initialValues={{
            environment: 'development',
            name: 'Amazon Extension',
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
                onChange={() => setCreatedToken(undefined)}
              />
            </Form.Item>
            <Form.Item
              label={t('portal.integrations.extension.environment', {
                defaultValue: 'Environment',
              })}
              tooltip={apiBaseUrl}
              name="environment"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'Development', value: 'development' },
                  { label: 'Production', value: 'production' },
                ]}
              />
            </Form.Item>
            <Form.Item
              label={t('portal.integrations.extension.tokenName', {
                defaultValue: 'Token name',
              })}
              name="name"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Button
              className={styles.createTokenButton}
              type="primary"
              htmlType="submit"
              loading={createToken.isPending}
            >
              {t('portal.integrations.extension.createToken', {
                defaultValue: 'Create token',
              })}
            </Button>
          </div>
        </Form>
        {createdToken ? (
          <Alert
            type="warning"
            showIcon
            title={t('portal.integrations.extension.tokenWarning', {
              defaultValue: 'API access token — copy it before leaving this page.',
            })}
            description={
              <Typography.Text copyable className={styles.tokenText}>
                {createdToken}
              </Typography.Text>
            }
          />
        ) : null}
        {createToken.error ? (
          <Alert type="error" showIcon message={(createToken.error as Error).message} />
        ) : null}
        <div className={styles.commandPanel}>
          <Typography.Title level={5}>Extension operations</Typography.Title>
          {extensionManagementAgents.isLoading ? (
            <Typography.Text>Loading extensions…</Typography.Text>
          ) : null}
          <DataTable<ExtensionManagementAgent>
            rowKey="id"
            loading={extensionManagementAgents.isLoading}
            dataSource={extensionManagementAgents.data?.items ?? []}
            pagination={false}
            columns={[
              {
                title: 'Shop',
                dataIndex: 'shopId',
                width: 160,
                render: (shopId: string) => shopNames.get(shopId) ?? shopId,
              },
              { title: 'RDC / Chrome', dataIndex: 'label', width: 170 },
              {
                title: 'Status',
                dataIndex: 'status',
                width: 100,
                render: (status: string) => (
                  <StatusTag status={status === 'ONLINE' ? 'online' : 'offline'}>
                    {status}
                  </StatusTag>
                ),
              },
              {
                title: 'Connection',
                dataIndex: 'lastReconnectedAt',
                width: 120,
                render: (value: string | null | undefined, agent) =>
                  isRecentlyReconnected(agent, now) ? (
                    <Tooltip title={`Reconnected at ${new Date(value!).toLocaleString()}`}>
                      <StatusTag status="processing">Reconnected</StatusTag>
                    </Tooltip>
                  ) : (
                    '-'
                  ),
              },
              {
                title: 'Last seen',
                dataIndex: 'lastSeenAt',
                width: 180,
                render: (value: string) => new Date(value).toLocaleString(),
              },
              {
                title: 'Next poll',
                dataIndex: 'lastSeenAt',
                width: 120,
                render: (value: string) => (
                  <Typography.Text type="secondary">{nextPollLabel(value, now)}</Typography.Text>
                ),
              },
              {
                title: 'Actions',
                width: 180,
                render: (_, agent) => {
                  const numDays = commandImportDays[agent.id] ?? 1
                  const adsDateRange = adsCommandDates[agent.id]
                  return (
                    <Space size={6}>
                      <LazyActionPopover
                        title="Pull Orders"
                        renderTrigger={(onOpen) => (
                          <Tooltip title="Configure and pull orders">
                            <Button
                              aria-label={t('portal.integrations.extension.configurePullOrders', {
                                defaultValue: 'Configure Pull Orders',
                              })}
                              type="primary"
                              icon={<CloudDownloadOutlined />}
                              disabled={agent.status !== 'ONLINE'}
                              onClick={onOpen}
                            />
                          </Tooltip>
                        )}
                        renderContent={() => (
                          <div className={styles.commandPopover}>
                            <Typography.Text strong>Order history</Typography.Text>
                            <Select
                              aria-label={t('portal.integrations.extension.orderHistoryWindow', {
                                defaultValue: 'Order history window',
                              })}
                              value={numDays}
                              onChange={(value: ExtensionImportDays) =>
                                setCommandImportDays((current) => ({
                                  ...current,
                                  [agent.id]: value,
                                }))
                              }
                              options={[1, 2, 7, 15, 30].map((value) => ({
                                value,
                                label: `${value} day${value === 1 ? '' : 's'}`,
                              }))}
                            />
                            <Button
                              aria-label={t('portal.integrations.extension.pullOrders', {
                                defaultValue: 'Pull orders',
                              })}
                              type="primary"
                              icon={<CloudDownloadOutlined />}
                              loading={createCommand.isPending}
                              onClick={() =>
                                createCommand.mutate({
                                  agentId: agent.id,
                                  type: 'IMPORT_NEW_ORDERS',
                                  numDays,
                                })
                              }
                            >
                              Pull orders
                            </Button>
                          </div>
                        )}
                      />
                      <LazyActionPopover
                        title="More actions"
                        renderTrigger={(onOpen) => (
                          <Tooltip title="More extension actions">
                            <Button
                              aria-label={t('portal.integrations.extension.moreActions', {
                                defaultValue: 'More extension actions',
                              })}
                              icon={<MoreOutlined />}
                              onClick={onOpen}
                            />
                          </Tooltip>
                        )}
                        renderContent={() => (
                          <Space direction="vertical" size={4}>
                            <Popover
                              title="Pull Ads"
                              trigger="click"
                              content={
                                <div className={styles.commandPopover}>
                                  <Typography.Text strong>Ads period</Typography.Text>
                                  <DateRangePicker
                                    aria-label={t('portal.integrations.extension.adsDateRange', {
                                      defaultValue: 'Ads date range',
                                    })}
                                    value={adsDateRange}
                                    onChange={(value) =>
                                      setAdsCommandDates((current) => ({
                                        ...current,
                                        [agent.id]: value,
                                      }))
                                    }
                                  />
                                  <Button
                                    aria-label={t('portal.integrations.extension.pullAds', {
                                      defaultValue: 'Pull Ads',
                                    })}
                                    type="primary"
                                    icon={<CloudDownloadOutlined />}
                                    loading={createCommand.isPending}
                                    disabled={!adsDateRange?.dateFrom || !adsDateRange?.dateTo}
                                    onClick={() =>
                                      createCommand.mutate({
                                        agentId: agent.id,
                                        type: 'IMPORT_ADS_SPEND',
                                        ...adsDateRange,
                                      })
                                    }
                                  >
                                    Pull Ads
                                  </Button>
                                </div>
                              }
                            >
                              <Button
                                aria-label={t('portal.integrations.extension.configurePullAds', {
                                  defaultValue: 'Configure Pull Ads',
                                })}
                                block
                                icon={<CloudDownloadOutlined />}
                                disabled={
                                  agent.status !== 'ONLINE' ||
                                  !canWriteFinanceForShop(account, agent.shopId)
                                }
                              >
                                Pull Ads
                              </Button>
                            </Popover>
                            <Button
                              aria-label={t('portal.integrations.extension.testConnection', {
                                defaultValue: 'Test connection',
                              })}
                              block
                              icon={<ApiOutlined />}
                              loading={createCommand.isPending}
                              disabled={agent.status !== 'ONLINE'}
                              onClick={() =>
                                createCommand.mutate({ agentId: agent.id, type: 'TEST_CONNECTION' })
                              }
                            >
                              Test connection
                            </Button>
                            {!agent.token?.revokedAt && agent.token ? (
                              <>
                                <Divider style={{ margin: '4px 0' }} />
                                <Popconfirm
                                  title="Revoke this extension token?"
                                  okText="Revoke"
                                  onConfirm={() => revokeToken.mutate(agent.token!.id)}
                                >
                                  <Button
                                    aria-label={t('portal.integrations.extension.revokeToken', {
                                      defaultValue: 'Revoke token',
                                    })}
                                    danger
                                    block
                                    icon={<StopOutlined />}
                                  >
                                    Revoke token
                                  </Button>
                                </Popconfirm>
                              </>
                            ) : null}
                          </Space>
                        )}
                      />
                    </Space>
                  )
                },
              },
            ]}
            scroll={{ x: 'max-content' }}
          />
          {extensionAgents.data?.items.length === 0 ? (
            <Typography.Text type="secondary">
              {t('portal.integrations.extension.noAgents', {
                defaultValue: 'No online extension found. Open the extension on the RDC first.',
              })}
            </Typography.Text>
          ) : null}
          {createCommand.error ? (
            <Alert type="error" showIcon message={(createCommand.error as Error).message} />
          ) : null}
          <DataTable
            rowKey="id"
            loading={extensionCommands.isLoading}
            dataSource={extensionCommands.data?.items ?? []}
            pagination={false}
            columns={[
              {
                title: t('portal.integrations.extension.command', { defaultValue: 'Command' }),
                dataIndex: 'type',
              },
              {
                title: t('portal.integrations.extension.status', { defaultValue: 'Status' }),
                dataIndex: 'status',
                render: (status: string, command) => (
                  <Space size={6}>
                    <StatusTag
                      status={
                        status === 'SUCCEEDED'
                          ? 'operational'
                          : status === 'FAILED'
                            ? 'critical'
                            : 'pending'
                      }
                    >
                      {status}
                    </StatusTag>
                    <Tooltip title="View task details">
                      <Button
                        aria-label={t('portal.integrations.extension.viewTaskDetails', {
                          defaultValue: 'View task details',
                        })}
                        type="text"
                        icon={<InfoCircleOutlined />}
                        onClick={() => setSelectedCommand(command)}
                      />
                    </Tooltip>
                  </Space>
                ),
              },
              {
                title: 'Next poll',
                render: (_, command) => {
                  if (command.status === 'FAILED') return 'Not retrying'
                  if (command.status === 'SUCCEEDED') return 'Completed'
                  if (command.status === 'RUNNING' || command.status === 'CLAIMED')
                    return 'Processing…'
                  const agentId = command.agentId
                  const agent = extensionAgentById.get(agentId)
                  return agent ? nextPollLabel(agent.lastSeenAt, now) : '-'
                },
              },
              {
                title: t('portal.integrations.extension.created', { defaultValue: 'Created' }),
                dataIndex: 'createdAt',
                render: (value: string) => new Date(value).toLocaleString(),
              },
            ]}
          />
          <Drawer
            title="Task details"
            open={Boolean(selectedCommand)}
            onClose={() => setSelectedCommand(undefined)}
          >
            {selectedCommand ? (
              <div className={styles.commandTimeline}>
                <Space>
                  <StatusTag
                    status={
                      selectedCommand.status === 'SUCCEEDED'
                        ? 'operational'
                        : selectedCommand.status === 'FAILED'
                          ? 'critical'
                          : 'pending'
                    }
                  >
                    {selectedCommand.status}
                  </StatusTag>
                  <Typography.Text>{selectedCommand.type}</Typography.Text>
                </Space>
                {[
                  ['Created', selectedCommand.createdAt],
                  ['Claimed', selectedCommand.claimedAt],
                  ['Started', selectedCommand.startedAt],
                  [
                    selectedCommand.status === 'FAILED'
                      ? 'Failed'
                      : selectedCommand.status === 'SUCCEEDED'
                        ? 'Completed'
                        : 'Last update',
                    selectedCommand.completedAt,
                  ],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div className={styles.commandTimelineRow} key={String(label)}>
                      <Typography.Text strong>{label}</Typography.Text>
                      <Typography.Text type="secondary">
                        {new Date(String(value)).toLocaleString()}
                      </Typography.Text>
                    </div>
                  ))}
                {selectedCommand.errorMessage ? (
                  <Alert type="error" showIcon title={selectedCommand.errorMessage} />
                ) : null}
              </div>
            ) : null}
          </Drawer>
        </div>
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
        <DataTable
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
  const adsMappingTab = (
    <SectionCard title="Unassigned Amazon Ads rows">
      <Typography.Paragraph type="secondary">
        Map each campaign or portfolio to an internal shop. The unread Amazon report retries on the
        next scan.
      </Typography.Paragraph>
      {canReadAdsImports ? (
        <DataTable<AdsUnassignedRow>
          rowKey="id"
          loading={adsUnassignedRows.isLoading}
          dataSource={adsUnassignedRows.data?.items ?? []}
          pagination={false}
          columns={[
            {
              title: 'Report date',
              dataIndex: 'reportDate',
              render: (value: string) => value.slice(0, 10),
            },
            { title: 'Advertiser account', dataIndex: 'advertiserAccountId' },
            {
              title: 'Campaign / portfolio',
              render: (_, row) =>
                row.campaignName || row.campaignId || row.portfolioName || row.portfolioId || '—',
            },
            {
              title: 'Action',
              render: (_, row) => (
                <Button
                  disabled={!canManageAdsMappings}
                  onClick={() => {
                    setSelectedAdsUnassignedRow(row)
                    adsMappingForm.setFieldsValue({
                      matchType: row.campaignId ? 'CAMPAIGN' : 'PORTFOLIO',
                      shopId: undefined,
                    })
                  }}
                >
                  Map shop
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <Alert
          type="info"
          showIcon
          message="Finance read permission is required to view unassigned Ads rows."
        />
      )}
      {canReadAdsImports && !canManageAdsMappings ? (
        <Alert
          type="info"
          showIcon
          message="Finance write permission is required to change Ads mappings."
        />
      ) : null}
    </SectionCard>
  )
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
  const financeTab = (
    <UiTabs
      items={[
        {
          key: 'ads',
          label: <UiTabLabel>Ads</UiTabLabel>,
          children: adsTab,
        },
        {
          key: 'ads-mapping',
          label: <UiTabLabel>Ads mapping</UiTabLabel>,
          children: adsMappingTab,
        },
        {
          key: 'transactions',
          label: <UiTabLabel>Transactions</UiTabLabel>,
          children: transactionsTab,
        },
        {
          key: 'settlements',
          label: <UiTabLabel>Settlements</UiTabLabel>,
          children: settlementsTab,
        },
      ]}
    />
  )
  const automationTab = (
    <SectionCard title="Automation">
      <Typography.Paragraph type="secondary">
        Configure recurring imports for each connected extension. Ads, Transactions, and Settlements
        schedules will appear here when supported.
      </Typography.Paragraph>
      <DataTable<ExtensionManagementAgent>
        rowKey="id"
        loading={extensionManagementAgents.isLoading || extensionOrderSchedules.isLoading}
        dataSource={extensionManagementAgents.data?.items ?? []}
        pagination={false}
        columns={[
          {
            title: 'Shop',
            dataIndex: 'shopId',
            width: 180,
            render: (shopId: string) => shopNames.get(shopId) ?? shopId,
          },
          { title: 'RDC / Chrome', dataIndex: 'label', width: 200 },
          {
            title: 'Order schedule',
            width: 150,
            render: (_, agent) => {
              const schedule = orderScheduleByAgentId.get(agent.id)
              return schedule?.enabled ? (
                <StatusTag status="operational">Enabled</StatusTag>
              ) : (
                <Typography.Text type="secondary">Disabled</Typography.Text>
              )
            },
          },
          {
            title: 'Interval',
            width: 150,
            render: (_, agent) => {
              const schedule = orderScheduleByAgentId.get(agent.id)
              return schedule?.enabled ? `Every ${schedule.intervalMinutes / 60}h` : '—'
            },
          },
          {
            title: 'Next run',
            width: 180,
            render: (_, agent) => {
              const nextRunAt = orderScheduleByAgentId.get(agent.id)?.nextRunAt
              return nextRunAt ? new Date(nextRunAt).toLocaleString() : '—'
            },
          },
          {
            title: 'Actions',
            width: 130,
            render: (_, agent) => {
              const schedule = orderScheduleByAgentId.get(agent.id)
              return (
                <Popover
                  title="Order schedule"
                  trigger="click"
                  content={
                    <div className={styles.commandPopover}>
                      <Select
                        aria-label={t('portal.integrations.extension.orderScheduleInterval', {
                          defaultValue: 'Order schedule interval',
                        })}
                        defaultValue={schedule?.intervalMinutes ?? 120}
                        options={[60, 120, 180, 240].map((value) => ({
                          value,
                          label: `Every ${value / 60} hour${value === 60 ? '' : 's'}`,
                        }))}
                        onChange={(intervalMinutes: 60 | 120 | 180 | 240) =>
                          saveOrderSchedule.mutate({
                            agentId: agent.id,
                            enabled: schedule?.enabled ?? true,
                            intervalMinutes,
                          })
                        }
                      />
                      <Button
                        aria-label={t('portal.integrations.extension.saveOrderSchedule', {
                          defaultValue: 'Save schedule',
                        })}
                        type="primary"
                        loading={saveOrderSchedule.isPending}
                        onClick={() =>
                          saveOrderSchedule.mutate({
                            agentId: agent.id,
                            enabled: !(schedule?.enabled ?? false),
                            intervalMinutes: schedule?.intervalMinutes ?? 120,
                          })
                        }
                      >
                        {schedule?.enabled ? 'Disable schedule' : 'Save schedule'}
                      </Button>
                    </div>
                  }
                >
                  <Button
                    aria-label={t('portal.integrations.extension.configureOrderSchedule', {
                      defaultValue: 'Configure order schedule',
                    })}
                    icon={<ClockCircleOutlined />}
                  >
                    Configure
                  </Button>
                </Popover>
              )
            },
          },
        ]}
      />
    </SectionCard>
  )

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.integrations.title', { defaultValue: 'Integrations' })}
        description={t('portal.integrations.description', {
          defaultValue: 'Manage imports, extension setup, and marketplace data sync evidence.',
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
      <UiTabs
        destroyOnHidden
        items={[
          {
            key: 'orders',
            label: (
              <UiTabLabel>
                {t('portal.integrations.tabs.orders', { defaultValue: 'Orders' })}
              </UiTabLabel>
            ),
            children: ordersTab,
          },
          {
            key: 'extension',
            label: (
              <UiTabLabel>
                {t('portal.integrations.tabs.extension', { defaultValue: 'Amazon Extension' })}
              </UiTabLabel>
            ),
            children: extensionTab,
          },
          {
            key: 'automation',
            label: <UiTabLabel>Automation</UiTabLabel>,
            children: automationTab,
          },
          {
            key: 'finance',
            label: <UiTabLabel>Finance data</UiTabLabel>,
            children: financeTab,
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
      <Modal
        title="Map Amazon Ads row to a shop"
        open={Boolean(selectedAdsUnassignedRow)}
        confirmLoading={saveAdsMapping.isPending}
        okText="Save mapping"
        onCancel={() => setSelectedAdsUnassignedRow(undefined)}
        onOk={() => {
          if (!selectedAdsUnassignedRow) return
          adsMappingForm.validateFields().then(({ matchType, shopId }) => {
            const externalId =
              matchType === 'CAMPAIGN'
                ? selectedAdsUnassignedRow.campaignId
                : selectedAdsUnassignedRow.portfolioId
            if (!externalId || !selectedAdsUnassignedRow.advertiserAccountId) return
            saveAdsMapping.mutate({
              advertiserAccountId: selectedAdsUnassignedRow.advertiserAccountId,
              matchType,
              externalId,
              shopId,
              salesChannelCode: selectedAdsUnassignedRow.salesChannelCode ?? undefined,
              marketplaceCode: selectedAdsUnassignedRow.marketplaceCode ?? undefined,
            } satisfies AdsShopMappingInput)
          })
        }}
      >
        <Form form={adsMappingForm} layout="vertical">
          <Form.Item label="Match by" name="matchType" rules={[{ required: true }]}>
            <Select
              options={[
                ...(selectedAdsUnassignedRow?.campaignId
                  ? [{ value: 'CAMPAIGN', label: 'Campaign' }]
                  : []),
                ...(selectedAdsUnassignedRow?.portfolioId
                  ? [{ value: 'PORTFOLIO', label: 'Portfolio' }]
                  : []),
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Shop"
            name="shopId"
            rules={[{ required: true, message: 'Select a shop' }]}
          >
            <Select
              options={(shops.data?.items ?? []).map((shop) => ({
                value: shop.id,
                label: shop.name,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}

export default IntegrationWorkbenchPage
