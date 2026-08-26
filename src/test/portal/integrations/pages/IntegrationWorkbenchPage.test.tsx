import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CurrentAccount } from '@/features/auth/api/authApi'

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>()
  return {
    ...actual,
    DataTable: ({
      columns = [],
      dataSource = [],
      onRow,
    }: {
      columns?: Array<{
        dataIndex?: string
        render?: (value: unknown, record: Record<string, unknown>) => ReactNode
      }>
      dataSource?: Array<Record<string, unknown>>
      onRow?: (record: Record<string, unknown>) => { onClick?: () => void }
    }) => (
      <table>
        <tbody>
          {dataSource.map((record, rowIndex) => (
            <tr key={String(record.id ?? rowIndex)} onClick={onRow?.(record).onClick}>
              {columns.map((column, columnIndex) => (
                <td key={columnIndex}>
                  {column.render
                    ? column.render(column.dataIndex ? record[column.dataIndex] : undefined, record)
                    : column.dataIndex
                      ? String(record[column.dataIndex] ?? '')
                      : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ),
  }
})

vi.mock('@/features/portal/integrations/api/integrationApi', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/portal/integrations/api/integrationApi')>()
  return {
    ...actual,
    getImportJob: vi.fn(),
    listIssues: vi.fn(),
    listImportJobs: vi.fn(),
    listJobIssues: vi.fn(),
    listJobRawRecords: vi.fn(),
    listExtensionAgents: vi.fn(),
    listExtensionCommands: vi.fn(),
    listExtensionManagementAgents: vi.fn(),
    listExtensionOrderSchedules: vi.fn(),
    createExtensionCommand: vi.fn(),
    upsertExtensionOrderSchedule: vi.fn(),
    uploadEtsySoldItems: vi.fn(),
    uploadManualExcel: vi.fn(),
  }
})

vi.mock('@/features/portal/shops/api/shopApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/portal/shops/api/shopApi')>()
  return { ...actual, listShops: vi.fn() }
})

vi.mock('@/features/auth/extension-tokens/api/extensionTokensApi', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/auth/extension-tokens/api/extensionTokensApi')>()
  return { ...actual, createExtensionToken: vi.fn(), revokeExtensionToken: vi.fn() }
})

vi.mock('@/features/portal/finance/api/financeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/portal/finance/api/financeApi')>()
  return {
    ...actual,
    listAdsUnassignedRows: vi.fn(),
    listImportBatches: vi.fn(),
    upsertAdsShopMapping: vi.fn(),
  }
})

import {
  createExtensionToken,
  revokeExtensionToken,
} from '@/features/auth/extension-tokens/api/extensionTokensApi'
import { listAdsUnassignedRows, listImportBatches } from '@/features/portal/finance/api/financeApi'
import {
  getImportJob,
  listExtensionAgents,
  listExtensionCommands,
  listExtensionManagementAgents,
  listExtensionOrderSchedules,
  listImportJobs,
  listIssues,
  listJobIssues,
  listJobRawRecords,
  uploadEtsySoldItems,
  uploadManualExcel,
} from '@/features/portal/integrations/api/integrationApi'
import { ImportUploadModal } from '@/features/portal/integrations/pages/ImportUploadModal'
import { IntegrationWorkbenchPage } from '@/features/portal/integrations/pages/IntegrationWorkbenchPage'
import { listShops, type Shop } from '@/features/portal/shops/api/shopApi'
import { setPermissions } from '@/shared/auth/session'

