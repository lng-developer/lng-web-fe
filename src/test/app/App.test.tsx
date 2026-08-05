import { createMemoryRouter, Navigate, type RouteObject, RouterProvider } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/app/layout/AppShell'
import { AppProviders } from '@/app/providers/AppProviders'
import { NotFoundPage } from '@/app/router/NotFoundPage'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { FoundationPage } from '@/features/foundation/FoundationPage'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/foundation/FoundationPage', async () => {
  const { useTranslation } = await import('react-i18next')

  return {
    FoundationPage: () => {
      const { t } = useTranslation()
      return <h1>{t('foundation.title')}</h1>
    },
  }
})

const account: CurrentAccount = {
  account: { id: 'account-1', email: 'admin@lng.co', mustChangePassword: false },
  roles: [],
  permissions: [],
  scopes: [],
  profileSetupRequired: false,
}

const smokeRoutes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    loader: () => account,
    children: [
      { index: true, element: <Navigate to="/foundation" replace /> },
      { path: 'foundation', element: <FoundationPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]

function renderRoute(path: string) {
  const router = createMemoryRouter(smokeRoutes, { initialEntries: [path] })
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('application shell', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('vi')
  })

  it('renders the shell route and switches language without feature internals', async () => {
    renderRoute('/foundation')

    expect(await screen.findByRole('heading', { name: 'Foundation đã sẵn sàng' })).toBeVisible()
    expect(i18n.resolvedLanguage).toBe('vi')
    fireEvent.click(screen.getByText('EN'))
    expect(await screen.findByRole('heading', { name: 'Foundation is ready' })).toBeVisible()
    expect(i18n.resolvedLanguage).toBe('en')
  })

  it('renders a localized not-found route with a home action', () => {
    renderRoute('/missing')

    const homeLink = screen
      .getAllByRole('link')
      .find((link) => link.getAttribute('href') === '/foundation')
    expect(homeLink).toBeDefined()
    expect(homeLink).toHaveAttribute('href', '/foundation')
    expect(homeLink!.closest('button')).toBeNull()
  })

  it('opens Foundation from the workspace root after session restoration', async () => {
    await i18n.changeLanguage('en')
    renderRoute('/')

    expect(await screen.findByRole('heading', { name: 'Foundation is ready' })).toBeVisible()
  })
})
