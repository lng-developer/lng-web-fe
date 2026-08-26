import { MemoryRouter, useLocation } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  listProductionTasks,
  summarizeProductionTasks,
} from '@/features/portal/production/api/productionApi'
import { ProductionWorkbenchPage } from '@/features/portal/production/pages/ProductionWorkbenchPage'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => undefined,
}))

vi.mock('@/features/portal/production/api/productionApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/production/api/productionApi')>()),
  listProductionTasks: vi.fn(),
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

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="Current location">{location.pathname + location.search}</output>
}

function renderPage(initialEntry = '/portal/production') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppProviders>
        <ProductionWorkbenchPage account={account} />
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
  })

  it('stretches every table layer across the available width', async () => {
    renderPage()

    await waitFor(() => expect(listProductionTasks).toHaveBeenCalled())

    const tables = document.querySelectorAll<HTMLTableElement>('.ant-table-container table')
    expect(tables.length).toBeGreaterThan(0)
    tables.forEach((table) => expect(table).toHaveStyle({ width: '100%' }))
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

  it('reloads server data when the shared page-size control changes', async () => {
    renderPage()

    await waitFor(() =>
      expect(listProductionTasks).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20, page: 1, view: 'SCALE' }),
      ),
    )

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Rows per page' }))
    fireEvent.click((await screen.findAllByText('50')).at(-1)!)

    await waitFor(() =>
      expect(listProductionTasks).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, page: 1, view: 'SCALE' }),
      ),
    )
  })
})
