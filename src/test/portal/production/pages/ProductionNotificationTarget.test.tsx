import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers/AppProviders'
import { ProductionWorkbenchPage } from '@/features/portal/production/pages/ProductionWorkbenchPage'
import { getProductionTask } from '@/features/portal/production/api/productionApi'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => undefined,
}))
vi.mock('@/features/portal/production/api/productionApi', async (original) => ({
  ...(await original<typeof import('@/features/portal/production/api/productionApi')>()),
  getProductionTask: vi.fn().mockResolvedValue({ id: 'task-1', status: 'NEED_SCALE' }),
  listProductionTasks: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
  summarizeProductionQueueCounts: vi.fn().mockResolvedValue({}),
  summarizeProductionTasks: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/features/portal/production/pages/ProductionWorkbenchExpandedRow', () => ({
  ProductionWorkbenchExpandedRow: ({
    onManualSlotUploaded,
  }: {
    onManualSlotUploaded: () => void
  }) => <button onClick={onManualSlotUploaded}>Upload completed</button>,
}))
afterEach(cleanup)
it('reloads the exact notification task after its upload completes', async () => {
  queryClient.clear()
  render(
    <MemoryRouter initialEntries={['/portal/production?resourceId=task-1']}>
      <AppProviders>
        <ProductionWorkbenchPage
          account={{
            account: { id: 'reader', email: 'reader@example.com', mustChangePassword: false },
            roles: [],
            scopes: [],
            permissions: ['PRODUCTION:READ'],
            profileSetupRequired: false,
          }}
        />
      </AppProviders>
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Upload completed' }))
  await waitFor(() => expect(getProductionTask).toHaveBeenCalledTimes(2))
  expect(getProductionTask).toHaveBeenLastCalledWith('task-1')
})