const shop: Shop = {
  id: 'shop-1',
  name: 'LNG Amazon US',
  currency: 'USD',
  status: 'ACTIVE',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

const account = (
  permissions: string[] = ['ORDERS:READ'],
  scopes: CurrentAccount['scopes'] = [],
): CurrentAccount => ({
  account: { id: 'account-1', email: 'operator@example.com', mustChangePassword: false },
  roles: [],
  permissions,
  scopes,
  profileSetupRequired: false,
})

const job = {
  id: 'job-1',
  source: 'MANUAL_EXCEL' as const,
  sourceType: 'FILE' as const,
  shopId: shop.id,
  shopConnectionId: null,
  salesChannelCode: 'AMAZON',
  marketplaceCode: 'AMAZON_US',
  externalAccountId: null,
  sourceFileId: null,
  status: 'FAILED' as const,
  totalRecords: 12,
  parsedCount: 11,
  importedCount: 8,
  skippedCount: 1,
  failedCount: 3,
  startedAt: '2026-07-31T00:00:00.000Z',
  finishedAt: '2026-07-31T00:01:00.000Z',
  triggeredBy: 'account-1',
  errorCode: 'ROW_ERROR',
  errorMessage: 'Three rows failed',
  summary: null,
  createdAt: '2026-07-31T00:00:00.000Z',
  updatedAt: '2026-07-31T00:01:00.000Z',
}

const adsImportBatch = {
  id: 'batch-ads-1',
  sourceType: 'ADS',
  originalFilename: 'ads-spend-2026-08-12.csv',
  shopId: shop.id,
  salesChannelCode: 'AMAZON',
  marketplaceCode: 'AMAZON',
  dryRun: false,
  status: 'COMPLETED',
  processedRows: 5,
  validRows: 5,
  skippedRows: 0,
  unlinkedRows: 0,
  errorCount: 0,
  errors: [],
  createdAt: '2026-08-12T00:00:00.000Z',
}

function renderWorkbench(path: string, currentAccount = account()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/portal/integrations"
            element={<IntegrationWorkbenchPage account={currentAccount} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { client, ...view }
}

describe('IntegrationWorkbenchPage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    setPermissions(['ORDERS:READ'])
    vi.mocked(listShops).mockResolvedValue({
      items: [shop],
      pagination: { total: 1, page: 1, limit: 100 },
    })
    vi.mocked(listImportJobs).mockResolvedValue({
      items: [job],
      pagination: { total: 1, page: 2, limit: 20 },
    })
    vi.mocked(listIssues).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 20 },
    })
    vi.mocked(getImportJob).mockResolvedValue(job)
    vi.mocked(listJobIssues).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 10 },
    })
    vi.mocked(listJobRawRecords).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 10 },
    })
    vi.mocked(createExtensionToken).mockResolvedValue({
      token: 'lng_ext_test_token',
      extensionToken: {
        id: 'token-1',
        name: 'Amazon Extension',
        shopId: shop.id,
        environment: 'development',
        tokenHint: 'lng_...oken',
      },
    })
    vi.mocked(revokeExtensionToken).mockResolvedValue({
      id: 'token-1',
      name: 'Amazon Extension',
      shopId: shop.id,
      environment: 'development',
      tokenHint: 'oken',
      revokedAt: '2026-08-22T00:00:00.000Z',
    })
    vi.mocked(listExtensionAgents).mockResolvedValue({ items: [] })
    vi.mocked(listExtensionCommands).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 10 },
    })
    vi.mocked(listExtensionManagementAgents).mockResolvedValue({ items: [] })
    vi.mocked(listExtensionOrderSchedules).mockResolvedValue({ items: [] })
    vi.mocked(listImportBatches).mockResolvedValue({
      items: [adsImportBatch],
      pagination: { total: 1, page: 1, limit: 20 },
    })
    vi.mocked(listAdsUnassignedRows).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 100 },
    })
  })

  it('loads URL-backed filters and renders operational job counts', async () => {
    renderWorkbench(
      '/portal/integrations?shopId=shop-1&source=MANUAL_EXCEL&status=FAILED&page=2&dateFrom=2026-07-01T00%3A00%3A00.000Z&dateTo=2026-07-31T23%3A59%3A59.999Z',
    )

    await waitFor(() =>
      expect(listImportJobs).toHaveBeenCalledWith({
        shopId: 'shop-1',
        source: 'MANUAL_EXCEL',
        status: 'FAILED',
        page: 2,
        limit: 20,
        dateFrom: '2026-07-01T00:00:00.000Z',
        dateTo: '2026-07-31T23:59:59.999Z',
      }),
    )
    expect((await screen.findAllByText('LNG Amazon US')).length).toBeGreaterThan(0)
    expect(screen.getByText('8 imported / 1 skipped / 3 failed')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Upload report' })).not.toBeInTheDocument()
  })

  it('sanitizes malformed page, source, and status URL filters before querying', async () => {
    renderWorkbench('/portal/integrations?page=-3&source=UNKNOWN_SOURCE&status=UNKNOWN_STATUS')

    await waitFor(() => expect(listImportJobs).toHaveBeenCalledWith({ page: 1, limit: 20 }))
    expect(await screen.findByText('8 imported / 1 skipped / 3 failed')).toBeVisible()
  })

  it('accepts valid date-only deep-link filters', async () => {
    renderWorkbench('/portal/integrations?dateFrom=2026-07-01&dateTo=2026-07-31')

    await waitFor(() =>
      expect(listImportJobs).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
      }),
    )
  })

  it('drops only malformed date filters before querying', async () => {
    renderWorkbench('/portal/integrations?dateFrom=2026-02-30&dateTo=2026-07-31')

    await waitFor(() =>
      expect(listImportJobs).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        dateTo: '2026-07-31',
      }),
    )
  })

  it('drops a reversed date range before querying', async () => {
    renderWorkbench('/portal/integrations?dateFrom=2026-08-01&dateTo=2026-07-31')

    await waitFor(() => expect(listImportJobs).toHaveBeenCalledWith({ page: 1, limit: 20 }))
  })

  it('selects a job without navigating away from the workbench', async () => {
    renderWorkbench('/portal/integrations')

    const matches = await screen.findAllByText('LNG Amazon US')
    fireEvent.click(matches[matches.length - 1])

    await waitFor(() => expect(window.location.pathname).not.toBe('/portal/integrations/job-1'))
    expect(
      (await screen.findAllByText('Import job job-1')).some((element) => element.textContent),
    ).toBe(true)
  })

  it('shows upload only for writable shops and invalidates every jobs list after success', async () => {
    const shopB = { ...shop, id: 'shop-2', name: 'Read-only shop' }
    vi.mocked(listShops).mockResolvedValue({
      items: [shop, shopB],
      pagination: { total: 2, page: 1, limit: 100 },
    })
    vi.mocked(uploadManualExcel).mockResolvedValue({
      jobId: job.id,
      status: job.status,
      totalRecords: job.totalRecords,
      importedCount: job.importedCount,
      skippedCount: job.skippedCount,
      failedCount: job.failedCount,
      issuesCount: 0,
      postImportQueuedCount: 0,
    })
    const scopedAccount = account(
      [],
      [
        {
          assignmentId: 'assignment-write',
          scopeType: 'shop',
          scopeId: 'shop-1',
          resourceId: 'shop-1',
          roles: [],
          permissions: ['ORDERS:WRITE'],
        },
        {
          assignmentId: 'assignment-read',
          scopeType: 'shop',
          scopeId: 'shop-2',
          resourceId: 'shop-2',
          roles: [],
          permissions: ['ORDERS:READ'],
        },
      ],
    )
    const { client } = renderWorkbench('/portal/integrations', scopedAccount)
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    fireEvent.click(await screen.findByRole('button', { name: 'Upload report' }))
    const uploadShopSelect = document.querySelector('#shopId')!
    fireEvent.mouseDown(uploadShopSelect)
    const writableOptions = await screen.findAllByText('LNG Amazon US')
    expect(writableOptions.some((element) => element.closest('.ant-select-item-option'))).toBe(true)
    fireEvent.click(writableOptions.find((element) => element.closest('.ant-select-item-option'))!)
    expect(
      screen
        .queryAllByText('Read-only shop')
        .some((element) => element.closest('.ant-select-item-option')),
    ).toBe(false)
    const file = new File(['order-id,order-item-id\n1,2'], 'orders.csv', { type: 'text/csv' })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    await waitFor(() => expect(uploadManualExcel).toHaveBeenCalled())
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['portal', 'integrations', 'jobs'] }),
    )
  })

  it('creates an Amazon extension token from the integrations setup panel', async () => {
    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))

    fireEvent.click(await screen.findByRole('tab', { name: 'Amazon Extension' }))
    expect(await screen.findByText('Amazon Extension setup')).toBeVisible()
    expect(screen.queryByText('API Base URL')).not.toBeInTheDocument()
    expect(screen.queryByText('Shop ID')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Shop' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Create token' }))

    await waitFor(() =>
      expect(createExtensionToken).toHaveBeenCalledWith({
        name: 'Amazon Extension',
        shopId: 'shop-1',
        environment: 'development',
        expiresAt: null,
      }),
    )
    expect(await screen.findByText('lng_ext_test_token')).toBeVisible()
  })

  it('clears the created token when the setup shop changes', async () => {
    const shopB = { ...shop, id: 'shop-2', name: 'LNG Amazon CA' }
    vi.mocked(listShops).mockResolvedValue({
      items: [shop, shopB],
      pagination: { total: 2, page: 1, limit: 100 },
    })

    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))
    fireEvent.click(await screen.findByRole('tab', { name: 'Amazon Extension' }))
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Shop' }).parentElement).toHaveTextContent(
        'LNG Amazon US',
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create token' }))
    expect(await screen.findByText('lng_ext_test_token')).toBeVisible()

    fireEvent.mouseDown(document.querySelector('#shopId')!)
    const options = await screen.findAllByText('LNG Amazon CA')
    fireEvent.click(options.find((element) => element.closest('.ant-select-item-option'))!)

    expect(screen.queryByText('lng_ext_test_token')).not.toBeInTheDocument()
  })

  it('groups a connection test under the extension More action', async () => {
    vi.mocked(listExtensionManagementAgents).mockResolvedValue({
      items: [
        {
          id: 'agent-1',
          shopId: shop.id,
          clientId: 'rdc-1',
          label: 'RDC 1',
          version: '0.3.0',
          lastSeenAt: '2026-08-22T00:00:00.000Z',
          apiBaseUrl: 'https://dev-api.lngmerch.co',
          status: 'ONLINE',
          token: null,
        },
      ],
    })
    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))
    fireEvent.click(await screen.findByRole('tab', { name: 'Amazon Extension' }))
    expect(await screen.findByText('RDC 1')).toBeVisible()
    expect(screen.getByRole('button', { name: 'More extension actions' })).toBeVisible()
  })

  it('keeps Ads configuration out of the primary table actions', async () => {
    vi.mocked(listExtensionManagementAgents).mockResolvedValue({
      items: [
        {
          id: 'agent-1',
          shopId: shop.id,
          clientId: 'rdc-1',
          label: 'RDC 1',
          version: '0.3.0',
          apiBaseUrl: 'https://dev-api.lngmerch.co',
          lastSeenAt: '2026-08-22T00:00:00.000Z',
          status: 'ONLINE',
          token: null,
        },
      ],
    })

    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE', 'FINANCE:WRITE']))
    fireEvent.click(await screen.findByRole('tab', { name: 'Amazon Extension' }))

    expect(screen.queryByText('Ads period')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'More extension actions' })).toBeVisible()
  })

  it('puts order schedule configuration in the Automation tab', async () => {
    vi.mocked(listExtensionManagementAgents).mockResolvedValue({
      items: [
        {
          id: 'agent-1',
          shopId: shop.id,
          clientId: 'rdc-1',
          label: 'RDC 1',
          version: '0.3.0',
          apiBaseUrl: 'https://dev-api.lngmerch.co',
          lastSeenAt: '2026-08-22T00:00:00.000Z',
          status: 'ONLINE',
          token: null,
        },
      ],
    })

    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))
    expect(await screen.findByRole('tab', { name: 'Automation' })).toBeVisible()
  })

  it('shows Reconnected only for an online extension that reconnected recently', async () => {
    vi.mocked(listExtensionManagementAgents).mockResolvedValue({
      items: [
        {
          id: 'agent-1',
          shopId: shop.id,
          clientId: 'rdc-1',
          label: 'RDC 1',
          version: '0.3.0',
          apiBaseUrl: 'https://dev-api.lngmerch.co',
          lastSeenAt: '2026-08-22T00:00:00.000Z',
          lastReconnectedAt: new Date().toISOString(),
          status: 'ONLINE',
          token: null,
        },
      ],
    })

    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))
    fireEvent.click(await screen.findByRole('tab', { name: 'Amazon Extension' }))

    expect(await screen.findByText('Reconnected')).toBeVisible()
  })

  it('does not show Reconnected for an offline extension', async () => {
    vi.mocked(listExtensionManagementAgents).mockResolvedValue({
      items: [
        {
          id: 'agent-1',
          shopId: shop.id,
          clientId: 'rdc-1',
          label: 'RDC 1',
          version: '0.3.0',
          apiBaseUrl: 'https://dev-api.lngmerch.co',
          lastSeenAt: '2026-08-22T00:00:00.000Z',
          lastReconnectedAt: new Date().toISOString(),
          status: 'OFFLINE',
          token: null,
        },
      ],
    })

    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))
    fireEvent.click(await screen.findByRole('tab', { name: 'Amazon Extension' }))

    await screen.findByText('RDC 1')
    expect(screen.queryByText('Reconnected')).not.toBeInTheDocument()
  })

  it('does not show Reconnected after the recent-connection window expires', async () => {
    vi.mocked(listExtensionManagementAgents).mockResolvedValue({
      items: [
        {
          id: 'agent-1',
          shopId: shop.id,
          clientId: 'rdc-1',
          label: 'RDC 1',
          version: '0.3.0',
          apiBaseUrl: 'https://dev-api.lngmerch.co',
          lastSeenAt: new Date().toISOString(),
          lastReconnectedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
          status: 'ONLINE',
          token: null,
        },
      ],
    })

    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))
    fireEvent.click(await screen.findByRole('tab', { name: 'Amazon Extension' }))

    await screen.findByText('RDC 1')
    expect(screen.queryByText('Reconnected')).not.toBeInTheDocument()
  })

  it('exposes the failure detail through the extension command drawer', async () => {
    vi.mocked(listExtensionCommands).mockResolvedValue({
      items: [
        {
          id: 'command-1',
          type: 'IMPORT_ADS_SPEND',
          status: 'FAILED',
          shopId: shop.id,
          agentId: 'agent-1',
          importJobId: null,
          attemptCount: 1,
          errorMessage: 'Amazon Ads session expired',
          createdAt: '2026-08-22T00:00:00.000Z',
          completedAt: '2026-08-22T00:01:00.000Z',
        },
      ],
      pagination: { total: 1, page: 1, limit: 10 },
    })

    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))
    fireEvent.click(await screen.findByRole('tab', { name: 'Amazon Extension' }))

    expect(screen.queryByRole('button', { name: 'View command error' })).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'View task details' }))
    expect(await screen.findByText('Amazon Ads session expired')).toBeVisible()
  })

  it('shows a task timeline for an extension command', async () => {
    vi.mocked(listExtensionCommands).mockResolvedValue({
      items: [
        {
          id: 'command-1',
          type: 'IMPORT_ADS_SPEND',
          status: 'FAILED',
          shopId: shop.id,
          agentId: 'agent-1',
          importJobId: null,
          attemptCount: 1,
          errorMessage: 'Amazon Ads session expired',
          createdAt: '2026-08-22T00:00:00.000Z',
          claimedAt: '2026-08-22T00:00:30.000Z',
          startedAt: '2026-08-22T00:00:31.000Z',
          completedAt: '2026-08-22T00:01:00.000Z',
        },
      ],
      pagination: { total: 1, page: 1, limit: 10 },
    })

    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))
    fireEvent.click(await screen.findByRole('tab', { name: 'Amazon Extension' }))
    fireEvent.click(await screen.findByRole('button', { name: 'View task details' }))

    expect(await screen.findByText('Task details')).toBeVisible()
    expect(screen.getByText('Claimed')).toBeVisible()
    expect(screen.getByText('Amazon Ads session expired')).toBeVisible()
  })

  it('shows extension cards across every accessible shop', async () => {
    vi.mocked(listExtensionManagementAgents).mockResolvedValue({
      items: [
        {
          id: 'agent-shop-1',
          shopId: shop.id,
          clientId: 'ext-shop-1',
          label: 'Shop one Chrome',
          version: '0.3.0',
          apiBaseUrl: 'https://dev-api.lngmerch.co',
          lastSeenAt: '2026-08-22T09:43:13.000Z',
          status: 'ONLINE',
          token: null,
        },
        {
          id: 'agent-shop-2',
          shopId: 'shop-2',
          clientId: 'ext-shop-2',
          label: 'Shop two Chrome',
          version: '0.3.0',
          apiBaseUrl: 'https://dev-api.lngmerch.co',
          lastSeenAt: '2026-08-22T09:43:13.000Z',
          status: 'ONLINE',
          token: null,
        },
      ],
    })

    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))
    fireEvent.click(await screen.findByRole('tab', { name: 'Amazon Extension' }))

    expect(await screen.findByText('Shop one Chrome')).toBeVisible()
    expect(screen.getByText('Shop two Chrome')).toBeVisible()
  })

  it('groups finance import histories under the Finance data tab', async () => {
    renderWorkbench('/portal/integrations', account(['FINANCE:READ']))

    fireEvent.click(await screen.findByRole('tab', { name: 'Finance data' }))

    expect(await screen.findByRole('tab', { name: 'Ads' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Ads mapping' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Transactions' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Settlements' })).toBeVisible()
  })

  it('shows pending Ads rows in the mapping tab', async () => {
    vi.mocked(listAdsUnassignedRows).mockResolvedValue({
      items: [
        {
          id: 'row-1',
          reportDate: '2026-08-25T00:00:00.000Z',
          advertiserAccountId: 'account-1',
          campaignId: 'campaign-1',
          campaignName: 'Campaign 1',
          portfolioId: null,
          portfolioName: null,
          salesChannelCode: 'AMAZON',
          marketplaceCode: 'US',
          status: 'PENDING',
        },
      ],
      pagination: { total: 1, page: 1, limit: 100 },
    })
    renderWorkbench('/portal/integrations', account(['FINANCE:READ', 'FINANCE:WRITE']))

    fireEvent.click(await screen.findByRole('tab', { name: 'Finance data' }))
    fireEvent.click(await screen.findByRole('tab', { name: 'Ads mapping' }))

    expect(await screen.findByText('Campaign 1')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Map shop' })).toBeEnabled()
  })

  it('lists pending Ads rows in the Ads mapping tab', async () => {
    vi.mocked(listAdsUnassignedRows).mockResolvedValue({
      items: [
        {
          id: 'unassigned-1',
          reportDate: '2026-08-25',
          advertiserAccountId: 'amzn1.ads-account.example',
          campaignId: 'campaign-123',
          campaignName: 'J2605 Campaign',
          portfolioId: null,
          portfolioName: null,
          salesChannelCode: 'AMAZON',
          marketplaceCode: 'US',
          status: 'PENDING',
        },
      ],
      pagination: { total: 1, page: 1, limit: 100 },
    })
    renderWorkbench('/portal/integrations', account(['FINANCE:READ']))

    fireEvent.click(await screen.findByRole('tab', { name: 'Finance data' }))
    fireEvent.click(await screen.findByRole('tab', { name: 'Ads mapping' }))

    expect(await screen.findByText('J2605 Campaign')).toBeVisible()
    await waitFor(() =>
      expect(listAdsUnassignedRows).toHaveBeenCalledWith({
        status: 'PENDING',
        page: 1,
        limit: 100,
      }),
    )
  })

  it('shows Amazon Ads import history for finance readers', async () => {
    renderWorkbench('/portal/integrations', account(['FINANCE:READ']))

    fireEvent.click(await screen.findByRole('tab', { name: 'Finance data' }))
    fireEvent.click(await screen.findByRole('tab', { name: 'Ads' }))
    expect(await screen.findByText('Amazon Ads imports')).toBeVisible()
    await waitFor(() =>
      expect(listImportBatches).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sourceType: 'ADS',
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'US',
        shopId: undefined,
        status: undefined,
      }),
    )
    expect(await screen.findByText('ads-spend-2026-08-12.csv')).toBeVisible()
    expect(screen.getByText('5 processed / 5 valid')).toBeVisible()
  })

  it('shows Amazon Transactions import history for finance readers', async () => {
    renderWorkbench('/portal/integrations', account(['FINANCE:READ']))

    fireEvent.click(await screen.findByRole('tab', { name: 'Finance data' }))
    fireEvent.click(await screen.findByRole('tab', { name: 'Transactions' }))
    expect(await screen.findByText('Amazon Transactions imports')).toBeVisible()
    await waitFor(() =>
      expect(listImportBatches).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'TRANSACTIONS',
          salesChannelCode: 'AMAZON',
        }),
      ),
    )
  })

  it('shows Amazon Settlements import history for finance readers', async () => {
    renderWorkbench('/portal/integrations', account(['FINANCE:READ']))

    fireEvent.click(await screen.findByRole('tab', { name: 'Finance data' }))
    fireEvent.click(await screen.findByRole('tab', { name: 'Settlements' }))
    expect(await screen.findByText('Amazon Settlements imports')).toBeVisible()
    await waitFor(() =>
      expect(listImportBatches).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'SETTLEMENTS',
          salesChannelCode: 'AMAZON',
        }),
      ),
    )
  })

  it('hides Amazon Ads import history without finance read access', async () => {
    renderWorkbench('/portal/integrations', account(['ORDERS:READ']))

    fireEvent.click(await screen.findByRole('tab', { name: 'Finance data' }))
    fireEvent.click(await screen.findByRole('tab', { name: 'Ads' }))
    expect(await screen.findByText('Amazon Ads imports')).toBeVisible()
    expect(
      screen.getByText('Finance read permission is required to view Ads import history.'),
    ).toBeVisible()
    expect(listImportBatches).not.toHaveBeenCalled()
  })
})

