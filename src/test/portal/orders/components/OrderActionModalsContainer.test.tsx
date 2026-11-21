import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: 'vi' },
  }),
}))

const feedbackToast = vi.fn()
vi.mock('@/shared/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  useFeedbackToast: () => feedbackToast,
}))

import type { OrderWorkbenchRow } from '@/features/portal/orders/api/orderApi'
import { OrderActionModalsContainer } from '@/features/portal/orders/components/OrderActionModalsContainer'
import { useOrderActionStore } from '@/features/portal/orders/hooks/useOrderActionStore'

afterEach(() => {
  cleanup()
  act(() => {
    useOrderActionStore.setState({ orderAction: undefined })
  })
})

const mockRow: OrderWorkbenchRow = {
  order: {
    id: 'order-1',
    externalOrderId: 'ORDER-100',
    createdAt: null,
    orderedAt: null,
    status: 'IMPORTED',
    buyer: { name: 'John Doe', emailMasked: 'john@example.com' },
    shop: null,
    shippingService: { level: 'Standard', name: 'USPS Priority' },
    shippingAddress: {
      name: 'John Doe',
      addressLine1: '123 Elm St',
      city: 'Austin',
      stateOrProvinceCode: 'TX',
      postalCode: '78701',
      countryCode: 'US',
    },
    addressValidationStatus: 'NOT_CHECKED',
    pricing: { customerPaidAmount: 50, baseCostAmount: null, currency: 'USD' },
    handlingLabel: null,
    caseStatus: null,
    assignedStaffIds: [],
  },
  items: [
    {
      item: {
        id: 'item-1',
        sourceSku: 'SKU-1',
        sku: 'SKU-1',
        asin: null,
        title: 'T-Shirt',
        quantity: 1,
        status: 'NEW',
        csNote: null,
      },
      seller: null,
      listing: null,
      customization: null,
      mapping: null,
      pricing: { customerPaidAmount: 50, baseCostAmount: null, currency: 'USD' },
      production: null,
      tracking: null,
      workflow: { stage: 'IMPORT', owner: 'OPS', blockers: [], nextActions: [] },
    },
  ],
}

function renderContainer(rows = [mockRow], client = new QueryClient()) {
  return render(
    <QueryClientProvider client={client}>
      <App>
        <OrderActionModalsContainer orderItems={rows} />
      </App>
    </QueryClientProvider>,
  )
}

describe('OrderActionModalsContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    act(() => {
      useOrderActionStore.setState({ orderAction: undefined })
    })
  })

  it('renders nothing when no order action is active in the store', () => {
    const { container } = renderContainer()
    expect(container.firstChild).toBeEmptyDOMElement()
  })

  it('renders AddressModal when address action is triggered', () => {
    renderContainer()

    act(() => {
      useOrderActionStore.getState().openOrderModal('order-1', 'address')
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('123 Elm St')).toBeInTheDocument()
  })

  it('renders CustomerModal when customer action is triggered', () => {
    renderContainer()

    act(() => {
      useOrderActionStore.getState().openOrderModal('order-1', 'customer')
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
  })

  it('renders ShippingModal when shipping action is triggered', () => {
    renderContainer()

    act(() => {
      useOrderActionStore.getState().openOrderModal('order-1', 'shipping')
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('USPS Priority')).toBeInTheDocument()
  })

  it('renders CaseModal when case action is triggered', () => {
    renderContainer()

    act(() => {
      useOrderActionStore.getState().openOrderModal('order-1', 'case')
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders TimelineModal when timeline action is triggered', () => {
    renderContainer()

    act(() => {
      useOrderActionStore.getState().openOrderModal('order-1', 'timeline')
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders ReplacementModal when replacement action is triggered', () => {
    renderContainer()

    act(() => {
      useOrderActionStore.getState().openOrderModal('order-1', 'replacement')
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('SKU-1')).toBeInTheDocument()
  })

  it('closes modal and clears store when close is invoked', () => {
    renderContainer()

    act(() => {
      useOrderActionStore.getState().openOrderModal('order-1', 'address')
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Click modal close button
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(useOrderActionStore.getState().orderAction).toBeUndefined()
  })
})
