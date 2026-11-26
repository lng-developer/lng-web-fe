import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ConfigProvider } from 'antd'

import { ExtensionLogsPage } from '@/features/portal/extensions/pages/ExtensionLogsPage'
import * as extensionApi from '@/features/portal/extensions/api/extensionApi'
import type {
  ExtensionCommand,
  ExtensionManagementAgent,
} from '@/features/portal/extensions/api/extensionApi'
import {
  getFinanceImportBatch,
  getSettlement,
  listImportBatches,
  listImportedFinanceData,
  type ImportBatch,
} from '@/features/portal/finance/api/financeApi'
import {
  getImportJobProgress,
  listJobRawRecords,
} from '@/features/portal/integrations/api/integrationApi'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import i18n from '@/shared/i18n/i18n'

const routeAccess = vi.hoisted(() => ({ permissions: [] as string[] }))

vi.mock('@/features/portal/finance/api/financeApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/finance/api/financeApi')>()),
  getFinanceImportBatch: vi.fn(),
  getSettlement: vi.fn(),
  listImportBatches: vi.fn(),
  listImportedFinanceData: vi.fn(),
}))

const financeBatch: ImportBatch = {
  id: 'batch-1',
  sourceType: 'ADS',
  shopId: 'shop-amz',
  originalFilename: 'ads-report.csv',
  dryRun: false,
  status: 'COMPLETED',
  processedRows: 1,
  validRows: 1,
  skippedRows: 0,
  unlinkedRows: 0,
  errorCount: 0,
  errors: [],
  recalculationStatus: 'NOT_REQUIRED',
  recalculationTotal: 0,
  recalculationCompleted: 0,
  recalculationFailed: 0,
  recalculationErrors: [],
  createdAt: '2026-11-25T03:00:25Z',
}

vi.mock('@/features/portal/integrations/api/integrationApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/integrations/api/integrationApi')>()),
  getImportJobProgress: vi.fn(),
  listJobRawRecords: vi.fn(),
}))

vi.mock('@/features/portal/extensions/api/extensionApi', () => ({
  listExtensionAgents: vi.fn(),
  listExtensionManagementAgents: vi.fn(),
  listExtensionCommands: vi.fn(),
  listExtensionOrderSchedules: vi.fn(),
  listExtensionTrackingSchedules: vi.fn(),
  listExtensionFinanceSchedules: vi.fn(),
  createExtensionCommand: vi.fn(),
  createExtensionToken: vi.fn(),
  revokeExtensionToken: vi.fn(),
  listAllActiveShops: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useRouteLoaderData: () => ({
      id: 'acc-1',
      permissions: routeAccess.permissions,
      scopes: [],
    }),
  }
})

