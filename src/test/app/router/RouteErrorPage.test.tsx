import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { RouteErrorPage } from '@/app/router/RouteErrorPage'

describe('RouteErrorPage', () => {
  it('returns authenticated users to Foundation', () => {
    render(
      <AppProviders>
        <RouteErrorPage />
      </AppProviders>,
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '/foundation')
  })
})
