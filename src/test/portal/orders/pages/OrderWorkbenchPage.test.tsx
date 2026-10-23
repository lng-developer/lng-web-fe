import { MemoryRouter, useLocation } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  getOrderSummary,
  listOrderWorkbench,
  type OrderWorkbenchRow,
} from '@/features/portal/orders/api/orderApi'
import { OrderWorkbenchPage } from '@/features/portal/orders/pages/OrderWorkbenchPage'
import styles from '@/features/portal/orders/pages/OrderWorkbenchPage.module.scss'
import orderWorkbenchSource from '@/features/portal/orders/pages/OrderWorkbenchPage.tsx?raw'
import { listShops } from '@/features/portal/shops/api/shopApi'
import { listVendors } from '@/features/portal/vendors/api/vendorApi'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => undefined,
}))

vi.mock('@/app/common/CoreDataTable', async () => ({
  CoreDataTable: (await import('@/test/mocks/CoreDataTable')).CoreDataTable,
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

const workbenchRow: OrderWorkbenchRow = {
  order: {
    id: 'order-1',
    externalOrderId: '113-2183249-0763446',
    createdAt: '2026-08-27T00:00:00.000Z',
    orderedAt: '2026-08-13T18:56:50.000Z',
    status: 'PROCESSING',
    buyer: { name: 'BRANT EDRINGTON' },
    shopId: 'shop-1',
    shop: { id: 'shop-1', name: 'Evermoed LLC' },
    shippingService: { name: 'Standard' },
    shippingAddress: {},
    addressValidationStatus: 'VALID',
    pricing: { customerPaidAmount: 0, baseCostAmount: 0, totalCostAmount: 0, currency: 'USD' },
    handlingLabel: null,
    caseStatus: 'NONE',
    assignedStaffIds: [],
  },
  items: [],
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

  it('sends the sales channel query on every workbench and summary request', async () => {
    renderPage('/portal/orders?salesChannelCode=etsy')

    await waitFor(() =>
      expect(listOrderWorkbench).toHaveBeenCalledWith(
        expect.objectContaining({ salesChannelCode: 'ETSY' }),
      ),
    )
    expect(getOrderSummary).toHaveBeenCalledWith(
      expect.objectContaining({ salesChannelCode: 'ETSY' }),
    )
  })

  it('activates the selected order queue tab without redundant status badge', async () => {
    renderPage('/portal/orders?tab=NEW_ORDER')

    expect(await screen.findByRole('tab', { selected: true })).toHaveTextContent('New')
    expect(screen.queryByRole('status', { name: 'Current queue' })).not.toBeInTheDocument()
  })

  it('keeps order IDs copyable without showing a copy icon', async () => {
    vi.mocked(listOrderWorkbench).mockResolvedValue({
      items: [workbenchRow],
      pagination: { total: 1, page: 1, limit: 20 },
    })

    renderPage()

    const orderId = await screen.findByRole('button', { name: '113-2183249-0763446' })
    expect(orderId.closest(`.${styles.orderIdChip}`)).toBeNull()
    expect(screen.queryByRole('img', { name: 'copy' })).not.toBeInTheDocument()
  })

  it('shows the marketplace order time separately from the import time', async () => {
    vi.mocked(listOrderWorkbench).mockResolvedValue({
      items: [workbenchRow],
      pagination: { total: 1, page: 1, limit: 20 },
    })

    renderPage()

    expect(await screen.findByText('Aug 14, 2026')).toBeVisible()
    expect(orderWorkbenchSource).toContain("title: t('orders.columns.orderedAt')")
    expect(orderWorkbenchSource).toContain("title: t('orders.columns.importedAt')")
  })

  it('uses the Orders tab rail so status tabs stay on one line', async () => {
    renderPage()

    expect((await screen.findByRole('tablist')).closest(`.${styles.orderTabs}`)).toBeInTheDocument()
  })

  it('places the order queue tabs on a visually distinct rail', async () => {
    renderPage()

    expect((await screen.findByRole('tablist')).closest(`.${styles.queueRail}`)).toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: 'ORDER-WITH-CASE' })).toBeInTheDocument()
    expect(orderWorkbenchSource).toContain("title: t('orders.columns.totalCost')")
    expect(orderWorkbenchSource).not.toContain("align: 'right'")
  })

  it('uses a compact Case column and reallocates its width to the earlier columns', () => {
    expect(orderWorkbenchSource).toContain("title: t('orders.columns.case')")
    expect(orderWorkbenchSource).toContain("width: '5%'")
    expect(orderWorkbenchSource).toContain("title: t('orders.columns.order')")
    expect(orderWorkbenchSource).toContain("width: '14%'")
  })

  it('allows the order table to scroll horizontally when space is constrained', () => {
    expect(orderWorkbenchSource).toContain('scroll={{ x: 1460 }}')
  })

  it('does not pin order rows while the table scrolls', () => {
    expect(orderWorkbenchSource).not.toContain('rowClassName={() => styles.stickyOrderRow}')
  })

  it('does not retain an earlier page while the next page is loading', () => {
    expect(orderWorkbenchSource.match(/placeholderData: keepPreviousData/g)).toHaveLength(1)
  })

  it('keeps stable shop and vendor filters cached longer than order rows', () => {
    expect(orderWorkbenchSource.match(/staleTime: 5 \* 60_000/g)).toHaveLength(2)
  })
})
