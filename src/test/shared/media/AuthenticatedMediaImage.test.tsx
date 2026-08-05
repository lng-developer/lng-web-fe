import { render, screen, waitFor } from '@testing-library/react'
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

    const view = render(
      <AuthenticatedMediaImage
        downloadUrl="/api/media/assets/a/download"
        alt="Protected preview"
        fallback="/fallback.svg"
      />,
    )

    await waitFor(() =>
      expect(screen.getByAltText('Protected preview')).toHaveAttribute('src', 'blob:preview-1'),
    )

    view.rerender(
      <AuthenticatedMediaImage
        downloadUrl="/api/media/assets/b/download"
        alt="Protected preview"
        fallback="/fallback.svg"
      />,
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

    const view = render(
      <AuthenticatedMediaImage
        downloadUrl="/api/media/assets/a/download"
        alt="Protected preview"
        fallback="/fallback.svg"
      />,
    )
    const firstSignal = vi.mocked(fetchMediaBlob).mock.calls[0]?.[1]

    view.rerender(
      <AuthenticatedMediaImage
        downloadUrl={null}
        alt="Protected preview"
        fallback="/fallback.svg"
      />,
    )

    expect(firstSignal?.aborted).toBe(true)
    expect(screen.getByAltText('Protected preview')).toHaveAttribute('src', '/fallback.svg')
  })
})
