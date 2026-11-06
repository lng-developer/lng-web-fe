import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

import { ExtensionLogsPage } from '@/features/portal/extensions/pages/ExtensionLogsPage'
import * as extensionApi from '@/features/portal/extensions/api/extensionApi'
import type {
  ExtensionCommand,
  ExtensionManagementAgent,
} from '@/features/portal/extensions/api/extensionApi'
import type { Shop } from '@/features/portal/shops/api/shopApi'

vi.mock('@/features/portal/extensions/api/extensionApi', () => ({
  listExtensionAgents: vi.fn(),
  listExtensionManagementAgents: vi.fn(),
  listExtensionCommands: vi.fn(),
  listExtensionOrderSchedules: vi.fn(),
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
      permissions: ['ORDERS:READ', 'ORDERS:WRITE', 'FINANCE:READ', 'FINANCE:WRITE'],
      scopes: [],
    }),
  }
})

describe('ExtensionLogsPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    vi.clearAllMocks()

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
      ],
    })

    vi.mocked(extensionApi.listExtensionCommands).mockResolvedValue({
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
      ],
      pagination: { total: 2, page: 1, limit: 50 },
    })

    vi.mocked(extensionApi.listExtensionOrderSchedules).mockResolvedValue({ items: [] })
    vi.mocked(extensionApi.listExtensionFinanceSchedules).mockResolvedValue({ items: [] })
  })

  it('renders command logs with multi-platform records', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExtensionLogsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Log Manager')).toBeInTheDocument()
    expect(await screen.findByText('SUCCEEDED')).toBeInTheDocument()
    expect(await screen.findByText('FAILED')).toBeInTheDocument()
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

    expect(await screen.findByText('SUCCEEDED')).toBeInTheDocument()
    expect(screen.getByText('FAILED')).toBeInTheDocument()

    // Filter to Etsy
    const etsyFilterBtn = screen.getByRole('radio', { name: 'Etsy' })
    fireEvent.click(etsyFilterBtn)

    expect(screen.getByText('FAILED')).toBeInTheDocument()
    expect(screen.queryByText('SUCCEEDED')).not.toBeInTheDocument()
  })
})
