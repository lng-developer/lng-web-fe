import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { orderKeys } from '@/features/portal/orders/api/orderKeys'
import { useOrderActionsMutation } from '@/features/portal/orders/hooks/useOrderActionsMutation'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({ apiClient: { patch: vi.fn() } }))

it('updates a saved CS note in full workbench data without losing pagination or other orders', async () => {
  vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
  const client = new QueryClient()
  const key = orderKeys.workbench({ page: 1, limit: 50 })
  const other = { order: { id: 'other' }, items: [{ item: { id: 'other-item', csNote: 'keep' } }] }
  const pagination = { page: 1, limit: 50, total: 2 }
  client.setQueryData(key, {
    items: [{ order: { id: 'order' }, items: [{ item: { id: 'item', csNote: 'before' } }] }, other],
    pagination,
  })
  const { result, unmount } = renderHook(() => useOrderActionsMutation({ orderId: 'order' }), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  await act(() => result.current.mutateAsync({ kind: 'note', itemId: 'item', note: 'after' }))
  expect(client.getQueryData(key)).toEqual({
    items: [{ order: { id: 'order' }, items: [{ item: { id: 'item', csNote: 'after' } }] }, other],
    pagination,
  })
  unmount()
  client.clear()
})
it('updates quantity with a stale-value guard and refreshes item history and workbench', async () => {
  vi.mocked(apiClient.patch).mockResolvedValue({ data: { quantity: 2 } })
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const { result, unmount } = renderHook(() => useOrderActionsMutation({ orderId: 'order' }), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  await act(() =>
    result.current.mutateAsync({
      kind: 'quantity',
      itemId: 'item',
      quantity: 2,
      expectedQuantity: 1,
      reason: 'Pack of two',
    }),
  )
  expect(apiClient.patch).toHaveBeenCalledWith('/api/orders/items/item/quantity', {
    quantity: 2,
    expectedQuantity: 1,
    reason: 'Pack of two',
  })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: orderKeys.timeline('order', 'item') })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: [...orderKeys.all, 'workbench'] })
  unmount()
  client.clear()
})
