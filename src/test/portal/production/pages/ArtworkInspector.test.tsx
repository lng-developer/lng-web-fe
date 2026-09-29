import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { ArtworkInspector } from '@/features/portal/production/pages/ArtworkInspector'

vi.mock('@/shared/media', () => ({
  AuthenticatedMediaImage: ({ alt, downloadUrl }: { alt: string; downloadUrl: string }) => (
    <img alt={alt} src={downloadUrl} />
  ),
}))

describe('ArtworkInspector', () => {
  it('compares linked buyer artwork with output and never falls back to the main listing', () => {
    render(
      <AppProviders>
        <ArtworkInspector
          check={{
            id: 'front',
            slotKey: 'FRONT',
            slotLabel: 'Front',
            required: true,
            inputAssetDownloadUrl: null,
            outputAssetDownloadUrl: '/api/media/assets/scaled-output/download',
            outputStatus: 'SCALED',
            qcStatus: 'PENDING',
            note: null,
          }}
          originalInputUrl="/api/media/assets/buyer-upload/download"
          originalInputLabel="Customization artwork"
          listingReferenceUrl="https://example.test/main-listing.jpg"
          onClose={() => undefined}
          onPass={() => undefined}
          onReject={() => undefined}
        />
      </AppProviders>,
    )

    expect(screen.getByAltText(/Original/)).toHaveAttribute(
      'src',
      '/api/media/assets/buyer-upload/download',
    )
    expect(screen.getByText(/Customization artwork/)).toBeVisible()
    expect(screen.queryByRole('img', { name: 'Main listing reference' })).not.toBeInTheDocument()
  })
})
