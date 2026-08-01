import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, describe, expect, it } from 'vitest'

import type { OrderWorkbenchRow } from '@/features/portal/orders/api/orderApi'
import { OrderInlinePanel } from '@/features/portal/orders/pages/OrderInlinePanel'

afterEach(cleanup)

const row: OrderWorkbenchRow = {
  order: {
    id: 'order-1',
    externalOrderId: 'ORDER-1',
    createdAt: null,
    orderedAt: null,
    status: 'IMPORTED',
    buyer: { name: 'Customer', emailMasked: 'buyer@example.test' },
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
    caseStatus: null,
    assignedStaffIds: [],
  },
  items: [
    {
      item: {
        id: 'item-1',
        sku: 'J2501-DM-1',
        asin: null,
        title: 'Long marketplace product title',
        quantity: 1,
        status: 'NEW',
        csNote: null,
      },
      seller: { employeeCode: 'J2501', name: 'Seller' },
      listing: {
        title: 'Listing product title',
        psdStatus: null,
      },
      customization: null,
      mapping: null,
      pricing: { customerPaidAmount: 0, baseCostAmount: null, currency: 'USD' },
      production: null,
      tracking: null,
      workflow: {
        stage: 'NEED_ADDRESS',
        owner: 'CS',
        blockers: [{ code: 'ADDRESS_NOT_VALID' }],
        nextActions: ['VALIDATE_ADDRESS'],
      },
    },
  ],
}

function renderPanel(
  canWrite = true,
  requestedModal?: 'address' | 'customer' | 'shipping' | 'case' | 'replacement' | 'timeline',
  source = row,
) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <App>
        <OrderInlinePanel row={source} canWrite={canWrite} requestedModal={requestedModal} />
      </App>
    </QueryClientProvider>,
  )
}

describe('OrderInlinePanel', () => {
  it('omits duplicated address and marketplace product titles', () => {
    renderPanel()

    expect(screen.queryByText(/123 Main St/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Austin/)).not.toBeInTheDocument()
    expect(screen.queryByText('Long marketplace product title')).not.toBeInTheDocument()
    expect(screen.queryByText('Listing product title')).not.toBeInTheDocument()
  })

  it('keeps order-level actions out of the expanded detail', () => {
    renderPanel(false)
    expect(
      screen.queryByRole('button', { name: 'orders.actions.editAddress' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'orders.actions.editShipping' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'orders.actions.manageCase' }),
    ).not.toBeInTheDocument()
  })

  it('opens the address modal when requested by the customer column', () => {
    renderPanel(true, 'address')
    const replacement = screen.getByRole('button', { name: 'orders.actions.replaceShort' })

    expect(replacement).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument()
  })

  it('exposes item history and edits customer details in place', () => {
    renderPanel(true, 'customer')

    expect(screen.getByRole('button', { name: 'orders.actions.viewHistory' })).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Customer')).toBeInTheDocument()
    expect(screen.getByDisplayValue('buyer@example.test')).toBeInTheDocument()
  })

  it('lets an order replacement select multiple items', () => {
    const secondItem = {
      ...row.items[0],
      item: { ...row.items[0].item, id: 'item-2', sku: 'J2502-DM-2' },
    }
    renderPanel(true, 'replacement', { ...row, items: [row.items[0], secondItem] })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getAllByText('J2501-DM-1')).toHaveLength(2)
    expect(screen.getAllByText('J2502-DM-2')).toHaveLength(2)
  })
})
