import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/router'
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

vi.mock('@/features/auth/api/authApi', () => ({
  restoreSession: vi.fn().mockResolvedValue({
    accessToken: 'token',
    tokenType: 'Bearer',
    account: { id: 'account-1', email: 'admin@lng.co', mustChangePassword: false },
    roles: [],
    permissions: [],
  }),
  getCurrentAccount: vi.fn().mockResolvedValue({ profileSetupRequired: false }),
}))

function renderRoute(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
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

    expect(await screen.findByLabelText('LNG Web')).toBeVisible()
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

  it('lazy-loads business routes while keeping the foundation static', () => {
    const workspace = appRoutes.find((route) => route.children)
    const childByPath = new Map(workspace?.children?.map((route) => [route.path, route]))

    for (const path of ['auth/accounts', 'auth/access-control', 'organization', 'hr']) {
      expect(childByPath.get(path)?.lazy).toBeTypeOf('function')
      expect(childByPath.get(path)?.element).toBeUndefined()
    }
    expect(childByPath.get('foundation')?.element).toBeDefined()
  })
})
