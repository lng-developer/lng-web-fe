import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  assignProductionTask,
  bulkAssignProductionTasks,
  bulkAssignCsTasks,
  listCsAssignees,
  listScaleAssignees,
  listProductionTasks,
  summarizeProductionQueueCounts,
  summarizeProductionTasks,
} from '@/features/portal/production/api/productionApi'
import { isForbiddenProductionError } from '@/features/portal/production/pages/productionAuthorization'
import { ProductionWorkbenchPage } from '@/features/portal/production/pages/ProductionWorkbenchPage'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => undefined,
}))

vi.mock('@/features/portal/production/api/productionApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/production/api/productionApi')>()),
  bulkAssignCsTasks: vi.fn(),
  assignProductionTask: vi.fn(),
  bulkAssignProductionTasks: vi.fn(),
  listCsAssignees: vi.fn(),
  listProductionTasks: vi.fn(),
  listScaleAssignees: vi.fn(),
  summarizeProductionQueueCounts: vi.fn(),
  summarizeProductionTasks: vi.fn(),
}))

const account: CurrentAccount = {
  account: {
    id: 'production-reader',
    email: 'production@lng.co',
    mustChangePassword: false,
  },
  roles: [],
  permissions: ['PRODUCTION:READ'],
  scopes: [],
  profileSetupRequired: false,
}

const scaleManagerAccount: CurrentAccount = {
  ...account,
  permissions: ['PRODUCTION:READ', 'PRODUCTION:WRITE'],
}

const scaleLeaderAccount: CurrentAccount = {
  ...account,
  permissions: ['PRODUCTION:READ', 'PRODUCTION:SCALE_ASSIGN'],
}

const blockedTask: Awaited<ReturnType<typeof listProductionTasks>>['items'][number] = {
  id: 'production-task-1',
  status: 'BLOCKED',
  qcStatus: 'NOT_READY',
  blockers: ['PSD_MISSING'],
  assignedDesignUserId: null,
  designNote: null,
  readyAt: null,
  updatedAt: '2026-08-27T00:00:00.000Z',
  orderItem: { externalOrderId: '113-2183249-0763446' },
  seller: {
    name: 'Nguyen Seller',
    employeeCode: 'J2523',
    avatarUrl: '/api/hr/employee-profiles/6ad097233d3775a03d8c4d13/avatar',
  },
  shop: undefined,
  qcPreviewFileChecks: undefined,
}

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="Current location">{location.pathname + location.search}</output>
}

function renderPage(initialEntry = '/portal/production', accountProp = account) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppProviders>
        <Routes>
          <Route
            path="/portal/production"
            element={<ProductionWorkbenchPage account={accountProp} />}
          />
          <Route
            path="/portal/production/:queue"
            element={<ProductionWorkbenchPage account={accountProp} />}
          />
        </Routes>
        <LocationProbe />
      </AppProviders>
    </MemoryRouter>,
  )
}

async function findBlockedQueueTab() {
  const matches = await screen.findAllByRole('button', { name: /Blocked/ })
  const tab = matches.find((button) => button.classList.contains('ant-btn'))
  if (!tab) throw new Error('Blocked queue tab is required')
  return tab
}

