import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/common/CoreDataTable', async () => ({
  CoreDataTable: (await import('@/test/mocks/CoreDataTable')).CoreDataTable,
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => ({
    id: 'acc-1',
    email: 'admin@lng.local',
    fullName: 'Admin',
    status: 'ACTIVE',
    permissions: ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:REVIEW'],
    scopes: [],
  }),
}))

vi.mock('@/features/portal/design/api/designApi', () => ({
  listDesignTasks: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'task-12345678',
        taskType: 'PSD_TEMPLATE',
        status: 'NEW',
        priority: 'HIGH',
        title: 'Design T-Shirt Graphic',
        brief: 'Graphic description',
        assignedDesigner: null,
        shop: { id: 'shop-1', name: 'US Apparel' },
        createdAt: '2026-03-20T10:00:00Z',
      },
      {
        id: 'task-87654321',
        taskType: 'IDEA',
        status: 'ASSIGNED',
        priority: 'NORMAL',
        title: 'Idea For Summer Collection',
        brief: 'Summer vibe',
        assignedDesigner: {
          id: 'designer-1',
          fullName: 'Alice Designer',
          avatarUrl: null,
        },
        shop: { id: 'shop-2', name: 'Global Prints' },
        createdAt: '2026-03-21T10:00:00Z',
      },
    ],
    total: 2,
    page: 1,
    limit: 20,
  }),
  getDesignSummary: vi.fn().mockResolvedValue({
    total: 20,
    requested: 5,
    open: 2,
    assigned: 3,
    inProgress: 4,
    submitted: 3,
    approved: 2,
    rejected: 1,
    cancelled: 0,
    unassigned: 7,
    active: 10,
    byStatus: [],
    byTaskType: [],
    byDesigner: [],
  }),
  getDesignWorkload: vi.fn().mockResolvedValue({
    total: 20,
    unassigned: 7,
    byStatus: [],
    byTaskType: [],
    byDesigner: [],
  }),
  listDesignAssignees: vi.fn().mockResolvedValue([
    {
      id: 'designer-1',
      fullName: 'Alice Designer',
      avatarUrl: null,
      activeTaskCount: 2,
    },
  ]),
  assignDesignTask: vi.fn().mockResolvedValue({}),
  bulkAssignDesignTasks: vi.fn().mockResolvedValue({}),
}))

import { DesignWorkspacePage } from '@/features/portal/design/pages/DesignWorkspacePage'
import i18n from '@/shared/i18n/i18n'
import { renderWithTestProviders } from '@/test/helpers/testProviders'

describe('DesignWorkspacePage', () => {
  afterEach(cleanup)
  beforeEach(async () => {
    window.localStorage.setItem('lng.language', 'en')
    await i18n.changeLanguage('en')
  })

  it('renders metric cards, filter controls, and task list', async () => {
    const view = renderWithTestProviders(<DesignWorkspacePage />)

    expect(await view.findByText('Design T-Shirt Graphic')).toBeVisible()
    expect(view.getByText('Alice Designer')).toBeVisible()
    expect(view.getByText('US Apparel')).toBeVisible()
    expect(view.getByText('Total tasks')).toBeVisible()
    expect(view.getAllByText('Unassigned').length).toBeGreaterThan(0)
  }, 15_000)
})
