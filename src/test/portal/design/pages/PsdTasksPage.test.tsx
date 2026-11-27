import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let useRealTable = false
vi.mock('@/app/common/CoreDataTable', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/common/CoreDataTable')>()
  const mock = await import('@/test/mocks/CoreDataTable')
  return {
    CoreDataTable: (props: Parameters<typeof actual.CoreDataTable>[0]) =>
      useRealTable ? (
        <actual.CoreDataTable {...props} />
      ) : (
        <mock.CoreDataTable {...(props as Parameters<typeof mock.CoreDataTable>[0])} />
      ),
  }
})

import { AppProviders } from '@/app/providers/AppProviders'
import { PsdTasksPage } from '@/features/portal/design/pages/PsdTasksPage'
import { downloadMediaAsset } from '@/shared/media'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/shared/media', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/media')>()),
  downloadMediaAsset: vi.fn().mockResolvedValue(undefined),
}))

let mockSearchParams = new URLSearchParams('')
let mockPermissions = ['DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW']
let mockScaleFileSummary:
  { totalFileCount: number; scaledFileCount: number; pendingFileCount: number } | undefined
let mockTaskStatus = 'REQUESTED'
let mockAssignedDesignerId: string | null = null
const currentAccountId = '6a339b5a033e2ff7753522c3'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useSearchParams: () => [mockSearchParams, vi.fn()],
  useParams: () => ({}),
  useRouteLoaderData: () => ({
    account: { id: currentAccountId },
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
    listDesignTasks: vi.fn().mockImplementation(async () => ({
      items: [
        {
          id: 'psd-1',
          scaleFileSummary: mockScaleFileSummary,
          taskType: 'PSD_TEMPLATE',
          status: mockTaskStatus,
          assignedDesignerId:
            mockAssignedDesignerId ??
            (['ASSIGNED', 'IN_PROGRESS', 'REJECTED'].includes(mockTaskStatus)
              ? currentAccountId
              : null),
          priority: 'HIGH',
          listing: {
            sku: 'SKU-TEST-001',
            asin: 'B001TESTASIN',
            salesChannelCode: 'AMAZON',
            seller: { name: 'Nguyen Duc Son', employeeCode: 'J2504' },
          },
          createdAt: '2026-09-18T10:00:00.000Z',
          updatedAt: '2026-09-18T10:00:00.000Z',
          latestSubmission:
            mockTaskStatus === 'APPROVED'
              ? {
                  approvedAssetId: 'approved-asset',
                  assets: [
                    { id: 'draft-asset', downloadUrl: '/draft', originalFilename: 'draft.psd' },
                    {
                      id: 'approved-asset',
                      downloadUrl: '/approved',
                      originalFilename: 'approved.psd',
                    },
                  ],
                }
              : null,
        },
      ],
      pagination: { total: 1, page: 1, limit: 10 },
    })),
    getDesignSummary: vi.fn().mockResolvedValue({
      total: 1,
      unassigned: 1,
      active: 1,
      byStatus: { REQUESTED: 1 },
      byTaskType: { PSD_TEMPLATE: 1 },
    }),
    listDesignAssignees: vi
      .fn()
      .mockResolvedValue([{ id: 'new-designer', fullName: 'New Designer' }]),
    assignDesignTask: vi.fn().mockResolvedValue({}),
    startDesignTask: vi.fn(),
    approveDesignTask: vi.fn(),
    rejectDesignTask: vi.fn(),
    reopenDesignTask: vi.fn(),
    submitDesignTask: vi.fn(),
    uploadDesignAsset: vi.fn(),
    deleteDesignTask: vi.fn(),
    updateDesignTask: vi.fn(),
    updateDesignTaskPriority: vi.fn(),
  }
})

