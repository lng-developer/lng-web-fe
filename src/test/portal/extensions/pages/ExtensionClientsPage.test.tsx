import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

import { ExtensionClientsPage } from '@/features/portal/extensions/pages/ExtensionClientsPage'
import { ExtensionImagesPage } from '@/features/portal/extensions/pages/ExtensionImagesPage'
import { ExtensionMessagesPage } from '@/features/portal/extensions/pages/ExtensionMessagesPage'
import { ExtensionSchedulesPage } from '@/features/portal/extensions/pages/ExtensionSchedulesPage'
import { ExtensionTrackingPage } from '@/features/portal/extensions/pages/ExtensionTrackingPage'
import * as extensionApi from '@/features/portal/extensions/api/extensionApi'
import type {
  ExtensionAgent,
  ExtensionManagementAgent,
} from '@/features/portal/extensions/api/extensionApi'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import i18n from '@/shared/i18n/i18n'

const routePermissions = vi.hoisted(() => ({ current: [] as string[] }))

vi.mock('@/features/portal/integrations/listing-images/api/listingImageApi', () => ({
  listImageSchedules: vi.fn().mockResolvedValue({ items: [] }),
  listImageJobs: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
  saveImageSchedule: vi.fn(),
  createImageJob: vi.fn(),
  actOnImageJob: vi.fn(),
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
      permissions: routePermissions.current,
      scopes: [],
    }),
  }
})

describe('ExtensionClientsPage', () => {
  let queryClient: QueryClient

  beforeEach(async () => {
    await i18n.changeLanguage('en')
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    vi.clearAllMocks()
    routePermissions.current = ['ORDERS:READ', 'ORDERS:WRITE', 'FINANCE:READ', 'FINANCE:WRITE']

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
        {
          id: 'shop-offline',
          name: 'Disconnected Shop',
          salesChannelCode: 'AMAZON',
          status: 'ACTIVE',
        } as unknown as Shop,
      ],
      pagination: { total: 3, page: 1, limit: 100 },
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
          id: 'agent-stale',
          shopId: 'shop-etsy',
          clientId: 'client-etsy-stale',
          label: 'Stale Etsy Bot',
          status: 'OFFLINE',
          provider: 'ETSY',
        } as unknown as ExtensionManagementAgent,
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
        {
          id: 'agent-3',
          shopId: 'shop-offline',
          clientId: 'client-amz-offline',
          label: 'Disconnected Amazon Bot',
          status: 'OFFLINE',
          provider: 'AMAZON',
        } as unknown as ExtensionManagementAgent,
      ],
    })

    vi.mocked(extensionApi.listExtensionCommands).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 10 },
    })
    vi.mocked(extensionApi.listExtensionOrderSchedules).mockResolvedValue({ items: [] })
    vi.mocked(extensionApi.listExtensionTrackingSchedules).mockResolvedValue({ items: [] })
    vi.mocked(extensionApi.listExtensionFinanceSchedules).mockResolvedValue({ items: [] })
  })

  it('lists only online Amazon and Etsy clients while retaining the overall count', async () => {
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
    expect(screen.queryByText('Disconnected Amazon Bot')).not.toBeInTheDocument()
    expect(screen.getByText('Amazon US Store')).toBeInTheDocument()
    expect(screen.getByText('Etsy Gift Shop')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText('2 / 4')).toBeInTheDocument()

    const searchInput = screen.getByRole('textbox')
    fireEvent.change(searchInput, { target: { value: 'Disconnected' } })
    expect(screen.queryByText('Disconnected Amazon Bot')).not.toBeInTheDocument()
    expect(screen.queryByText('Amazon Bot 01')).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'Etsy Gift Shop' } })
    expect(screen.getByText('Etsy Bot 01')).toBeInTheDocument()
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

  it.each([
    ['Config Auto', ExtensionSchedulesPage],
    ['Tracking Center', ExtensionTrackingPage],
    ['Message Center', ExtensionMessagesPage],
  ] as const)('shows only shops with online workers in %s', async (_, Page) => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect((await screen.findAllByText('Etsy Gift Shop')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Etsy Bot 01').length).toBeGreaterThan(0)
    expect(screen.queryByText('Disconnected Shop')).not.toBeInTheDocument()
    expect(screen.queryByText('Stale Etsy Bot')).not.toBeInTheDocument()
  })

  it('loads only online Image Sync workers for an account with catalog read access', async () => {
    routePermissions.current = ['CATALOG:READ']
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExtensionImagesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/Amazon Bot 01/)).toBeVisible()
    expect(screen.queryByText(/Stale Etsy Bot|Disconnected Amazon Bot/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request image sync now' })).not.toBeInTheDocument()
  })

  it('shows the dispatch workflow and worker status in Vietnamese on Tracking Center', async () => {
    await i18n.changeLanguage('vi')
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExtensionTrackingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Trung tâm vận đơn' })).toBeVisible()
    expect(screen.getByText('1. Nhận mã vận đơn từ nhà cung cấp')).toBeVisible()
    expect(screen.getByText('2. Tự động đồng bộ mã vận đơn')).toBeVisible()
    expect(screen.getByText('3. Theo dõi và đối chiếu vận chuyển')).toBeVisible()
    expect(screen.getByText(/Tiện ích trên máy của cửa hàng tự lấy mã vận đơn/)).toBeVisible()
    expect(await screen.findAllByText('Trực tuyến')).toHaveLength(2)
    expect(screen.getAllByText('Xem trước danh sách vận đơn')).toHaveLength(2)
    expect(
      screen.queryByText(/Vendor Tracking Received|Extension Auto-Sync/),
    ).not.toBeInTheDocument()
  })
})
