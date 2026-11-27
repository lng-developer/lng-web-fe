import { renderHook, act, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useFinanceMutations } from '@/features/portal/finance/hooks/useFinanceMutations'

vi.mock('@/shared/ui', () => ({ useFeedbackToast: () => vi.fn() }))
vi.mock('@/features/portal/finance/api/financeApi', () => ({
  recalculateOrder: vi.fn().mockResolvedValue({}),
  recalculateOrderItem: vi.fn().mockResolvedValue({}),
  recalculateOrders: vi.fn(),
  exportFinanceSnapshotsCsv: vi.fn(),
}))
afterEach(cleanup)
it.each(['recalculate', 'recalculateItem'] as const)(
  '%s refreshes reports after completion',
  async (name) => {
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useFinanceMutations(), { wrapper })
    await act(async () => {
      await result.current[name].mutateAsync('id')
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reports'] })
  },
)
