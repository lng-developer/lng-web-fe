import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { InteractiveImageViewerModal } from '@/shared/ui'

describe('InteractiveImageViewerModal', () => {
  it('uses the Ant Design image preview for the remaining gallery flows', () => {
    render(
      <AppProviders>
        <InteractiveImageViewerModal
          alt="Order artwork"
          imageUrl="https://example.com/artwork.png"
          open
          onClose={() => undefined}
        />
      </AppProviders>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'rotateLeft' })).toBeInTheDocument()
  })
})
