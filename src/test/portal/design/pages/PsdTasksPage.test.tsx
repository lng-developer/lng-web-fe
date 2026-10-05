import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/common/CoreDataTable', async () => ({
  CoreDataTable: (await import('@/test/mocks/CoreDataTable')).CoreDataTable,
}))

import { AppProviders } from '@/app/providers/AppProviders'
import { PsdTasksPage } from '@/features/portal/design/pages/PsdTasksPage'

let mockSearchParams = new URLSearchParams('')
let mockPermissions = ['DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW']

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useSearchParams: () => [mockSearchParams, vi.fn()],
  useParams: () => ({}),
  useRouteLoaderData: () => ({
    account: { id: '6a339b5a033e2ff7753522c3' },
    permissions: mockPermissions,
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

vi.mock('@/features/portal/design/api/designApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/portal/design/api/designApi')>()
  return {
    ...actual,
    listDesignTasks: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'psd-1',
          taskType: 'PSD_TEMPLATE',
          status: 'REQUESTED',
          priority: 'HIGH',
          listing: {
            sku: 'SKU-TEST-001',
            asin: 'B001TESTASIN',
            salesChannelCode: 'AMAZON',
          },
          createdAt: '2026-09-18T10:00:00.000Z',
          updatedAt: '2026-09-18T10:00:00.000Z',
        },
      ],
      pagination: { total: 1, page: 1, limit: 10 },
    }),
    getDesignSummary: vi.fn().mockResolvedValue({
      total: 1,
      unassigned: 1,
      active: 1,
      byStatus: { REQUESTED: 1 },
      byTaskType: { PSD_TEMPLATE: 1 },
    }),
    listDesignAssignees: vi.fn().mockResolvedValue([]),
    startDesignTask: vi.fn(),
    approveDesignTask: vi.fn(),
    rejectDesignTask: vi.fn(),
    submitDesignTask: vi.fn(),
    uploadDesignAsset: vi.fn(),
    deleteDesignTask: vi.fn(),
    updateDesignTask: vi.fn(),
    updateDesignTaskPriority: vi.fn(),
  }
})

describe('PsdTasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams = new URLSearchParams('')
    mockPermissions = ['DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW']
  })

  it('keeps Design work controls hidden for requester-only Sales access', async () => {
    mockPermissions = ['DESIGN:PSD_REQUEST']

    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )

    expect(await screen.findByText('B001TESTASIN')).toBeInTheDocument()
    expect(screen.queryByLabelText('Assign designer')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('PSD file')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Priority')).toBeInTheDocument()
  })

  it('renders PsdTasksPage and displays listings and filters', async () => {
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )

    expect(await screen.findByText('B001TESTASIN')).toBeInTheDocument()
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getAllByText('Requested').length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText(/Search/)).toBeInTheDocument()
    expect(screen.getAllByText('Seller').length).toBeGreaterThan(0)
    expect(screen.queryByPlaceholderText('ASIN Type')).not.toBeInTheDocument()
  })

  it('filters by salesChannelCode when present in search params', async () => {
    mockSearchParams = new URLSearchParams('salesChannelCode=amazon')

    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )

    const { listDesignTasks, getDesignSummary } =
      await import('@/features/portal/design/api/designApi')
    expect(listDesignTasks).toHaveBeenCalledWith(
      expect.objectContaining({ salesChannelCode: 'AMAZON' }),
    )
    expect(getDesignSummary).toHaveBeenCalledWith(
      expect.objectContaining({ salesChannelCode: 'AMAZON' }),
    )
  })
})
