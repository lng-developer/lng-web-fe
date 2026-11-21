import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/media/mediaApi', () => ({ fetchMediaBlob: vi.fn() }))

import { AppProviders } from '@/app/providers/AppProviders'
import { fetchMediaBlob } from '@/shared/media/mediaApi'
import { ZoomableImage } from '@/shared/ui'

describe('ZoomableImage', () => {
  let intersectCallback: ((entries: Partial<IntersectionObserverEntry>[]) => void) | null = null
  let observeSpy: ReturnType<typeof vi.fn>
  let disconnectSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    let index = 0
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => `blob:preview-${++index}`),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens the Ant Design image preview', () => {
    render(
      <AppProviders>
        <ZoomableImage alt="Product preview" src="https://example.com/product.png" width={48} />
      </AppProviders>,
    )

    fireEvent.click(screen.getByAltText('Product preview'))

    expect(screen.getByRole('dialog', { name: 'Product preview' })).toBeInTheDocument()
  })

  it('renders nothing when no image source is provided', () => {
    const { container } = render(
      <AppProviders>
        <ZoomableImage alt="Empty image" />
      </AppProviders>,
    )
    expect(container.querySelector('.ant-app')).toBeEmptyDOMElement()
  })

  it('defers fetching downloadUrl until scrolled into view with IntersectionObserver', async () => {
    observeSpy = vi.fn()
    disconnectSpy = vi.fn()

    class MockIntersectionObserver {
      constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
        intersectCallback = callback
      }
      observe = observeSpy
      unobserve = vi.fn()
      disconnect = disconnectSpy
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    vi.mocked(fetchMediaBlob).mockResolvedValueOnce(new Blob(['image data']))

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <ZoomableImage
          alt="Lazy download"
          downloadUrl="/api/media/assets/lazy-1/download"
          width={48}
        />
      </QueryClientProvider>,
    )

    expect(observeSpy).toHaveBeenCalledTimes(1)
    expect(fetchMediaBlob).not.toHaveBeenCalled()
    expect(screen.queryByAltText('Lazy download')).not.toBeInTheDocument()

    // Trigger intersection
    act(() => {
      intersectCallback?.([{ isIntersecting: true }])
    })

    await waitFor(() => {
      expect(fetchMediaBlob).toHaveBeenCalledWith(
        '/api/media/assets/lazy-1/download',
        expect.any(AbortSignal),
      )
    })

    await waitFor(() => {
      expect(screen.getByAltText('Lazy download')).toHaveAttribute('src', 'blob:preview-1')
    })
    expect(disconnectSpy).toHaveBeenCalled()
  })

  it('loads immediately without waiting for observer when lazy is false or loading is eager', async () => {
    observeSpy = vi.fn()
    disconnectSpy = vi.fn()

    class MockIntersectionObserver {
      observe = observeSpy
      unobserve = vi.fn()
      disconnect = disconnectSpy
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    vi.mocked(fetchMediaBlob).mockResolvedValueOnce(new Blob(['eager data']))

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <ZoomableImage
          alt="Eager download"
          downloadUrl="/api/media/assets/eager-1/download"
          loading="eager"
          width={48}
        />
      </QueryClientProvider>,
    )

    expect(observeSpy).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(fetchMediaBlob).toHaveBeenCalledWith(
        '/api/media/assets/eager-1/download',
        expect.any(AbortSignal),
      )
    })
    await waitFor(() => {
      expect(screen.getByAltText('Eager download')).toHaveAttribute('src', 'blob:preview-1')
    })
  })
})
