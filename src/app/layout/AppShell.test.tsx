import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/router'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/auth/api/authApi', () => ({
  restoreSession: vi.fn().mockResolvedValue(undefined),
}))

describe('AppShell', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi')
  })

  it('renders desktop navigation and routed content', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/foundation'] })

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(
      await screen.findByRole('navigation', { name: 'Điều hướng chính' }, { timeout: 3_000 }),
    ).toBeVisible()
    expect(screen.getByRole('banner')).toBeVisible()
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible()
    expect(screen.getByText('Tài khoản').closest('a')).toHaveAttribute('href', '/auth/accounts')
  })
})
