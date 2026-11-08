import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/common/CoreDataTable', async () => ({
  CoreDataTable: (await import('@/test/mocks/CoreDataTable')).CoreDataTable,
}))

import { AppProviders } from '@/app/providers/AppProviders'
import { PngTasksPage } from '@/features/portal/design/pages/PngTasksPage'
import {
  listProductionTasks,
  summarizeProductionQueueCounts,
} from '@/features/portal/production/api/productionApi'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
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
        designType: 'CUSTOM_IMAGE',
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
    needScale: 1,
    qcRejected: 0,
    qcPending: 0,
    qcQueue: 0,
    ready: 0,
    sent: 0,
    blocked: 0,
  }),
  listScaleAssignees: vi.fn().mockResolvedValue({ items: [] }),
  assignProductionTask: vi.fn(),
  bulkAssignProductionTasks: vi.fn(),
  claimProductionTask: vi.fn(),
  exportProductionQcTasks: vi.fn(),
  exportProductionTasksCsv: vi.fn(),
  getProductionTask: vi.fn(),
  recheckPsdBlockedTasks: vi.fn(),
  submitProductionQc: vi.fn(),
  submitScaleForQc: vi.fn(),
  updateDesignNote: vi.fn(),
  uploadScaledOutput: vi.fn(),
}))

describe('PngTasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders PngTasksPage synchronized with Scale workbench, order listing, and scale filters', async () => {
    render(
      <AppProviders>
        <MemoryRouter initialEntries={['/portal/design/png-tasks?salesChannelCode=amazon']}>
          <Routes>
            <Route path="/portal/design/png-tasks" element={<PngTasksPage />} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    expect(await screen.findByText('112-9999999-0000001')).toBeInTheDocument()
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getAllByText(/need scale/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Evermood LLC').length).toBeGreaterThan(0)
    expect(screen.queryByText('ASIN Type')).not.toBeInTheDocument()
    expect(listProductionTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        view: 'SCALE',
        designType: 'CUSTOM_IMAGE',
        salesChannelCode: 'AMAZON',
      }),
    )
    expect(summarizeProductionQueueCounts).toHaveBeenCalledWith(
      expect.objectContaining({ designType: 'CUSTOM_IMAGE', salesChannelCode: 'AMAZON' }),
    )

    fireEvent.click(screen.getByRole('button', { name: /need scale/i }))
    await waitFor(() =>
      expect(listProductionTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({
          view: 'SCALE',
          status: 'NEED_SCALE',
          designType: 'CUSTOM_IMAGE',
          salesChannelCode: 'AMAZON',
        }),
      ),
    )
  })
})
