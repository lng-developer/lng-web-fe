import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/common/CoreDataTable', async () => ({
  CoreDataTable: (await import('@/test/mocks/CoreDataTable')).CoreDataTable,
}))

import { AppProviders } from '@/app/providers/AppProviders'
import { IdeaTasksPage } from '@/features/portal/design/pages/IdeaTasksPage'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useSearchParams: () => [new URLSearchParams(''), vi.fn()],
  useParams: () => ({}),
  useRouteLoaderData: () => ({
    account: { id: '6a339b5a033e2ff7753522c3' },
    permissions: ['DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW'],
    roles: [],
    scopes: [],
  }),
}))

vi.mock('@/features/portal/design/api/designApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/portal/design/api/designApi')>()
  return {
    ...actual,
    listDesignTasks: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'idea-1',
          taskType: 'IDEA',
          status: 'REQUESTED',
          priority: 'NORMAL',
          title: 'New Idea T-Shirt',
          productType: 'T-Shirt',
          seller: { id: 'seller-1', fullName: 'Demo Seller' },
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
      byTaskType: { IDEA: 1 },
    }),
    listDesignAssignees: vi.fn().mockResolvedValue([]),
    createDesignTask: vi.fn(),
    updateDesignTask: vi.fn(),
    deleteDesignTask: vi.fn(),
    startDesignTask: vi.fn(),
    approveDesignTask: vi.fn(),
    rejectDesignTask: vi.fn(),
    submitDesignTask: vi.fn(),
    uploadDesignAsset: vi.fn(),
  }
})

describe('IdeaTasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders IdeaTasksPage with search, create button, and task table', async () => {
    render(
      <AppProviders>
        <IdeaTasksPage />
      </AppProviders>,
    )

    expect(await screen.findByText('New Idea T-Shirt')).toBeInTheDocument()
    expect(screen.getByText('Create Idea Task')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Search/)).toBeInTheDocument()
    expect(screen.getByText('Demo Seller')).toBeInTheDocument()
    expect(screen.getByText('T-Shirt')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Shop')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('ASIN Type')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Seller')).not.toBeInTheDocument()
  })
})
