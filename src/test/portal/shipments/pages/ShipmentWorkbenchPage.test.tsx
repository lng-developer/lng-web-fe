import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  type Shipment,
  getShipment,
  listShipments,
  summarizeShipments,
  listWebhookLogs,
} from '@/features/portal/shipments/api/shipmentApi'
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
  getShipment: vi.fn(),
  summarizeShipments: vi.fn(),
  listWebhookLogs: vi.fn(),
}))

vi.mock('@/features/portal/shops/api/shopApi', () => ({
  listShops: vi
    .fn()
    .mockResolvedValue({ items: [], pagination: { total: 0, page: 1, limit: 100 } }),
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

function renderPage(url = '/portal/shipments') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AppProviders>
        <ShipmentWorkbenchPage account={account} />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('ShipmentWorkbenchPage', () => {
  it('read-only shipment viewers see tracking without fetching shared webhook logs', async () => {
    vi.mocked(getShipment).mockResolvedValue({
      id: 'shipment-own',
      orderId: 'order-own',
      orderItemId: 'item-own',
      vendorSubmissionId: 'submission-own',
      shopId: 'shop-own',
      status: 'SHIPPED',
      provider: 'MERCHIZE',
      externalOrderId: 'order-own',
      vendorExternalOrderId: null,
      carrier: 'USPS',
      trackingNumber: 'TRACK-OWN',
      trackingUrl: null,
      shippedAt: null,
      deliveredAt: null,
      note: null,
      createdAt: '',
      updatedAt: '',
    })
    renderPage('/portal/shipments?resourceId=shipment-own')
    expect(await screen.findByText('TRACK-OWN')).toBeVisible()
    expect(listWebhookLogs).not.toHaveBeenCalled()
    expect(screen.queryByText('Vendor webhook history')).not.toBeInTheDocument()
  })
  it('fetches a notification target outside the current page and handles denied access', async () => {
    vi.mocked(getShipment).mockRejectedValue(new Error('Forbidden'))
    renderPage('/portal/shipments?resourceId=shipment-outside-page')
    await waitFor(() => expect(getShipment).toHaveBeenCalledWith('shipment-outside-page'))
    expect(
      await screen.findByText('This record is unavailable or you no longer have access.'),
    ).toBeVisible()
  })
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

  const currentShipment: Shipment = {
    id: 'current',
    orderId: 'order-one',
    orderItemId: 'item-one',
    shopId: 'shop-one',
    vendorSubmissionId: 'submission-current',
    externalOrderId: '114-4533300-1174625',
    vendorExternalOrderId: 'vendor-current',
    provider: 'MANGOTEE',
    status: 'TRACKING_PENDING',
    trackingNumber: null,
    carrier: null,
    trackingUrl: null,
    shippedAt: null,
    deliveredAt: null,
    note: null,
    createdAt: '2026-11-27T06:32:00Z',
    updatedAt: '2026-11-27T06:32:00Z',
  }
  const cancelledShipment: Shipment = {
    ...currentShipment,
    id: 'cancelled',
    provider: 'LNG_GROUP',
    status: 'CANCELLED',
    vendorExternalOrderId: 'vendor-old',
    createdAt: '2026-11-27T02:48:00Z',
    updatedAt: '2026-11-27T07:00:00Z',
  }

  function loadRows(items: Shipment[]) {
    vi.mocked(listShipments).mockResolvedValue({
      items,
      pagination: { total: items.length, page: 1, limit: 50 },
    })
  }

  it('keeps a replaced cancellation in history without inflating items or changing the current provider', async () => {
    loadRows([cancelledShipment, currentShipment])
    vi.mocked(getShipment).mockResolvedValue(cancelledShipment)
    renderPage()
    const order = await screen.findByText(currentShipment.externalOrderId!)
    const row = within(order.closest('tr')!)
    expect(row.getByText('MANGOTEE')).toBeVisible()
    expect(row.queryByText('LNG_GROUP')).not.toBeInTheDocument()
    expect(row.queryByText('Cancelled')).not.toBeInTheDocument()
    expect(row.queryByText('2 items')).not.toBeInTheDocument()
    fireEvent.click(row.getByRole('button', { name: 'History (1)' }))
    fireEvent.click(await screen.findByRole('button', { name: 'LNG_GROUP · Cancelled' }))
    await waitFor(() => expect(getShipment).toHaveBeenCalledWith('cancelled'))
  }, 30000)

  it('keeps cancelled-only items visible and counts distinct items', async () => {
    loadRows([currentShipment, { ...cancelledShipment, orderItemId: 'item-two' }])
    renderPage()
    const order = await screen.findByText(currentShipment.externalOrderId!)
    const row = within(order.closest('tr')!)
    expect(row.getByText('2 items')).toBeVisible()
    expect(row.getByText('Cancelled')).toBeVisible()
    expect(row.queryByRole('button', { name: /History/ })).not.toBeInTheDocument()
  })

  it('does not hide an order that has only cancelled shipments', async () => {
    loadRows([cancelledShipment])
    renderPage()
    const order = await screen.findByText(currentShipment.externalOrderId!)
    expect(within(order.closest('tr')!).getByText('Cancelled')).toBeVisible()
  })

  it('does not bundle different internal orders with the same external identifier', async () => {
    loadRows([
      currentShipment,
      { ...cancelledShipment, orderId: 'other-order', shopId: 'other-shop' },
    ])
    renderPage()
    expect(await screen.findAllByText(currentShipment.externalOrderId!)).toHaveLength(2)
  })

  it('keeps short shipment columns compact within a stable table width', async () => {
    renderPage()

    await waitFor(() => expect(listShipments).toHaveBeenCalled())

    const table = document.querySelector<HTMLTableElement>('.ant-table-container table')
    expect(table).toHaveStyle({ width: '1288px', tableLayout: 'fixed' })
    expect(table?.querySelector('.ant-table-selection-column')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Ship date' })).toBeInTheDocument()
  })

  it('reloads server data when the shared page-size control changes', async () => {
    renderPage()

    await waitFor(() =>
      expect(listShipments).toHaveBeenCalledWith(expect.objectContaining({ limit: 50, page: 1 })),
    )

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Rows per page' }))
    fireEvent.click((await screen.findAllByText('100')).at(-1)!)

    await waitFor(() =>
      expect(listShipments).toHaveBeenCalledWith(expect.objectContaining({ limit: 100, page: 1 })),
    )
  })

  it('loads the selected server page from the shared pagination', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Page 2' }))

    await waitFor(() =>
      expect(listShipments).toHaveBeenCalledWith(expect.objectContaining({ limit: 50, page: 2 })),
    )
  })
})
