import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { createDesignTask, uploadDesignAsset } from '@/features/portal/design/api/designApi'
import { DesignWorkbenchPage } from '@/features/portal/design/pages/DesignWorkbenchPage'
import i18n from '@/shared/i18n/i18n'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => ({ permissions: ['DESIGN:WRITE'], scopes: [] }),
}))
vi.mock('@/features/portal/catalog/api/catalogApi', () => ({
  listListings: vi.fn().mockResolvedValue({ items: [], pagination: { total: 0 } }),
  getListingOptions: vi.fn().mockResolvedValue({ internalTemplates: [] }),
}))
vi.mock('@/features/portal/design/pages/CreateDesignTaskModal', () => ({
  CreateDesignTaskModal: ({
    open,
    onSubmit,
  }: {
    open: boolean
    onSubmit: (input: unknown) => void
  }) =>
    open ? (
      <button
        onClick={() =>
          onSubmit({
            listingId: 'listing-1',
            taskType: 'IDEA',
            priority: 'HIGH',
            brief: 'Create a concept',
            referenceFiles: [
              { originFileObj: new File(['reference'], 'reference.png', { type: 'image/png' }) },
            ],
          })
        }
      >
        Submit new task
      </button>
    ) : null,
}))
vi.mock('@/features/portal/design/api/designApi', () => ({
  listDesignTasks: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'task-1',
        status: 'OPEN',
        taskType: 'PSD_TEMPLATE',
        priority: 'HIGH',
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
  listDesignAssignees: vi
    .fn()
    .mockResolvedValue([{ id: '6a339b5a033e2ff7753522c3', fullName: 'Nguyen Van An' }]),
  assignDesignTask: vi.fn(),
  startDesignTask: vi.fn(),
  submitDesignTask: vi.fn(),
  approveDesignTask: vi.fn(),
  rejectDesignTask: vi.fn(),
  uploadDesignAsset: vi.fn().mockResolvedValue({ id: 'asset-1' }),
  getDesignSummary: vi
    .fn()
    .mockResolvedValue({ total: 1, active: 1, unassigned: 1, byStatus: {}, byTaskType: {} }),
  getDesignWorkload: vi.fn().mockResolvedValue({
    totals: { unassignedCount: 1, activeCount: 1 },
    byDesigner: [{ assignedDesignerId: '6a339b5a033e2ff7753522c3', totalActive: 2 }],
  }),
  listPsdCandidates: vi.fn().mockResolvedValue({ items: [], pagination: { total: 0 } }),
  createPsdTaskFromListing: vi.fn(),
  createDesignTask: vi.fn().mockResolvedValue({ id: 'task-2' }),
  bulkCreatePsdTasks: vi.fn(),
  listDesignSubmissions: vi.fn().mockResolvedValue([]),
  cancelDesignTask: vi.fn(),
}))

describe('DesignWorkbenchPage', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.changeLanguage('en')
  })
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

  it('opens the PSD candidate picker without opening task detail', async () => {
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )
    fireEvent.click((await screen.findByText('Create PSD tasks')).closest('button')!)
    expect(await screen.findByRole('dialog')).toHaveTextContent('Create PSD tasks')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  }, 15_000)

  it('shows designer names instead of database ids in workload', async () => {
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )
    expect(await screen.findByText(/Nguyen Van An/)).toHaveTextContent('2')
    expect(screen.queryByText(/6a339b5a033e2ff7753522c3/)).not.toBeInTheDocument()
  }, 15_000)

  it('renders task priority as a colored status tag', async () => {
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )
    expect((await screen.findByText('HIGH')).closest('.ant-tag')).not.toBeNull()
  }, 15_000)

  it('shows a separate action for creating one design task', async () => {
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )
    expect(await screen.findByText('Create design task')).toBeInTheDocument()
  }, 15_000)

  it('uploads references before creating a design task', async () => {
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )
    fireEvent.click(await screen.findByText('Create design task'))
    fireEvent.click(await screen.findByRole('button', { name: 'Submit new task' }))
    await waitFor(() => expect(uploadDesignAsset).toHaveBeenCalledTimes(1))
    expect(createDesignTask).toHaveBeenCalledWith({
      listingId: 'listing-1',
      taskType: 'IDEA',
      priority: 'HIGH',
      brief: 'Create a concept',
      referenceAssetIds: ['asset-1'],
    })
  }, 15_000)

  it('keeps the create modal open when a reference upload fails', async () => {
    vi.mocked(uploadDesignAsset).mockRejectedValueOnce(new Error('Upload failed'))
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )
    fireEvent.click(await screen.findByText('Create design task'))
    fireEvent.click(await screen.findByRole('button', { name: 'Submit new task' }))
    await waitFor(() => expect(uploadDesignAsset).toHaveBeenCalledTimes(1))
    expect(createDesignTask).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Submit new task' })).toBeInTheDocument()
  }, 15_000)
})