describe('PsdTasksPage', () => {
  it('shows ASIN scale totals in task rows with a breakdown on hover', async () => {
    useRealTable = true
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )
    expect(await screen.findByText('14')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Total scale files' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Group by ASIN' })).not.toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByText('14'))
    const tooltip = await screen.findByRole('tooltip')
    expect(within(tooltip).getByText('Scaled files: 9')).toBeInTheDocument()
    expect(within(tooltip).getByText('Pending files: 5')).toBeInTheDocument()
  })
  it('shows a dash instead of zero when scale totals are unavailable', async () => {
    useRealTable = true
    mockScaleFileSummary = undefined
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )
    await screen.findByText('B001TESTASIN')
    const header = screen.getByRole('columnheader', { name: 'Total scale files' })
    const index = Array.from(header.parentElement!.children).indexOf(header)
    const row = screen.getByText('B001TESTASIN').closest('tr')!
    expect(row.children[index]).toHaveTextContent('-')
    expect(row.children[index]).not.toHaveTextContent('0')
  })
  it('does not show ASIN scale totals on Etsy', () => {
    useRealTable = true
    mockSearchParams = new URLSearchParams('salesChannelCode=etsy')
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )
    expect(
      screen.queryByRole('columnheader', { name: 'Total scale files' }),
    ).not.toBeInTheDocument()
  })

  it('Seller downloads the approved PSD and does not get QC controls', async () => {
    mockTaskStatus = 'APPROVED'
    mockPermissions = ['DESIGN:READ', 'DESIGN:PSD_REQUEST']
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )
    await screen.findByText('B001TESTASIN')
    fireEvent.click(screen.getByRole('button', { name: /download/i }))
    expect(downloadMediaAsset).toHaveBeenCalledWith('/approved', 'approved.psd')
    expect(screen.queryByRole('button', { name: /check-circle/i })).not.toBeInTheDocument()
  })
  beforeEach(() => {
    useRealTable = false
    mockScaleFileSummary = { totalFileCount: 14, scaledFileCount: 9, pendingFileCount: 5 }
    vi.clearAllMocks()
    queryClient.clear()
    mockSearchParams = new URLSearchParams('')
    mockTaskStatus = 'REQUESTED'
    mockAssignedDesignerId = null
    mockPermissions = ['DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW']
  })

  it('keeps a single tab row and filters Unassigned without changing other counts', async () => {
    const { listDesignTasks, getDesignSummary } =
      await import('@/features/portal/design/api/designApi')
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )
    await screen.findByText('B001TESTASIN')
    expect(screen.queryByText('My tasks')).not.toBeInTheDocument()
    expect(screen.queryByText('All tasks')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Unassigned/ }))
    await waitFor(() =>
      expect(listDesignTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({ unassigned: true, page: 1, sortBy: 'urgency' }),
        expect.anything(),
      ),
    )
    expect(getDesignSummary).not.toHaveBeenCalledWith(expect.objectContaining({ unassigned: true }))
    fireEvent.click(screen.getByRole('tab', { name: /^All/ }))
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true')
    expect(listDesignTasks).toHaveBeenCalledWith(
      expect.objectContaining({ unassigned: undefined }),
      expect.anything(),
    )
  })

  it('lets a manager change the recipient before the assigned task is claimed', async () => {
    mockTaskStatus = 'ASSIGNED'
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )
    await screen.findByText('B001TESTASIN')
    fireEvent.click(screen.getByRole('button', { name: 'Reassign designer' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Reassign designer')
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('button', { name: 'Confirm' })).toBeDisabled()
    fireEvent.mouseDown(dialog.getByRole('combobox'))
    fireEvent.click(await screen.findByText('New Designer'))
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm' }))
    const { assignDesignTask } = await import('@/features/portal/design/api/designApi')
    await waitFor(() => expect(assignDesignTask).toHaveBeenCalledWith('psd-1', 'new-designer'))
  })

  it('does not offer reassignment after work starts', async () => {
    mockTaskStatus = 'IN_PROGRESS'
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )
    await screen.findByText('B001TESTASIN')
    expect(screen.queryByRole('button', { name: 'Reassign designer' })).not.toBeInTheDocument()
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
    expect(screen.getAllByText('Shop').length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText(/Search.*Etsy Listing ID/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('ASIN Type')).not.toBeInTheDocument()
  })

  it('links the ASIN to the Amazon product page', async () => {
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )

    const asinLink = await screen.findByRole('link', { name: 'Open B001TESTASIN' })
    expect(asinLink).toHaveAttribute('href', 'https://www.amazon.com/dp/B001TESTASIN')
    expect(asinLink).toHaveAttribute('target', '_blank')
  })

  it('lets a designer replace or remove the selected PSD before submitting', async () => {
    mockTaskStatus = 'IN_PROGRESS'
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )

    await screen.findByText('B001TESTASIN')
    fireEvent.click(screen.getByLabelText('PSD file'))
    const dialog = screen.getByRole('dialog')
    const input = dialog.querySelector('input[type="file"]')
    expect(input).not.toBeNull()
    fireEvent.change(input!, {
      target: { files: [new File(['psd'], 'finished.psd', { type: 'image/vnd.adobe.photoshop' })] },
    })

    expect(await within(dialog).findByText('Replace finished.psd')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByLabelText('delete'))
    await waitFor(() =>
      expect(within(dialog).queryByText('Replace finished.psd')).not.toBeInTheDocument(),
    )
  })

  it('hides PSD upload from designers who are not assigned to the task', async () => {
    mockTaskStatus = 'IN_PROGRESS'
    mockAssignedDesignerId = 'another-designer'

    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )

    await screen.findByText('B001TESTASIN')
    expect(screen.queryByLabelText('PSD file')).not.toBeInTheDocument()
  })

  it('lets a reviewer reopen a QC-passed task with a revision reason', async () => {
    mockTaskStatus = 'APPROVED'
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )

    await screen.findByText('B001TESTASIN')
    fireEvent.click(screen.getByRole('button', { name: 'Reopen for revision' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'Customer changed wording' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reopen' }))
    const { reopenDesignTask } = await import('@/features/portal/design/api/designApi')
    await waitFor(() =>
      expect(reopenDesignTask).toHaveBeenCalledWith('psd-1', 'Customer changed wording'),
    )
  })

  it('deletes an unfinished task through the task delete endpoint', async () => {
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )

    await screen.findByText('B001TESTASIN')
    fireEvent.click(screen.getByLabelText('Delete task'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const { deleteDesignTask } = await import('@/features/portal/design/api/designApi')
    await waitFor(() => expect(deleteDesignTask).toHaveBeenCalledWith('psd-1'))
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
      expect.anything(),
    )
    expect(getDesignSummary).toHaveBeenCalledWith(
      expect.objectContaining({ salesChannelCode: 'AMAZON' }),
    )
  })

  it('renders seller using EmployeeIdentity with employee code in table', async () => {
    render(
      <AppProviders>
        <PsdTasksPage />
      </AppProviders>,
    )
    await screen.findByText('B001TESTASIN')
    expect(screen.getByText('J2504')).toBeInTheDocument()
    expect(screen.getByText('DS')).toBeInTheDocument()
  })
})