describe('ImportUploadModal', () => {
  afterEach(cleanup)

  it('submits the original file and source-specific format', async () => {
    const onSubmit = vi.fn()
    render(<ImportUploadModal open shops={[shop]} onClose={vi.fn()} onSubmit={onSubmit} />)

    fireEvent.mouseDown(screen.getByLabelText('Import format'))
    fireEvent.click(await screen.findByText('Etsy sold order items'))
    const file = new File(['Order ID,Transaction ID'], 'etsy-orders.csv', { type: 'text/csv' })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        source: 'ETSY_SOLD_ORDER_ITEMS',
        file,
        shopId: 'shop-1',
        marketplaceCode: 'US',
      }),
    )
  })

  it('rejects files larger than the server 10 MB limit', async () => {
    const onSubmit = vi.fn()
    render(<ImportUploadModal open shops={[shop]} onClose={vi.fn()} onSubmit={onSubmit} />)
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'orders.csv', {
      type: 'text/csv',
    })

    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByText('File must be 10 MB or smaller')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects Excel workbooks that the delimited backend parser cannot read', async () => {
    const onSubmit = vi.fn()
    render(<ImportUploadModal open shops={[shop]} onClose={vi.fn()} onSubmit={onSubmit} />)
    const file = new File(['not-a-workbook'], 'orders.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByText('Select a supported report file')).toBeInTheDocument()
    expect(screen.getByText('CSV, TSV, or TXT up to 10 MB')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the modal values when an upload fails', async () => {
    vi.mocked(uploadManualExcel).mockRejectedValue(new Error('Invalid report'))
    vi.mocked(uploadEtsySoldItems).mockRejectedValue(new Error('Invalid report'))
    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))

    fireEvent.click(await screen.findByRole('button', { name: 'Upload report' }))
    const file = new File(['order-id,order-item-id\n1,2'], 'orders.csv', { type: 'text/csv' })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    await waitFor(() => expect(uploadManualExcel).toHaveBeenCalled())
    expect(await screen.findByText('Invalid report')).toBeInTheDocument()
    expect(screen.getByText('US')).toBeInTheDocument()
    expect(screen.getByText('orders.csv')).toBeInTheDocument()
  })
})
