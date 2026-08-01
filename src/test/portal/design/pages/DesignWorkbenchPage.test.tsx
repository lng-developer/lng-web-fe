import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { DesignWorkbenchPage } from '@/features/portal/design/pages/DesignWorkbenchPage'
import i18n from '@/shared/i18n/i18n'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => ({ permissions: ['DESIGN:WRITE'], scopes: [] }),
}))
vi.mock('@/features/portal/design/api/designApi', () => ({
  listDesignTasks: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'task-1',
        status: 'OPEN',
        taskType: 'PSD_TEMPLATE',
        priority: 'NORMAL',
        listing: { sku: 'SKU-1', title: 'Shirt' },
        shop: { name: 'Shop' },
        assignedDesigner: null,
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ],
    pagination: { total: 1 },
  }),
  getDesignTask: vi.fn().mockResolvedValue({
    id: 'task-1',
    status: 'OPEN',
    taskType: 'PSD_TEMPLATE',
    expectedOutputs: [],
    latestSubmission: null,
  }),
  listDesignAssignees: vi.fn().mockResolvedValue([]),
  assignDesignTask: vi.fn(),
  startDesignTask: vi.fn(),
  submitDesignTask: vi.fn(),
  approveDesignTask: vi.fn(),
  rejectDesignTask: vi.fn(),
  uploadDesignAsset: vi.fn(),
}))

describe('DesignWorkbenchPage', () => {
  afterEach(cleanup)
  beforeEach(() => i18n.changeLanguage('en'))
  it('shows Assign as the primary action for an open task', async () => {
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )
    const quickAction = await screen.findByRole('button', { name: 'Assign' })
    expect(quickAction).toHaveTextContent('')
    fireEvent.click(quickAction)
    expect(screen.getAllByRole('button', { name: 'Assign' })).toHaveLength(2)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  }, 15_000)
})
