import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

import { ExtensionClientsPage } from '@/features/portal/extensions/pages/ExtensionClientsPage'
import * as extensionApi from '@/features/portal/extensions/api/extensionApi'
import type {
  ExtensionAgent,
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

describe('ExtensionClientsPage', () => {
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

    vi.mocked(extensionApi.listExtensionAgents).mockResolvedValue({
      items: [
        {
          id: 'agent-1',
          shopId: 'shop-amz',
          clientId: 'client-amz-01',
          label: 'Amazon Bot 01',
          status: 'ONLINE',
          provider: 'AMAZON',
        } as unknown as ExtensionAgent,
        {
          id: 'agent-2',
          shopId: 'shop-etsy',
          clientId: 'client-etsy-01',
          label: 'Etsy Bot 01',
          status: 'ONLINE',
          provider: 'ETSY',
        } as unknown as ExtensionAgent,
      ],
    })

    vi.mocked(extensionApi.listExtensionManagementAgents).mockResolvedValue({
      items: [
        {
          id: 'agent-1',
          shopId: 'shop-amz',
          clientId: 'client-amz-01',
          label: 'Amazon Bot 01',
          status: 'ONLINE',
          provider: 'AMAZON',
          version: '1.2.0',
          lastSeenAt: new Date().toISOString(),
          token: { id: 'tok-1' },
        } as unknown as ExtensionManagementAgent,
        {
          id: 'agent-2',
          shopId: 'shop-etsy',
          clientId: 'client-etsy-01',
          label: 'Etsy Bot 01',
          status: 'ONLINE',
          provider: 'ETSY',
          version: '1.2.0',
          lastSeenAt: new Date().toISOString(),
          token: { id: 'tok-2' },
        } as unknown as ExtensionManagementAgent,
      ],
    })

    vi.mocked(extensionApi.listExtensionCommands).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 10 },
    })
    vi.mocked(extensionApi.listExtensionOrderSchedules).mockResolvedValue({ items: [] })
    vi.mocked(extensionApi.listExtensionFinanceSchedules).mockResolvedValue({ items: [] })
  })

  it('renders extension clients workbench with Amazon and Etsy agents', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExtensionClientsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Manage Clients')).toBeInTheDocument()
    expect(await screen.findByText('Amazon Bot 01')).toBeInTheDocument()
    expect(await screen.findByText('Etsy Bot 01')).toBeInTheDocument()
    expect(screen.getByText('Amazon US Store')).toBeInTheDocument()
    expect(screen.getByText('Etsy Gift Shop')).toBeInTheDocument()
  })

  it('filters clients by platform (Etsy vs Amazon)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExtensionClientsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Amazon Bot 01')).toBeInTheDocument()
    expect(screen.getByText('Etsy Bot 01')).toBeInTheDocument()

    // Filter to Etsy
    const etsyFilterBtn = screen.getByRole('radio', { name: 'Etsy' })
    fireEvent.click(etsyFilterBtn)

    expect(screen.getByText('Etsy Bot 01')).toBeInTheDocument()
    expect(screen.queryByText('Amazon Bot 01')).not.toBeInTheDocument()

    // Filter to Amazon
    const amazonFilterBtn = screen.getByRole('radio', { name: 'Amazon' })
    fireEvent.click(amazonFilterBtn)

    expect(screen.getByText('Amazon Bot 01')).toBeInTheDocument()
    expect(screen.queryByText('Etsy Bot 01')).not.toBeInTheDocument()
  })

  it('opens token generation modal on button click', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExtensionClientsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const generateBtn = await screen.findByRole('button', { name: /generate token/i })
    fireEvent.click(generateBtn)

    expect(await screen.findByText('Generate Extension Bot Token')).toBeInTheDocument()
  })
})
