import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { OrderWorkbenchRow } from '@/features/portal/orders/api/orderApi'
import { useOrderWorkbenchQuery } from '@/features/portal/orders/hooks/useOrderWorkbenchQuery'
import { OrderWorkbenchExpandedRow } from '@/features/portal/orders/pages/OrderWorkbenchExpandedRow'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn() } }))
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

describe('OrderWorkbenchExpandedRow', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('renders supplied details near the viewport without another API request', async () => {
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
    render(<OrderWorkbenchExpandedRow row={makeRow('a')} canWrite={false} canOperate={false} />)
    expect(screen.queryByText('a details')).toBeNull()
    act(() =>
      observers[0](
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    expect(await screen.findByText('a details')).toBeVisible()
    expect(apiClient.get).not.toHaveBeenCalled()
  })

  it('loads full rows through the existing workbench endpoint with no summary parameter', async () => {
    const data = { items: [makeRow('a')], pagination: { page: 1, limit: 50, total: 1 } }
    vi.mocked(apiClient.get).mockResolvedValue({ data })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useOrderWorkbenchQuery({ page: 1, limit: 50 }), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(data)
    expect(apiClient.get).toHaveBeenCalledExactlyOnceWith('/api/orders/workbench', {
      params: { page: 1, limit: 50 },
      signal: expect.any(AbortSignal),
    })
    client.clear()
  })
})