describe('ExtensionLogsPage', () => {
  let queryClient: QueryClient
  let commandResponse: Awaited<ReturnType<typeof extensionApi.listExtensionCommands>>

  beforeEach(async () => {
    await i18n.changeLanguage('en')
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    vi.clearAllMocks()
    routeAccess.permissions = ['ORDERS:READ', 'ORDERS:WRITE', 'FINANCE:READ', 'FINANCE:WRITE']

    vi.mocked(extensionApi.listAllActiveShops).mockResolvedValue({
      items: [
        {
          id: 'shop-amz',
          name: 'Amazon US Store',
          salesChannelCode: 'AMAZON',
          status: 'ACTIVE',
        } as unknown as Shop,
        {
          id: 'shop-etsy',
          name: 'Etsy Gift Shop',
          salesChannelCode: 'ETSY',
          status: 'ACTIVE',
        } as unknown as Shop,
      ],
      pagination: { total: 2, page: 1, limit: 100 },
    })

    vi.mocked(extensionApi.listExtensionAgents).mockResolvedValue({ items: [] })
    vi.mocked(extensionApi.listExtensionManagementAgents).mockResolvedValue({
      items: [
        {
          id: 'agent-1',
          shopId: 'shop-amz',
          label: 'Amazon Bot 01',
          clientId: 'amz-01',
          status: 'ONLINE',
          provider: 'AMAZON',
        } as unknown as ExtensionManagementAgent,
        {
          id: 'agent-offline',
          shopId: 'shop-amz',
          label: 'Offline Bot',
          clientId: 'offline-client',
          status: 'OFFLINE',
        } as unknown as ExtensionManagementAgent,
      ],
    })

    commandResponse = {
      items: [
        {
          id: 'cmd-1',
          type: 'IMPORT_NEW_ORDERS',
          status: 'SUCCEEDED',
          provider: 'AMAZON',
          shopId: 'shop-amz',
          agentId: 'agent-1',
          createdAt: new Date().toISOString(),
          result: { importedCount: 15, failedCount: 0 },
        } as unknown as ExtensionCommand,
        {
          id: 'cmd-2',
          type: 'IMPORT_NEW_ORDERS',
          status: 'FAILED',
          provider: 'ETSY',
          shopId: 'shop-etsy',
          agentId: 'agent-1',
          createdAt: new Date().toISOString(),
          errorMessage: 'Auth session expired',
        } as unknown as ExtensionCommand,
        {
          id: 'cmd-offline',
          type: 'IMPORT_NEW_ORDERS',
          status: 'FAILED',
          shopId: 'shop-amz',
          agentId: 'agent-offline',
          createdAt: new Date().toISOString(),
          errorMessage: 'Offline worker command',
        } as unknown as ExtensionCommand,
      ],
      pagination: { total: 3, page: 1, limit: 50 },
    }
    vi.mocked(extensionApi.listExtensionCommands).mockResolvedValue(commandResponse)

    vi.mocked(extensionApi.listExtensionOrderSchedules).mockResolvedValue({ items: [] })
    vi.mocked(extensionApi.listExtensionTrackingSchedules).mockResolvedValue({ items: [] })
    vi.mocked(extensionApi.listExtensionFinanceSchedules).mockResolvedValue({ items: [] })
  })

  it('lists command logs of online workers across platforms', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExtensionLogsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Log Manager')).toBeInTheDocument()
    expect(await screen.findByText('Succeeded', { selector: 'td span' })).toBeInTheDocument()
    expect(screen.queryByText('Offline worker command')).not.toBeInTheDocument()
    expect(await screen.findByText('Failed', { selector: 'td span' })).toBeInTheDocument()
    expect(screen.getByText('Auth session expired')).toBeInTheDocument()
  })

  it('filters command logs by platform', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExtensionLogsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Succeeded', { selector: 'td span' })).toBeInTheDocument()
    expect(screen.getByText('Failed', { selector: 'td span' })).toBeInTheDocument()

    // Filter to Etsy
    const etsyFilterBtn = screen.getByRole('radio', { name: 'Etsy' })
    fireEvent.click(etsyFilterBtn)

    expect(screen.getByText('Failed', { selector: 'td span' })).toBeInTheDocument()
    expect(screen.queryByText('Succeeded', { selector: 'td span' })).not.toBeInTheDocument()
  })

  it('opens the shared import job summary and raw records for a linked command', async () => {
    const jobId = 'linked-job-1'
    vi.mocked(extensionApi.listExtensionCommands).mockResolvedValueOnce({
      ...commandResponse,
      items: [
        {
          ...commandResponse.items[0],
          status: 'FAILED',
          importJobId: jobId,
          errorMessage: 'Auth session expired',
        },
      ],
    })
    const timestamp = '2026-11-25T03:00:00Z'
    const phase = { total: 15, completed: 15, failed: 0, skipped: 0, percentage: 100 }
    vi.mocked(getImportJobProgress).mockResolvedValue({
      job: {
        id: jobId,
        source: 'AMAZON_EXTENSION_REPORT',
        sourceType: 'EXTENSION_REPORT',
        shopId: 'shop-amz',
        shopConnectionId: null,
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'US',
        externalAccountId: null,
        sourceFileId: null,
        status: 'COMPLETED',
        totalRecords: 15,
        parsedCount: 15,
        importedCount: 15,
        skippedCount: 0,
        failedCount: 0,
        startedAt: timestamp,
        finishedAt: timestamp,
        triggeredBy: null,
        errorCode: null,
        errorMessage: null,
        summary: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      phases: { parse: phase, import: phase, postImport: phase },
      issues: { total: 0, open: 0, ignored: 0, resolved: 0 },
      percentage: 100,
      isTerminal: true,
      updatedAt: timestamp,
    })
    vi.mocked(listJobRawRecords).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 50, total: 0 },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/portal/extensions/logs']}>
          <ExtensionLogsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /details/i }))

    expect(await screen.findByText(`Import job ${jobId}`)).toBeVisible()
    expect(await screen.findByText('Parse progress')).toBeVisible()
    expect(screen.getByText('Import progress')).toBeVisible()
    expect(screen.getByText('Post-import progress')).toBeVisible()
    expect(
      within(screen.getByRole('complementary')).getByText('Auth session expired'),
    ).toBeVisible()
    expect(getImportJobProgress).toHaveBeenCalledWith(jobId)
    expect(screen.queryByText('Task details')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View raw records' }))
    expect(await screen.findByText('Raw records', { exact: true })).toBeVisible()
    expect(listJobRawRecords).toHaveBeenCalledWith(jobId, expect.objectContaining({ page: 1 }))
  })

  it('shows a compact summary for a failed order command without an import job', async () => {
    const timestamp = '2026-11-25T03:00:00Z'
    vi.mocked(extensionApi.listExtensionCommands).mockResolvedValueOnce({
      ...commandResponse,
      items: [
        {
          ...commandResponse.items[1],
          maxOrders: 50,
          result: { importedCount: 0, failedCount: 0 },
          errorMessage: 'Cancelled by operator',
          claimedAt: timestamp,
          startedAt: timestamp,
          completedAt: timestamp,
        },
      ],
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExtensionLogsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /details/i }))

    const details = within(await screen.findByRole('dialog'))
    expect(details.getByText('Task details')).toBeVisible()
    expect(details.getByRole('alert')).toHaveTextContent('Cancelled by operator')
    expect(details.getByRole('heading', { name: 'Summary' })).toBeVisible()
    expect(details.getByText('Failed', { selector: 'dd span' })).toBeVisible()
    expect(details.getByText('Sync orders')).toBeVisible()
    expect(details.getByText('50')).toBeVisible()
    expect(details.getByText('Finished')).toBeVisible()
    expect(details.queryByText('IMPORT_NEW_ORDERS')).not.toBeInTheDocument()
    expect(details.queryByRole('button', { name: 'View raw records' })).not.toBeInTheDocument()
    expect(getImportJobProgress).not.toHaveBeenCalled()
  })

  it.each([
    ['IMPORT_NEW_ORDERS', 'FINANCE:READ'],
    ['IMPORT_TRANSACTIONS', 'ORDERS:READ'],
  ] as const)(
    'keeps %s command details available without report access',
    async (type, permission) => {
      routeAccess.permissions = [permission]
      vi.mocked(extensionApi.listExtensionCommands).mockResolvedValueOnce({
        ...commandResponse,
        items: [{ ...commandResponse.items[0], type, importJobId: 'restricted-job' }],
      })
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ExtensionLogsPage />
          </MemoryRouter>
        </QueryClientProvider>,
      )

      fireEvent.click(await screen.findByRole('button', { name: /details/i }))

      expect(await screen.findByText('Task details')).toBeVisible()
      expect(screen.queryByRole('link', { name: 'restricted-job' })).not.toBeInTheDocument()
      expect(getImportJobProgress).not.toHaveBeenCalled()
      expect(getFinanceImportBatch).not.toHaveBeenCalled()
      expect(listImportBatches).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['IMPORT_TRANSACTIONS', 'TRANSACTIONS', 'transactions', 'Posted'],
    ['IMPORT_SETTLEMENTS', 'SETTLEMENTS', 'settlements', 'Deposit date'],
    ['IMPORT_ADS_SPEND', 'ADS', 'ads', 'Campaign'],
  ] as const)('opens the Finance table for %s', async (type, sourceType, source, column) => {
    routeAccess.permissions = ['FINANCE:READ']
    vi.mocked(extensionApi.listExtensionCommands).mockResolvedValueOnce({
      ...commandResponse,
      items: [{ ...commandResponse.items[0], type, importJobId: financeBatch.id }],
    })
    vi.mocked(getFinanceImportBatch).mockResolvedValue({ ...financeBatch, sourceType })
    vi.mocked(listImportedFinanceData).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 50, total: 0 },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExtensionLogsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /details/i }))

    expect(await screen.findByRole('columnheader', { name: column })).toBeVisible()
    expect(listImportedFinanceData).toHaveBeenCalledWith(
      source,
      expect.objectContaining({ importBatchId: financeBatch.id }),
    )
    expect(getImportJobProgress).not.toHaveBeenCalled()
  })

  it('opens settlement activity above the report and keeps the Log Manager URL', async () => {
    const path = '/portal/extensions/logs'
    const report = {
      ...financeBatch,
      sourceType: 'SETTLEMENTS',
      originalFilename: 'settlements.txt',
    }
    const ledgerSummary = {
      inflowAmount: 1000,
      outflowAmount: -200,
      netAmount: 800,
      payoutAmount: 800,
      ledgerNetAmount: 800,
      cashVarianceAmount: 0,
      lineCount: 0,
      linkedCount: 0,
      unlinkedCount: 0,
      linkCoverageBps: null,
    }
    const settlement = {
      id: 'settlement-record',
      settlementId: 'S-123',
      shopId: 'shop-amz',
      salesChannelCode: 'AMAZON',
      marketplaceCode: 'US',
      currency: 'USD',
      totalAmount: 800,
      ledgerSummary,
      importBatchId: report.id,
    }
    routeAccess.permissions = ['FINANCE:READ']
    vi.mocked(extensionApi.listExtensionCommands).mockResolvedValueOnce({
      ...commandResponse,
      items: [{ ...commandResponse.items[0], type: 'IMPORT_SETTLEMENTS', importJobId: report.id }],
    })
    vi.mocked(getFinanceImportBatch).mockResolvedValue(report)
    vi.mocked(listImportedFinanceData).mockResolvedValue({
      items: [settlement],
      pagination: { page: 1, limit: 50, total: 1 },
    })
    vi.mocked(getSettlement).mockResolvedValue({
      settlement,
      ledger: { items: [], summary: ledgerSummary, pagination: { page: 1, limit: 20, total: 0 } },
    })

    function CurrentLocation() {
      const location = useLocation()
      return <output>{location.pathname + location.search}</output>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <ConfigProvider theme={{ token: { motion: false } }}>
            <ExtensionLogsPage />
            <CurrentLocation />
          </ConfigProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: /details/i }))
    const activityButton = await screen.findByRole('button', { name: 'View settlement activity' })
    expect(getSettlement).not.toHaveBeenCalled()
    fireEvent.click(activityButton)

    expect(screen.getByText(path, { exact: true })).toBeInTheDocument()
    const activity = (await screen.findByText('Ledger movement')).closest<HTMLElement>(
      '[role="dialog"]',
    )!
    expect(within(activity).getByText('Settlement ID: S-123')).toBeInTheDocument()
    expect(within(activity).queryByText('Confirm bank receipt')).toBeNull()
    expect(getSettlement).toHaveBeenCalledWith('settlement-record', {
      page: 1,
      limit: 20,
      linkState: 'ALL',
    })

    const closeButton = activity.querySelector('button[aria-label="Close"]')!
    fireEvent.click(closeButton)
    await waitFor(() => expect(activity.isConnected).toBe(false), { timeout: 5000 })
    expect(screen.getByText('View settlement activity')).toBeInTheDocument()
    expect(screen.getByText('settlements.txt')).toBeInTheDocument()
    expect(screen.getByText(path, { exact: true })).toBeInTheDocument()
  }, 25_000)

  it.each([
    ['SUCCEEDED', 0, null, 'No records were imported in this run'],
    [
      'FAILED',
      1,
      'No closed settlement with Flat File V2 found in the requested range',
      'No report is linked to this task',
    ],
  ] as const)(
    'opens Finance details for a %s settlement without a batch',
    async (status, failedCount, errorMessage, emptyTitle) => {
      const timestamp = '2026-11-20T06:53:33Z'
      vi.mocked(extensionApi.listExtensionCommands).mockResolvedValueOnce({
        ...commandResponse,
        items: [
          {
            ...commandResponse.items[0],
            type: 'IMPORT_SETTLEMENTS',
            status,
            importJobId: null,
            errorMessage,
            startedAt: timestamp,
            completedAt: timestamp,
            result: { importedCount: 0, failedCount },
          },
        ],
      })
      vi.mocked(listImportBatches).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 100, total: 0 },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ExtensionLogsPage />
          </MemoryRouter>
        </QueryClientProvider>,
      )
      fireEvent.click(await screen.findByRole('button', { name: /details/i }))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText('Settlements', { exact: true })).toBeVisible()
      expect(await within(dialog).findByText(emptyTitle)).toBeVisible()
      expect(within(dialog).getByText('Imported: 0')).toBeVisible()
      expect(within(dialog).getByText(`Failed: ${failedCount}`)).toBeVisible()
      expect(within(dialog).getByText('Finished')).toBeVisible()
      if (errorMessage) expect(within(dialog).getByText(errorMessage)).toBeVisible()
      expect(
        within(dialog).queryByRole('columnheader', { name: 'Deposit date' }),
      ).not.toBeInTheDocument()
      expect(getFinanceImportBatch).not.toHaveBeenCalled()
      expect(listImportedFinanceData).not.toHaveBeenCalled()
    },
  )

  it.each([1, 2])(
    'finds %s Ads reports within the legacy command’s shop and run time',
    async (count) => {
      const startedAt = '2026-11-25T03:00:00Z'
      const completedAt = '2026-11-25T03:01:00Z'
      vi.mocked(extensionApi.listExtensionCommands).mockResolvedValueOnce({
        ...commandResponse,
        items: [
          {
            ...commandResponse.items[0],
            type: 'IMPORT_ADS_SPEND',
            importJobId: null,
            startedAt,
            completedAt,
          },
        ],
      })
      vi.mocked(listImportBatches).mockResolvedValue({
        items:
          count === 1
            ? [financeBatch]
            : [
                financeBatch,
                { ...financeBatch, id: 'batch-2', originalFilename: 'second-report.csv' },
              ],
        pagination: { page: 1, limit: 100, total: count },
      })
      vi.mocked(listImportedFinanceData).mockResolvedValue({
        items: [{ id: 'spend-1', campaignName: 'Example campaign', spendAmount: 170 }],
        pagination: { page: 1, limit: 50, total: 1 },
      })
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ExtensionLogsPage />
          </MemoryRouter>
        </QueryClientProvider>,
      )

      fireEvent.click(await screen.findByRole('button', { name: /details/i }))

      if (count === 1) {
        await waitFor(() => expect(screen.getByText('Example campaign')).toBeVisible())
      } else {
        expect(await screen.findByRole('combobox', { name: 'Choose a report' })).toBeVisible()
        expect(listImportedFinanceData).not.toHaveBeenCalled()
      }
      expect(listImportBatches).toHaveBeenCalledWith(
        expect.objectContaining({
          shopId: 'shop-amz',
          sourceType: 'ADS',
          dateFrom: startedAt,
          dateTo: completedAt,
        }),
      )
    },
  )

  it('shows a readable Etsy warning in the table and details without the code', async () => {
    vi.mocked(extensionApi.listExtensionCommands).mockResolvedValueOnce({
      items: [
        {
          id: 'etsy-review-command',
          type: 'IMPORT_NEW_ORDERS',
          status: 'FAILED',
          provider: 'ETSY',
          shopId: 'shop-etsy',
          agentId: 'agent-1',
          createdAt: new Date().toISOString(),
          errorMessage: 'ETSY_IMPORT_NEEDS_REVIEW',
        } as unknown as ExtensionCommand,
      ],
      pagination: { total: 1, page: 1, limit: 50 },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExtensionLogsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Etsy order import needs review')).toBeVisible()
    expect(screen.queryByText('ETSY_IMPORT_NEEDS_REVIEW')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /details/i }))

    const warning = within(await screen.findByRole('dialog')).getByRole('alert')
    expect(warning).toHaveClass('ant-alert-warning')
    expect(warning).toHaveTextContent('Etsy order import needs review')
    expect(screen.queryByText('ETSY_IMPORT_NEEDS_REVIEW')).not.toBeInTheDocument()
  })

  it('localizes the Vietnamese log and cancellation reason in details', async () => {
    await i18n.changeLanguage('vi')
    vi.mocked(extensionApi.listExtensionCommands).mockResolvedValueOnce({
      ...commandResponse,
      items: commandResponse.items.map((command) =>
        command.id === 'cmd-2' ? { ...command, errorMessage: 'Cancelled by operator' } : command,
      ),
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExtensionLogsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const reason = await screen.findByText('Đã hủy bởi người vận hành')
    const failedRow = reason.closest('tr')
    if (!failedRow) throw new Error('Expected the cancellation reason in a table row')
    expect(within(failedRow).getByText('Thất bại')).toBeVisible()
    expect(within(failedRow).getByText('Đồng bộ đơn hàng')).toBeVisible()
    expect(
      screen.getByText((_, element) => element?.textContent === 'Đã nhập: 15', {
        selector: 'td span',
      }),
    ).toBeVisible()
    expect(screen.queryByText('IMPORT_NEW_ORDERS')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancelled by operator')).not.toBeInTheDocument()

    fireEvent.click(within(failedRow).getByRole('button', { name: /Chi tiết/i }))

    const details = await screen.findByRole('dialog')
    expect(within(details).getByText('Chi tiết tác vụ')).toBeVisible()
    expect(within(details).getByText('Đã hủy bởi người vận hành')).toBeVisible()
    expect(within(details).queryByText('Cancelled by operator')).not.toBeInTheDocument()
  })
})
