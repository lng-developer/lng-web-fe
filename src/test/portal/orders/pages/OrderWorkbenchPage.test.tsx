import { MemoryRouter, useLocation } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { getOrderSummary, listOrderWorkbench } from '@/features/portal/orders/api/orderApi'
import { OrderWorkbenchPage } from '@/features/portal/orders/pages/OrderWorkbenchPage'
import styles from '@/features/portal/orders/pages/OrderWorkbenchPage.module.scss'
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

  it('uses the Orders tab rail so status tabs stay on one line', async () => {
    renderPage()

    expect((await screen.findByRole('tablist')).closest(`.${styles.orderTabs}`)).toBeInTheDocument()
  })

  it('shows an open case as an icon without exposing its title in the table', async () => {
    vi.mocked(listOrderWorkbench).mockResolvedValue({
      items: [
        {
          order: {
            id: 'order-with-case',
            externalOrderId: 'ORDER-WITH-CASE',
            createdAt: null,
            orderedAt: null,
            status: 'IMPORTED',
            buyer: { name: 'Customer', emailMasked: 'customer@example.test' },
            shop: null,
            shippingService: {},
            shippingAddress: {
              name: 'Customer',
              addressLine1: '123 Main St',
              city: 'Austin',
              stateOrProvinceCode: 'TX',
              postalCode: '78701',
              countryCode: 'US',
            },
            addressValidationStatus: 'NOT_CHECKED',
            pricing: { customerPaidAmount: 0, baseCostAmount: null, currency: 'USD' },
            handlingLabel: null,
            caseStatus: 'OPEN',
            caseTitle: 'Address validation failed',
            assignedStaffIds: [],
          },
          items: [],
        },
      ],
      pagination: { total: 1, page: 1, limit: 20 },
    })

    renderPage()

    expect(await screen.findByLabelText('Manage case')).toBeVisible()
    expect(screen.queryByText('Address validation failed')).not.toBeInTheDocument()
    expect(screen.getByTitle('Copy order ID').closest(`.${styles.orderIdChip}`)).toBeInTheDocument()
    expect(
      document.querySelectorAll('.ant-table-tbody > tr:not(.ant-table-expanded-row) > td')[6],
    ).not.toHaveStyle({ textAlign: 'right' })
  })

  it('uses a compact Case column and reallocates its width to the earlier columns', async () => {
    renderPage()

    await screen.findByRole('columnheader', { name: 'Case' })

    const columns = document.querySelectorAll('.ant-table colgroup col')

    expect(columns[0]).toHaveStyle({ width: '14%' })
    expect(columns[1]).toHaveStyle({ width: '12%' })
    expect(columns[2]).toHaveStyle({ width: '12%' })
    expect(columns[3]).toHaveStyle({ width: '14%' })
    expect(columns[4]).toHaveStyle({ width: '12%' })
    expect(columns[5]).toHaveStyle({ width: '12%' })
    expect(columns[6]).toHaveStyle({ width: '12%' })
    expect(columns[7]).toHaveStyle({ width: '5%' })
  })

  it('allows the order table to scroll horizontally when space is constrained', async () => {
    renderPage()

    await screen.findByRole('columnheader', { name: 'Order ID' })

    expect(document.querySelector('.ant-table-body')).toHaveStyle({ overflowX: 'auto' })
    expect(document.querySelector('.ant-table-body table')).toHaveStyle({ width: '1320px' })
  })
})