describe('ProductionWorkbenchPage', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    vi.clearAllMocks()
    queryClient.clear()
    await i18n.changeLanguage('en')
    vi.mocked(listProductionTasks).mockImplementation(async (params) => ({
      items: [],
      total: 120,
      page: params.page,
      limit: params.limit,
    }))
    vi.mocked(summarizeProductionTasks).mockResolvedValue({
      total: 120,
      blocked: 0,
      needScale: 0,
      qcPending: 0,
      ready: 0,
      scaleQueue: 0,
      qcQueue: 0,
    })
    vi.mocked(summarizeProductionQueueCounts).mockResolvedValue({
      blocked: 0,
      scaleQueue: 0,
      qcQueue: 0,
    })
    vi.mocked(listScaleAssignees).mockResolvedValue({ items: [] })
    vi.mocked(listCsAssignees).mockResolvedValue({
      items: [
        {
          id: 'cs-user-1',
          fullName: 'CS Staff 1',
          employeeCode: 'CS01',
        },
      ],
    })
    vi.mocked(bulkAssignCsTasks).mockResolvedValue({ assigned: [], failed: [] })
  })

  it.each([true, false])(
    'shows manual file upload only for the assigned Designer (assigned=%s)',
    async (assigned) => {
      const designer: CurrentAccount = {
        ...account,
        permissions: [],
        scopes: [
          {
            assignmentId: 'assignment',
            resourceId: null,
            scopeType: 'team',
            scopeId: 'team-design',
            roles: ['DESIGNER'],
            permissions: ['DESIGN:WORK', 'PRODUCTION:READ'],
          },
        ],
      }
      vi.mocked(listProductionTasks).mockResolvedValue({
        items: [
          {
            ...blockedTask,
            status: 'NEED_SCALE',
            blockers: [],
            assignedDesignUserId: assigned ? account.account.id : 'another-designer',
            fileChecks: [
              {
                id: 'psd-source',
                slotKey: 'PSD_TEMPLATE',
                slotLabel: null,
                required: true,
                sourceType: 'PSD_TEMPLATE',
                qcStatus: 'NOT_READY',
                inputAssetDownloadUrl: null,
                outputAssetDownloadUrl: null,
                outputStatus: 'MISSING',
                note: null,
              },
            ],
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      })
      renderPage('/portal/production/scale', designer)
      await screen.findByText('113-2183249-0763446')
      expect(screen.getByText('Nguyen Seller')).toBeInTheDocument()
      expect(screen.getByText('J2523')).toBeInTheDocument()
      await screen.findByText('Task context')
      expect(screen.getByText('No output files yet')).toBeInTheDocument()
      const label = String(i18n.t('portal.production.addManualSlot'))
      if (assigned) expect(await screen.findByText(label)).toBeInTheDocument()
      else expect(screen.queryByText(label)).not.toBeInTheDocument()
    },
  )

  it('refreshes a cached queue summary that predates the Unassigned count', async () => {
    queryClient.setQueryData(
      [
        'production',
        'queue-summary',
        {
          search: undefined,
          salesChannelCode: undefined,
          scaleDifficultyLevel: undefined,
          designType: undefined,
        },
      ],
      { total: 401 },
    )
    vi.mocked(summarizeProductionQueueCounts).mockResolvedValue({ total: 401, unassigned: 17 })
    renderPage('/portal/production/scale')
    await waitFor(() => expect(summarizeProductionQueueCounts).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Unassigned/ })).toHaveTextContent('17'),
    )
  })

  it('uses one tab row with Unassigned and preserves the other queue counts', async () => {
    renderPage('/portal/production/scale')
    await waitFor(() =>
      expect(listProductionTasks).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'urgency' }),
      ),
    )
    expect(screen.queryByRole('radio', { name: 'My tasks' })).not.toBeInTheDocument()
    expect(screen.queryByText('All tasks')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Unassigned/ }))
    await waitFor(() =>
      expect(listProductionTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({ unassigned: true, status: 'NEED_SCALE,QC_REJECTED', page: 1 }),
      ),
    )
    expect(summarizeProductionQueueCounts).not.toHaveBeenCalledWith(
      expect.objectContaining({ unassigned: true }),
    )
    fireEvent.click(screen.getByRole('button', { name: /Need scale/ }))
    await waitFor(() =>
      expect(listProductionTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({ unassigned: undefined, status: 'NEED_SCALE' }),
      ),
    )
  })

  it('stretches every table layer across the available width', async () => {
    renderPage()

    await waitFor(() => expect(listProductionTasks).toHaveBeenCalled())

    const tables = document.querySelectorAll<HTMLTableElement>('.ant-table-container table')
    expect(tables.length).toBeGreaterThan(0)
    tables.forEach((table) =>
      expect(table.style.width === '100%' || table.style.minWidth === '100%').toBe(true),
    )
  })

  it('applies scale difficulty to both task rows and summary', async () => {
    renderPage('/portal/production/scale')
    fireEvent.mouseDown(screen.getByText('All scale difficulty'))
    fireEvent.click(await screen.findByText('Hard'))
    await waitFor(() => {
      expect(listProductionTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({ scaleDifficultyLevel: 'HARD' }),
      )
      expect(summarizeProductionTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({ scaleDifficultyLevel: 'HARD' }),
      )
    })
  })

  it('uses one queue-summary request instead of three count-only task lists', async () => {
    renderPage()

    await waitFor(() => expect(summarizeProductionQueueCounts).toHaveBeenCalledTimes(1))
    expect(listProductionTasks).toHaveBeenCalledTimes(1)
    expect(summarizeProductionQueueCounts).toHaveBeenCalledWith(
      expect.objectContaining({
        search: undefined,
      }),
    )
  })

  it('loads scale assignees for a Scale Leader without production write access', async () => {
    renderPage('/portal/production/scale', scaleLeaderAccount)

    await waitFor(() => expect(listScaleAssignees).toHaveBeenCalledWith({ limit: 100 }))
  })

  it.each([1, 2])(
    'assigns %i selected Scale tasks to a Designer without changing CS assignment',
    async (count) => {
      const tasks = Array.from({ length: count }, (_, index) => ({
        ...blockedTask,
        id: `production-task-${index + 1}`,
        status: 'NEED_SCALE' as const,
        blockers: [],
        orderItem: { externalOrderId: `113-2183249-076344${index}` },
      }))
      vi.mocked(listProductionTasks).mockResolvedValue({
        items: tasks,
        total: count,
        page: 1,
        limit: 10,
      })
      vi.mocked(listScaleAssignees).mockResolvedValue({
        items: [{ id: 'designer-1', fullName: 'Design Employee', employeeCode: 'D01' }],
      })
      vi.mocked(assignProductionTask).mockResolvedValue({
        ...blockedTask,
        assignedDesignUserId: 'designer-1',
      })
      vi.mocked(bulkAssignProductionTasks).mockResolvedValue({ assigned: tasks, failed: [] })
      renderPage('/portal/production/scale', scaleManagerAccount)
      const picker = await screen.findByRole('combobox', { name: 'Select Scale assignee' })
      const assignButton = screen.getByRole('button', { name: 'Assign 0 tasks' })
      expect(assignButton).toBeDisabled()
      fireEvent.mouseDown(picker)
      fireEvent.click(await screen.findByText('Design Employee · D01'))
      await screen.findByText('113-2183249-0763440')
      fireEvent.click(screen.getAllByRole('checkbox')[0])
      fireEvent.click(screen.getByRole('button', { name: `Assign ${count} tasks` }))
      if (count === 1) {
        await waitFor(() =>
          expect(assignProductionTask).toHaveBeenCalledWith('production-task-1', 'designer-1'),
        )
      } else {
        await waitFor(() =>
          expect(bulkAssignProductionTasks).toHaveBeenCalledWith(
            tasks.map((task) => task.id),
            'designer-1',
          ),
        )
      }
      expect(bulkAssignCsTasks).not.toHaveBeenCalled()
    },
  )

  it('allows a team Scale assigner to select tasks from any shop', async () => {
    vi.mocked(listProductionTasks).mockResolvedValue({
      items: [{ ...blockedTask, status: 'NEED_SCALE', blockers: [], shopId: 'other-shop' }],
      total: 1,
      page: 1,
      limit: 10,
    })
    renderPage('/portal/production/scale', {
      ...account,
      scopes: [
        {
          assignmentId: 'assignment',
          resourceId: 'design-team',
          roles: ['DESIGN_LEADER'],
          scopeType: 'team',
          scopeId: 'design-team',
          permissions: ['PRODUCTION:SCALE_ASSIGN'],
        },
      ],
    })
    await screen.findByText('113-2183249-0763446', {}, { timeout: 5000 })
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(2)
      checkboxes.forEach((checkbox) => expect(checkbox).toBeEnabled())
    })
  })

  it('recognizes a backend forbidden response for stale-workbench recovery', () => {
    expect(isForbiddenProductionError({ response: { status: 403 } })).toBe(true)
    expect(isForbiddenProductionError(new Error('Forbidden'))).toBe(false)
  })

  it.each([
    { permissions: ['DESIGN:REVIEW'], workerId: 'other', canReview: false },
    { permissions: ['PRODUCTION:QC_REVIEW'], workerId: 'other', canReview: true },
    { permissions: ['PRODUCTION:QC_REVIEW'], workerId: 'production-reader', canReview: false },
  ])(
    'shows QC actions only for an independent reviewer: $permissions / $workerId',
    async ({ permissions, workerId, canReview }) => {
      vi.mocked(listProductionTasks).mockResolvedValue({
        items: [
          {
            ...blockedTask,
            status: 'QC_PENDING',
            qcStatus: 'PENDING',
            blockers: [],
            fileChecks: [
              {
                id: 'front',
                slotKey: 'FRONT',
                slotLabel: 'Front',
                required: true,
                inputAssetDownloadUrl: null,
                outputAssetDownloadUrl: 'https://assets.example.test/output.png',
                outputAssetId: 'output',
                outputWorkerId: workerId,
                outputStatus: 'UPLOADED',
                qcStatus: 'PENDING',
                note: null,
              },
            ],
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      })
      renderPage('/portal/production/qc', {
        ...account,
        scopes: [
          {
            assignmentId: 'design-leader',
            resourceId: 'design-team',
            roles: ['DESIGN_LEADER'],
            scopeType: 'team',
            scopeId: 'design-team',
            permissions,
          },
        ],
      })
      await screen.findByText('113-2183249-0763446')
      expect(Boolean(screen.queryByText('Pass slot')?.closest('button'))).toBe(canReview)
    },
  )

  it('does not render metric cards and shows dedicated queue filter tabs', async () => {
    renderPage()

    await waitFor(() => expect(summarizeProductionTasks).toHaveBeenCalled())

    expect(document.querySelector('[class*="metrics"]')).toBeNull()
    expect(await screen.findByRole('button', { name: /All/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Scale queue/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /QC queue/ })).toBeInTheDocument()
  })

  it('changes only the data when the Blocked tab is clicked from the Scale route', async () => {
    renderPage('/portal/production/scale', scaleManagerAccount)

    fireEvent.click(await screen.findByRole('button', { name: /Blocked/ }))

    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Current location' })).toHaveTextContent(
        '/portal/production/scale?queue=blocked',
      ),
    )
    await waitFor(() =>
      expect(listProductionTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({
          psdReadyOnly: false,
          status: 'BLOCKED',
          view: 'SCALE',
        }),
      ),
    )
    expect(screen.getByRole('button', { name: /Recheck PSD-blocked tasks/ })).toBeVisible()
  })

  it('keeps normal task rows in the document flow', async () => {
    vi.mocked(listProductionTasks).mockResolvedValue({
      items: [blockedTask],
      total: 1,
      page: 1,
      limit: 10,
    })
    renderPage()

    const row = (await screen.findByText('113-2183249-0763446')).closest('tr')
    expect(row?.className).not.toMatch(/stickyOrderRow/)
  })

  it('keeps the task table scrollable within the viewport when exactly one task is expanded', async () => {
    vi.mocked(listProductionTasks).mockResolvedValue({
      items: [blockedTask],
      total: 1,
      page: 1,
      limit: 10,
    })
    renderPage()

    await screen.findByText('113-2183249-0763446')
    const table = document.querySelector('.ant-table-container table')

    if (!table) throw new Error('Production task table is required')

    expect(table.closest('[class*="dataTableFillViewport"]')).not.toBeNull()
  })

  it('keeps every visible task detail expanded', async () => {
    vi.mocked(listProductionTasks).mockResolvedValue({
      items: [
        { ...blockedTask, id: 'production-task-1' },
        {
          ...blockedTask,
          id: 'production-task-2',
          orderItem: { externalOrderId: '113-2183249-0763447' },
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
    })
    renderPage()

    expect(await screen.findAllByText('Task context')).toHaveLength(2)
  })

  it('shows the CS note in the required slots panel', async () => {
    vi.mocked(listProductionTasks).mockResolvedValue({
      items: [
        {
          ...blockedTask,
          csNote: 'Use the customer-provided artwork.',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    })
    renderPage('/portal/production/blocked')

    const csNote = await screen.findByText('Use the customer-provided artwork.')
    const requiredSlotsPanel = csNote.closest('[class*="outputSection"]')
    const requiredSlotsContent = requiredSlotsPanel?.querySelector(
      '[class*="requiredSlotsContent"]',
    )

    expect(requiredSlotsPanel).toHaveTextContent('CS note')
    expect(requiredSlotsPanel).toHaveTextContent('Required slots')
    expect(requiredSlotsContent).toHaveTextContent('Required slots')
    expect(requiredSlotsContent).not.toContainElement(csNote)
    expect(csNote.closest('[class*="taskMeta"]')).toBeNull()
  })

  it('restores the selected queue tab from the URL after reload', async () => {
    const firstLoad = renderPage()

    fireEvent.click(await findBlockedQueueTab())
    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Current location' })).toHaveTextContent(
        '/portal/production?queue=blocked',
      ),
    )

    firstLoad.unmount()
    renderPage('/portal/production?queue=blocked')

    expect(await findBlockedQueueTab()).toHaveClass('ant-btn-primary')
  })

  it('uses the sales channel from the URL for production queue requests', async () => {
    renderPage('/portal/production?queue=qc&salesChannelCode=etsy')

    await waitFor(() =>
      expect(listProductionTasks).toHaveBeenCalledWith(
        expect.objectContaining({ salesChannelCode: 'ETSY', view: 'QC', designType: undefined }),
      ),
    )
    expect(summarizeProductionTasks).toHaveBeenCalledWith(
      expect.objectContaining({ salesChannelCode: 'ETSY' }),
    )
    expect(summarizeProductionQueueCounts).toHaveBeenCalledWith(
      expect.objectContaining({ salesChannelCode: 'ETSY' }),
    )
  })

  it('renders a dedicated queue route with specialized scale tabs without toolbar channel filter', async () => {
    renderPage('/portal/production/scale?salesChannelCode=etsy')

    await waitFor(() =>
      expect(listProductionTasks).toHaveBeenCalledWith(
        expect.objectContaining({ salesChannelCode: 'ETSY', view: 'SCALE' }),
      ),
    )
    expect(screen.getByRole('button', { name: /All/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Need scale/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /QC rejected/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /QC pending/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Completed/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Blocked/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Amazon' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Unclassified/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cancelled/ })).not.toBeInTheDocument()
  })

  it('supports viewing completed and historical tasks from the scale queue route', async () => {
    renderPage('/portal/production/scale', scaleManagerAccount)

    fireEvent.click(await screen.findByRole('button', { name: /Completed/ }))

    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Current location' })).toHaveTextContent(
        '/portal/production/scale?queue=sent',
      ),
    )
    await waitFor(() =>
      expect(listProductionTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'READY_TO_SEND_VENDOR,SENT_TO_VENDOR',
          psdReadyOnly: false,
          view: 'SCALE',
        }),
      ),
    )
  })

  it('reloads server data when the shared page-size control changes', async () => {
    renderPage()

    await waitFor(() =>
      expect(listProductionTasks).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, page: 1, view: undefined }),
      ),
    )

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Rows per page' }))
    fireEvent.click((await screen.findAllByText('100')).at(-1)!)

    await waitFor(() =>
      expect(listProductionTasks).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, page: 1, view: undefined }),
      ),
    )
  })

  it('keeps Designer assignment without CS toolbar controls', async () => {
    renderPage('/portal/production/scale', scaleManagerAccount)
    expect(
      await screen.findByRole('combobox', { name: 'Select Scale assignee' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Filter by CS' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Select CS assignee' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /CS/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Required slots' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Blockers' })).not.toBeInTheDocument()
    expect(listCsAssignees).not.toHaveBeenCalled()
    await waitFor(() => expect(listProductionTasks).toHaveBeenCalled())
    const query = vi.mocked(listProductionTasks).mock.calls.at(-1)?.[0]
    expect(query).not.toHaveProperty('csUnassigned')
    expect(query).not.toHaveProperty('csAssigneeId')
  })
})
