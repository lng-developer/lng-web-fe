import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/media/mediaApi', () => ({ fetchMediaBlob: vi.fn() }))

import { AuthenticatedMediaImage, useAuthenticatedMediaUrl } from '@/shared/media'
import { fetchMediaBlob } from '@/shared/media/mediaApi'

describe('AuthenticatedMediaImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    let index = 0
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => `blob:preview-${++index}`),
      revokeObjectURL: vi.fn(),
    })
  })

  it('loads protected media as a blob URL and revokes replaced and unmounted URLs', async () => {
    vi.mocked(fetchMediaBlob)
      .mockResolvedValueOnce(new Blob(['first']))
      .mockResolvedValueOnce(new Blob(['second']))

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = render(
      <QueryClientProvider client={client}>
        <AuthenticatedMediaImage
          downloadUrl="/api/media/assets/a/download"
          alt="Protected preview"
          fallback="/fallback.svg"
        />
      </QueryClientProvider>,
    )

    await waitFor(() =>
      expect(screen.getByAltText('Protected preview')).toHaveAttribute('src', 'blob:preview-1'),
    )

    view.rerender(
      <QueryClientProvider client={client}>
        <AuthenticatedMediaImage
          downloadUrl="/api/media/assets/b/download"
          alt="Protected preview"
          fallback="/fallback.svg"
        />
      </QueryClientProvider>,
    )

    await waitFor(() =>
      expect(screen.getByAltText('Protected preview')).toHaveAttribute('src', 'blob:preview-2'),
    )
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')

    view.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-2')
  })

  it('aborts an obsolete request and keeps the fallback', () => {
    vi.mocked(fetchMediaBlob).mockReturnValue(new Promise(() => {}))

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = render(
      <QueryClientProvider client={client}>
        <AuthenticatedMediaImage
          downloadUrl="/api/media/assets/a/download"
          alt="Protected preview"
          fallback="/fallback.svg"
        />
      </QueryClientProvider>,
    )
    const firstSignal = vi.mocked(fetchMediaBlob).mock.calls[0]?.[1]

    view.rerender(
      <QueryClientProvider client={client}>
        <AuthenticatedMediaImage
          downloadUrl={null}
          alt="Protected preview"
          fallback="/fallback.svg"
        />
      </QueryClientProvider>,
    )

    expect(firstSignal?.aborted).toBe(true)
    expect(screen.getByAltText('Protected preview')).toHaveAttribute('src', '/fallback.svg')
  })

  it('keeps cached preview URLs alive through StrictMode cleanup and reopening', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const downloadUrl = '/api/media/assets/cached/download'
    client.setQueryData(['media-preview', downloadUrl], new Blob(['cached image']))
    for (let opening = 0; opening < 2; opening += 1) {
      const view = render(
        <StrictMode>
          <QueryClientProvider client={client}>
            <AuthenticatedMediaImage downloadUrl={downloadUrl} alt="Strict preview" />
          </QueryClientProvider>
        </StrictMode>,
      )
      await waitFor(() => {
        const src = screen.getByAltText('Strict preview').getAttribute('src')
        expect(src).toMatch(/^blob:/)
        expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(src)
      })
      const src = screen.getByAltText('Strict preview').getAttribute('src')
      view.unmount()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(src)
    }
    const created = vi.mocked(URL.createObjectURL).mock.results.map((result) => result.value)
    expect(
      vi
        .mocked(URL.revokeObjectURL)
        .mock.calls.map(([url]) => url)
        .sort(),
    ).toEqual(created.sort())
    client.clear()
  })

  it('reports failed media requests instead of staying in loading state', async () => {
    const error = new Error('Image unavailable')
    vi.mocked(fetchMediaBlob).mockRejectedValueOnce(error)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = renderHook(() => useAuthenticatedMediaUrl('/api/media/assets/failed/download'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await waitFor(() => expect(view.result.current.error).toBe(error))
    expect(view.result.current).toEqual({ url: null, loading: false, error })
    view.unmount()
    client.clear()
  })

  it('reuses a protected-media blob when the same image remounts', async () => {
    vi.mocked(fetchMediaBlob).mockResolvedValue(new Blob(['cached']))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = render(
      <QueryClientProvider client={client}>
        <AuthenticatedMediaImage
          downloadUrl="/api/media/assets/a/download"
          alt="Cached preview"
          fallback="/fallback.svg"
        />
      </QueryClientProvider>,
    )

    await waitFor(() =>
      expect(screen.getByAltText('Cached preview')).toHaveAttribute('src', 'blob:preview-1'),
    )
    view.unmount()
    render(
      <QueryClientProvider client={client}>
        <AuthenticatedMediaImage
          downloadUrl="/api/media/assets/a/download"
          alt="Cached preview"
          fallback="/fallback.svg"
        />
      </QueryClientProvider>,
    )

    await waitFor(() =>
      expect(screen.getByAltText('Cached preview')).toHaveAttribute('src', 'blob:preview-2'),
    )
    expect(fetchMediaBlob).toHaveBeenCalledTimes(1)
  })
})
