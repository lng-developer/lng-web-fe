import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  listOrderWorkbenchDetails,
  type OrderWorkbenchRow,
} from '@/features/portal/orders/api/orderApi'
import { OrderWorkbenchExpandedRow } from '@/features/portal/orders/pages/OrderWorkbenchExpandedRow'

vi.mock('@/features/portal/orders/api/orderApi', () => ({ listOrderWorkbenchDetails: vi.fn() }))
vi.mock('@/features/portal/orders/pages/OrderInlinePanel', () => ({
  OrderInlinePanel: ({ row }: { row: OrderWorkbenchRow }) => <div>{row.order.id} details</div>,
}))

function makeRow(id: string): OrderWorkbenchRow {
  return {
    order: {
      id,
      externalOrderId: id,
      status: 'PROCESSING',
      createdAt: null,
      orderedAt: null,
      buyer: {},
      shop: null,
      shippingAddress: {},
      shippingService: {},
      addressValidationStatus: null,
      pricing: { customerPaidAmount: 0, baseCostAmount: null, currency: null },
      handlingLabel: null,
      caseStatus: null,
      assignedStaffIds: [],
    },
    items: [],
  }
}

function renderRows() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <OrderWorkbenchExpandedRow
        row={makeRow('a')}
        index={0}
        detailIds={['a', 'b']}
        canWrite={false}
        canOperate={false}
      />
      <OrderWorkbenchExpandedRow
        row={makeRow('b')}
        index={1}
        detailIds={['a', 'b']}
        canWrite={false}
        canOperate={false}
      />
      <OrderWorkbenchExpandedRow
        row={makeRow('c')}
        index={5}
        detailIds={['c']}
        canWrite={false}
        canOperate={false}
      />
    </QueryClientProvider>,
  )
}

describe('OrderWorkbenchExpandedRow', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('shares the first batch and requests the next only when it approaches the viewport', async () => {
    const observers: IntersectionObserverCallback[] = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          observers.push(callback)
        }
        observe() {}
        disconnect() {}
      },
    )
    vi.mocked(listOrderWorkbenchDetails).mockImplementation(async (ids) => ({
      items: ids.map(makeRow),
    }))

    renderRows()

    expect(await screen.findByText('a details')).toBeVisible()
    expect(screen.getByText('b details')).toBeVisible()
    expect(listOrderWorkbenchDetails).toHaveBeenCalledTimes(1)
    expect(listOrderWorkbenchDetails).toHaveBeenCalledWith(['a', 'b'], expect.any(AbortSignal))
    expect(screen.queryByText('c details')).toBeNull()

    const observer = observers[0]
    act(() =>
      observer([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver),
    )

    expect(await screen.findByText('c details')).toBeVisible()
    expect(listOrderWorkbenchDetails).toHaveBeenCalledTimes(2)
    expect(listOrderWorkbenchDetails).toHaveBeenLastCalledWith(['c'], expect.any(AbortSignal))
  })

  it('can retry a failed batch without reloading the page', async () => {
    vi.mocked(listOrderWorkbenchDetails)
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockImplementation(async (ids) => ({ items: ids.map(makeRow) }))

    renderRows()

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /retry|thử lại/i }).length).toBeGreaterThan(0),
    )
    fireEvent.click(screen.getAllByRole('button', { name: /retry|thử lại/i })[0])
    expect(await screen.findByText('a details')).toBeVisible()
    expect(screen.getByText('b details')).toBeVisible()
  })
})
