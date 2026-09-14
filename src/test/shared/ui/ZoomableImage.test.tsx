import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { ZoomableImage } from '@/shared/ui'

describe('ZoomableImage', () => {
  it('opens the Ant Design image preview', () => {
    render(
      <AppProviders>
        <ZoomableImage alt="Product preview" src="https://example.com/product.png" width={48} />
      </AppProviders>,
    )

    fireEvent.click(screen.getByAltText('Product preview'))

    expect(screen.getByRole('dialog', { name: 'Product preview' })).toBeInTheDocument()
  })
})
