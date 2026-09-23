import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/common/CoreDataTable', async () => ({
  CoreDataTable: (await import('@/test/mocks/CoreDataTable')).CoreDataTable,
}))

import { AppProviders } from '@/app/providers/AppProviders'
import { PngTasksPage } from '@/features/portal/design/pages/PngTasksPage'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useSearchParams: () => [new URLSearchParams(''), vi.fn()],
  useParams: () => ({}),
  useRouteLoaderData: () => ({
    account: { id: '6a339b5a033e2ff7753522c3' },
    permissions: ['PRODUCTION:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW'],
    roles: [],
    scopes: [],
  }),
}))

vi.mock('@/features/portal/shops/api/shopApi', () => ({
  listShops: vi.fn().mockResolvedValue({
    items: [{ id: 'shop-1', name: 'Evermood LLC', status: 'ACTIVE' }],
    pagination: { total: 1, page: 1, limit: 100 },
  }),
}))

vi.mock('@/features/portal/production/api/productionApi', () => ({
  listProductionTasks: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'prod-task-1',
        status: 'NEED_SCALE',
        orderItem: {
          externalOrderId: '112-9999999-0000001',
          salesChannelCode: 'AMAZON',
          asin: 'B0TESTASIN1',
          sku: 'SKU-SCALE-001',
        },
        shop: { id: 'shop-1', name: 'Evermood LLC' },
        readyAt: '2026-09-18T10:00:00.000Z',
        createdAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z',
      },
    ],
    total: 1,
    page: 1,
    limit: 10,
  }),
  summarizeProductionTasks: vi.fn().mockResolvedValue({
    total: 1,
    needScale: 1,
    qcPending: 0,
    readyToSendVendor: 0,
    sentToVendor: 0,
    qcRejected: 0,
  }),
  summarizeProductionQueueCounts: vi.fn().mockResolvedValue({
    scaleQueue: 1,
    qcQueue: 0,
    blocked: 0,
  }),
  listScaleAssignees: vi.fn().mockResolvedValue({ items: [] }),
  assignProductionTask: vi.fn(),
  claimProductionTask: vi.fn(),
  submitScaleForQc: vi.fn(),
  updateDesignNote: vi.fn(),
  uploadScaledOutput: vi.fn(),
}))

describe('PngTasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders PngTasksPage with PNG Tasks title, order listing, and filters', async () => {
    render(
      <AppProviders>
        <PngTasksPage />
      </AppProviders>,
    )

    expect(await screen.findByText('112-9999999-0000001')).toBeInTheDocument()
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Need Scale')).toBeInTheDocument()
    expect(screen.getAllByText('Shop').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ASIN Type').length).toBeGreaterThan(0)
  })
})
