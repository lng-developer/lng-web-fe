import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { listShipments, summarizeShipments } from '@/features/portal/shipments/api/shipmentApi'
import { ShipmentWorkbenchPage } from '@/features/portal/shipments/pages/ShipmentWorkbenchPage'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => undefined,
}))

vi.mock('@/features/portal/shipments/api/shipmentApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/shipments/api/shipmentApi')>()),
  listShipments: vi.fn(),
  summarizeShipments: vi.fn(),
}))

const account: CurrentAccount = {
  account: {
    id: 'shipment-reader',
    email: 'shipment@lng.co',
    mustChangePassword: false,
  },
  roles: [],
  permissions: ['SHIPMENTS:READ'],
  scopes: [],
  profileSetupRequired: false,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/portal/shipments']}>
      <AppProviders>
        <ShipmentWorkbenchPage account={account} />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('ShipmentWorkbenchPage', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    vi.clearAllMocks()
    queryClient.clear()
    await i18n.changeLanguage('en')
    vi.mocked(listShipments).mockImplementation(async (params) => ({
      items: [],
      pagination: { total: 120, page: params.page, limit: params.limit },
    }))
    vi.mocked(summarizeShipments).mockResolvedValue({
      total: 120,
      trackingPending: 0,
      shipped: 0,
      delivered: 0,
      exception: 0,
      cancelled: 0,
    })
  })

  it('keeps short shipment columns compact within a stable table width', async () => {
    renderPage()

    await waitFor(() => expect(listShipments).toHaveBeenCalled())

    const table = document.querySelector<HTMLTableElement>('.ant-table-container table')
    expect(table).toHaveStyle({ width: '1100px', tableLayout: 'fixed' })
  })

  it('reloads server data when the shared page-size control changes', async () => {
    renderPage()

    await waitFor(() =>
      expect(listShipments).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, page: 1 })),
    )

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Rows per page' }))
    fireEvent.click((await screen.findAllByText('50')).at(-1)!)

    await waitFor(() =>
      expect(listShipments).toHaveBeenCalledWith(expect.objectContaining({ limit: 50, page: 1 })),
    )
  })

  it('loads the selected server page from the shared pagination', async () => {
    renderPage()

    fireEvent.click(await screen.findByTitle('2'))

    await waitFor(() =>
      expect(listShipments).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, page: 2 })),
    )
  })
})
