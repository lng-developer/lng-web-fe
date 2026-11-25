import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { OrderAddressModal } from '@/features/portal/orders/components/OrderAddressModal'
import {
  getOrderAddressValidation,
  type OrderWorkbenchRow,
} from '@/features/portal/orders/api/orderApi'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/portal/orders/api/orderApi', async (load) => ({
  ...(await load<typeof import('@/features/portal/orders/api/orderApi')>()),
  getOrderAddressValidation: vi.fn(),
}))

const order: OrderWorkbenchRow['order'] = {
  id: 'order-1',
  externalOrderId: '112-test',
  createdAt: null,
  orderedAt: null,
  status: 'PROCESSING',
  buyer: {},
  shop: null,
  shippingService: {},
  shippingAddress: { name: 'Recipient', stateOrProvince: 'VA', stateOrProvinceCode: null },
  addressValidationStatus: 'WARNING',
  pricing: { customerPaidAmount: 0, baseCostAmount: null, currency: 'USD' },
  handlingLabel: null,
  caseStatus: 'OPEN',
  assignedStaffIds: [],
}

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(getOrderAddressValidation).mockResolvedValue({
    provider: 'smarty',
    reason: 'postal-match,unknown-secondary,ignored-input',
    checkedAt: null,
    cached: true,
    normalizedAddress: {
      addressLine1: '317 E Main St Fl 1',
      city: 'Front Royal',
      stateOrProvinceCode: 'VA',
      postalCode: '22630-3179',
    },
  })
})

function show(open = true, selectedOrder = order) {
  const onAction = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <OrderAddressModal
        open={open}
        order={selectedOrder}
        pending={false}
        onClose={() => {}}
        onAction={onAction}
      />
    </QueryClientProvider>,
  )
  return onAction
}

it('loads saved diagnostics only when open and explains the secondary warning', async () => {
  const onAction = show()
  expect(screen.getByLabelText('State / province')).toHaveValue('VA')
  expect(
    await screen.findByText(/The floor, apartment or suite could not be confirmed/),
  ).toHaveTextContent('Using a saved validation result.')
  expect(
    screen.getByText(/The floor, apartment or suite could not be confirmed/),
  ).toHaveTextContent('317 E Main St Fl 1')
  expect(onAction).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('State / province'), { target: { value: 'NY' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save address' }))
  expect(onAction).toHaveBeenCalledWith({
    kind: 'address',
    address: expect.objectContaining({
      name: 'Recipient',
      stateOrProvince: 'NY',
      stateOrProvinceCode: 'NY',
    }),
  })
})

it('does not fetch when closed', () => {
  show(false)
  expect(getOrderAddressValidation).not.toHaveBeenCalled()
})

it('prefers the explicit state code and supports older responses without diagnostics', async () => {
  vi.mocked(getOrderAddressValidation).mockResolvedValue(null)
  show(true, {
    ...order,
    shippingAddress: { stateOrProvince: 'Virginia', stateOrProvinceCode: 'VA' },
  })
  expect(screen.getByLabelText('State / province')).toHaveValue('VA')
  expect(screen.queryByText('Address check details')).not.toBeInTheDocument()
})
