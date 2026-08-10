import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/integrations/api/integrationApi', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/portal/integrations/api/integrationApi')>()
  return { ...actual, getImportJobProgress: vi.fn() }
})

import { getImportJobProgress } from '@/features/portal/integrations/api/integrationApi'
import { useImportJobPolling } from '@/features/portal/integrations/hooks/useImportJobPolling'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useImportJobPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(getImportJobProgress).mockResolvedValue({ job: { status: 'IMPORTING' } } as never)
    setVisibility('visible')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('polls only a selected active job', async () => {
    renderHook(() => useImportJobPolling('job-1', 'IMPORTING'), { wrapper })
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(getImportJobProgress).toHaveBeenCalledTimes(1)

    await act(async () => vi.advanceTimersByTimeAsync(5_000))

    expect(getImportJobProgress).toHaveBeenCalledTimes(2)
  })

  it('polls from fetched active detail when the list-row status is unavailable', async () => {
    renderHook(() => useImportJobPolling('job-1', undefined), { wrapper })
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(getImportJobProgress).toHaveBeenCalledTimes(1)

    await act(async () => vi.advanceTimersByTimeAsync(5_000))

    expect(getImportJobProgress).toHaveBeenCalledTimes(2)
  })

  it('does not poll terminal jobs or run without a selection', async () => {
    vi.mocked(getImportJobProgress).mockResolvedValue({ job: { status: 'COMPLETED' } } as never)
    renderHook(() => useImportJobPolling('job-1', 'COMPLETED'), { wrapper })
    renderHook(() => useImportJobPolling(undefined, undefined), { wrapper })
    await act(async () => vi.advanceTimersByTimeAsync(10_000))

    expect(getImportJobProgress).toHaveBeenCalledTimes(1)
  })

  it('pauses while hidden and resumes when visible', async () => {
    setVisibility('hidden')
    renderHook(() => useImportJobPolling('job-1', 'PENDING'), { wrapper })
    await act(async () => vi.advanceTimersByTimeAsync(10_000))
    expect(getImportJobProgress).toHaveBeenCalledTimes(1)

    act(() => setVisibility('visible'))
    await act(async () => vi.advanceTimersByTimeAsync(5_000))

    expect(vi.mocked(getImportJobProgress).mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('removes the visibility listener on cleanup', () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const { unmount } = renderHook(() => useImportJobPolling('job-1', 'PARSING'), { wrapper })

    unmount()

    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  })
})
