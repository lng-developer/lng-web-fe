import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const routeState = vi.hoisted(() => ({ search: '', salesChannel: undefined as string | undefined }))

vi.mock('@/app/common/CoreDataTable', async () => ({
  CoreDataTable: (await import('@/test/mocks/CoreDataTable')).CoreDataTable,
}))

import { AppProviders } from '@/app/providers/AppProviders'
import {
  createDesignTask,
  getDesignSummary,
  getDesignTask,
  listDesignTasks,
  submitDesignTask,
  updateDesignTaskPriority,
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
  useSearchParams: () => [new URLSearchParams(routeState.search), vi.fn()],
  useParams: () => ({ salesChannel: routeState.salesChannel }),
  useRouteLoaderData: () => ({
    account: { id: '6a339b5a033e2ff7753522c3' },
    permissions: ['DESIGN:WRITE', 'DESIGN:WORK'],
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
  listDesignTasks: vi.fn(),
  getDesignTask: vi.fn(),
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
  getDesignSummary: vi.fn(),
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
  updateDesignTaskPriority: vi.fn().mockResolvedValue({ id: 'task-1', priority: 'URGENT' }),
}))

describe('DesignWorkbenchPage', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    routeState.search = ''
    routeState.salesChannel = undefined
    i18n.changeLanguage('en')
    vi.mocked(listDesignTasks).mockResolvedValue({
      items: [
        {
          id: 'task-1',
          status: 'OPEN',
          taskType: 'PSD_TEMPLATE',
          priority: 'HIGH',
          listing: {
            sku: 'SKU-1',
            title: 'Shirt',
            asin: 'B0TESTASIN1',
            salesChannelCode: 'AMAZON',
            productImageUrl: 'https://m.media-amazon.com/images/S/main-listing.png',
          },
          shop: { name: 'Shop' },
          assignedDesigner: null,
          updatedAt: '2026-08-01T00:00:00Z',
        },
      ],
      pagination: { total: 1 },
    } as never)
    vi.mocked(getDesignTask).mockResolvedValue({
      id: 'task-1',
      status: 'OPEN',
      taskType: 'PSD_TEMPLATE',
      expectedOutputs: [],
      latestSubmission: null,
    } as never)
    vi.mocked(getDesignSummary).mockResolvedValue({
      total: 1,
      active: 1,
      unassigned: 1,
      byStatus: {},
      byTaskType: {},
    })
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
    await screen.findByText('SKU-1')
    expect(await screen.findByText('High')).toBeVisible()
  }, 15_000)

  it('keeps the ASIN in the design task cell and saves priority from task detail', async () => {
    vi.mocked(getDesignTask).mockResolvedValue({
      id: 'task-1',
      status: 'OPEN',
      taskType: 'PSD_TEMPLATE',
      priority: 'HIGH',
      listing: { sku: 'SKU-1', asin: 'B0TESTASIN1', productTypeName: null },
      expectedOutputs: [],
      latestSubmission: null,
    } as never)

    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )

    const sku = await screen.findByText('SKU-1')
    expect(screen.queryByRole('columnheader', { name: 'ASIN' })).not.toBeInTheDocument()
    expect(within(sku.closest('td')!).getByText('B0TESTASIN1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View' }))
    const drawer = await screen.findByRole('dialog')
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Priority' }))
    fireEvent.click(await screen.findByText('Urgent'))
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save priority' }))

    await waitFor(() => expect(updateDesignTaskPriority).toHaveBeenCalledWith('task-1', 'URGENT'))
  }, 15_000)

  it('uses the listing product image when no media thumbnail exists', async () => {
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )

    expect(await screen.findByAltText('Preview')).toHaveAttribute(
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

  it('keeps the workbench actions beside the title in one toolbar', async () => {
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )

    const title = await screen.findByRole('heading', { name: 'Design tasks' })
    const toolbar = title.closest('[class*="_taskToolbar_"]')
    expect(toolbar).toContainElement(screen.getByRole('button', { name: /Export CSV/ }))
    expect(toolbar).toContainElement(screen.getByRole('button', { name: /Create design task/ }))
  }, 15_000)

  it('filters the Design Workbench from a task-type URL parameter', async () => {
    routeState.search = 'taskType=PNG_ASSET'
    render(
      <AppProviders>
        <DesignWorkbenchPage />
      </AppProviders>,
    )

    await waitFor(() =>
      expect(listDesignTasks).toHaveBeenCalledWith(
        expect.objectContaining({ taskType: 'PNG_ASSET' }),
      ),
    )
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

  it.each([
    ['amazon', 'AMAZON'],
    ['etsy', 'ETSY'],
  ])(
    'filters %s tasks from the channel route without an inline channel filter',
    async (route, channel) => {
      routeState.salesChannel = route
      render(
        <AppProviders>
          <DesignWorkbenchPage />
        </AppProviders>,
      )

      await waitFor(() =>
        expect(listDesignTasks).toHaveBeenCalledWith(
          expect.objectContaining({ salesChannelCode: channel }),
        ),
      )
      expect(screen.queryByText('Channel: All')).not.toBeInTheDocument()
    },
  )

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
          listing: {
            sku: 'SKU-1',
            title: 'Shirt',
            asin: 'B0TESTASIN1',
            salesChannelCode: 'AMAZON',
          },
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
    expect(await screen.findByText('SKU-1')).toBeInTheDocument()
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
