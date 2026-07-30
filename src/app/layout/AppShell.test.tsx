import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/router'

vi.mock('@/features/auth/authApi', () => ({ restoreSession: vi.fn().mockResolvedValue(undefined) }))

describe('AppShell', () => {
  it('renders desktop navigation and routed content', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/foundation'] })

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(await screen.findByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible()
    expect(screen.getByRole('banner')).toBeVisible()
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
