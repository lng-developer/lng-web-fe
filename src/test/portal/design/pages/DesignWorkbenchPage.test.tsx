import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  createDesignTask,
  getDesignTask,
  listDesignTasks,
  submitDesignTask,
  uploadDesignAsset,
} from '@/features/portal/design/api/designApi'
import { DesignWorkbenchPage } from '@/features/portal/design/pages/DesignWorkbenchPage'
import i18n from '@/shared/i18n/i18n'
import { uploadMultipartAsset } from '@/shared/media'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/shared/media', () => ({
  AuthenticatedMediaImage: ({ alt }: { alt: string }) => <img alt={alt} />,
  downloadMediaAsset: vi.fn(),
  useAuthenticatedMediaUrl: (downloadUrl?: string) => ({ url: downloadUrl }),
  uploadMultipartAsset: vi.fn().mockResolvedValue({ id: 'package-asset', uploadStatus: 'READY' }),
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => ({
    account: { id: '6a339b5a033e2ff7753522c3' },
    permissions: ['DESIGN:WRITE'],
    roles: [],
    scopes: [],
  }),
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
        listing: {
          sku: 'SKU-1',
          title: 'Shirt',
          productImageUrl: 'https://m.media-amazon.com/images/S/main-listing.png',
        },
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
  bulkAssignDesignTasks: vi.fn().mockResolvedValue({ assigned: [], failed: [] }),
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
    queryClient.clear()
    i18n.changeLanguage('en')
  })
  it('shows Assign as the primary action for an open task', async () => {
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )
    const quickAction = await screen.findByRole('button', { name: 'Assign' }, { timeout: 5_000 })
    expect(quickAction).toHaveTextContent('')
    fireEvent.click(quickAction)
    expect(screen.getAllByRole('button', { name: 'Assign' })).toHaveLength(2)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByText('Select eligible designer')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Nguyen Van An/ })).toBeInTheDocument()
  }, 15_000)

  it('allows managers to select tasks for bulk designer assignment', async () => {
    const formatDate = vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('formatted date')
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )

    const rowCheckbox = await screen.findByRole('checkbox', { name: 'Select SKU-1' })
    const rendersBeforeSelection = formatDate.mock.calls.length
    fireEvent.click(rowCheckbox)
    expect(screen.getByRole('button', { name: 'Assign 1 task' })).toBeInTheDocument()
    expect(formatDate).toHaveBeenCalledTimes(rendersBeforeSelection)
    formatDate.mockRestore()
  }, 15_000)

  it('shows metric cards without the workload chart', async () => {
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )
    expect(await screen.findByText('SKU-1')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Nguyen Van An: 2/ })).not.toBeInTheDocument()
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

  it('uses the listing product image when no media thumbnail exists', async () => {
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )

    expect(await screen.findByRole('img', { name: 'Preview' })).toHaveAttribute(
      'src',
      'https://m.media-amazon.com/images/S/main-listing.png',
    )
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

  it('uploads a PSD package to Wasabi and preview separately before submission', async () => {
    vi.mocked(listDesignTasks).mockResolvedValue({
      items: [
        {
          id: 'task-1',
          status: 'IN_PROGRESS',
          taskType: 'PSD_TEMPLATE',
          priority: 'HIGH',
          listing: { sku: 'SKU-1', title: 'Shirt' },
          shop: { name: 'Shop' },
          assignedDesigner: {
            id: '6a339b5a033e2ff7753522c3',
            fullName: 'Nguyen Van An',
            avatarUrl: '/api/hr/employee-profiles/profile-1/avatar',
          },
          updatedAt: '2026-08-01T00:00:00Z',
        },
      ],
      pagination: { total: 1 },
    } as never)
    vi.mocked(getDesignTask).mockResolvedValue({
      id: 'task-1',
      status: 'IN_PROGRESS',
      taskType: 'PSD_TEMPLATE',
      expectedOutputs: [],
      latestSubmission: null,
    } as never)
    vi.mocked(uploadDesignAsset).mockResolvedValueOnce({ id: 'preview-asset' } as never)

    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Submit' }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(within(dialog).getByText('SKU-1')).toBeInTheDocument()
    expect(within(dialog).getByText('Nguyen Van An')).toBeInTheDocument()
    expect(within(dialog).getByRole('img', { name: 'Nguyen Van An' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('PSD or ZIP package'), {
      target: { files: [new File(['psd'], 'package.zip', { type: 'application/zip' })] },
    })
    fireEvent.change(screen.getByLabelText('Preview image'), {
      target: { files: [new File(['image'], 'preview.png', { type: 'image/png' })] },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Submit' }).at(-1)!)

    await waitFor(() => expect(uploadMultipartAsset).toHaveBeenCalled())
    expect(uploadDesignAsset).toHaveBeenCalledWith(expect.objectContaining({ name: 'preview.png' }))
    expect(submitDesignTask).toHaveBeenCalledWith(
      'task-1',
      ['package-asset', 'preview-asset'],
      undefined,
    )
  }, 15_000)
})
