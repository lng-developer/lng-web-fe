import { MemoryRouter, useLocation } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { getOrderSummary, listOrderWorkbench } from '@/features/portal/orders/api/orderApi'
import { OrderWorkbenchPage } from '@/features/portal/orders/pages/OrderWorkbenchPage'
import { listShops } from '@/features/portal/shops/api/shopApi'
import { listVendors } from '@/features/portal/vendors/api/vendorApi'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => undefined,
}))

vi.mock('@/features/portal/orders/api/orderApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/orders/api/orderApi')>()),
  getOrderSummary: vi.fn(),
  listOrderWorkbench: vi.fn(),
}))

vi.mock('@/features/portal/shops/api/shopApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/shops/api/shopApi')>()),
  listShops: vi.fn(),
}))

vi.mock('@/features/portal/vendors/api/vendorApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/vendors/api/vendorApi')>()),
  listVendors: vi.fn(),
}))

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="Current location">{location.pathname + location.search}</output>
}

function renderPage(initialEntry = '/portal/orders') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppProviders>
        <OrderWorkbenchPage />
        <LocationProbe />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('OrderWorkbenchPage', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    vi.clearAllMocks()
    queryClient.clear()
    await i18n.changeLanguage('en')
    vi.mocked(listOrderWorkbench).mockImplementation(async (params) => ({
      items: [],
      pagination: { total: 0, page: params.page, limit: params.limit },
    }))
    vi.mocked(getOrderSummary).mockResolvedValue({ tabCounts: {} })
    vi.mocked(listShops).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 100 },
    })
    vi.mocked(listVendors).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 100 },
    })
  })

  it('restores the selected order tab from the URL after reload', async () => {
    const firstLoad = renderPage()
    const newOrderTab = await screen.findByRole('tab', { name: /^New/i })

    fireEvent.click(newOrderTab)
    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Current location' })).toHaveTextContent(
        '/portal/orders?tab=NEW_ORDER',
      ),
    )

    firstLoad.unmount()
    renderPage('/portal/orders?tab=NEW_ORDER')

    expect(await screen.findByRole('tab', { name: /^New/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await waitFor(() =>
      expect(listOrderWorkbench).toHaveBeenCalledWith(
        expect.objectContaining({ tab: 'NEW_ORDER' }),
      ),
    )
  })
})
