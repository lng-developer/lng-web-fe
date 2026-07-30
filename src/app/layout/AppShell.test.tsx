import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/router'

describe('AppShell', () => {
  it('renders desktop navigation and routed content', () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/foundation'] })

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible()
    expect(screen.getByRole('banner')).toBeVisible()
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
