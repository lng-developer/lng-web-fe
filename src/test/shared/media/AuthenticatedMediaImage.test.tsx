import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/media/mediaApi', () => ({ fetchMediaBlob: vi.fn() }))

import { AuthenticatedMediaImage } from '@/shared/media'
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

  it('renders nothing when protected media is unavailable and no fallback was provided', async () => {
    vi.mocked(fetchMediaBlob).mockRejectedValue(new Error('Media not found'))

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <AuthenticatedMediaImage
          downloadUrl="/api/media/assets/missing/download"
          alt="Unavailable preview"
        />
      </QueryClientProvider>,
    )

    await waitFor(() =>
      expect(screen.queryByAltText('Unavailable preview')).not.toBeInTheDocument(),
    )
  })

  it('removes a preview when the browser cannot render the media', async () => {
    vi.mocked(fetchMediaBlob).mockResolvedValue(new Blob(['not-an-image']))

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <AuthenticatedMediaImage
          downloadUrl="/api/media/assets/invalid/download"
          alt="Invalid preview"
        />
      </QueryClientProvider>,
    )

    const preview = await screen.findByAltText('Invalid preview')
    preview.dispatchEvent(new Event('error'))

    await waitFor(() => expect(screen.queryByAltText('Invalid preview')).not.toBeInTheDocument())
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
