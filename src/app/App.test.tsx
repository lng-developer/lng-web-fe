import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/shared/i18n/i18n'

import { AppProviders } from './providers/AppProviders'
import { appRoutes } from './router/router'

vi.mock('@/features/foundation/FoundationPage', async () => {
  const { useTranslation } = await import('react-i18next')

  return {
    FoundationPage: () => {
      const { t } = useTranslation()
      return <h1>{t('foundation.title')}</h1>
    },
  }
})

function renderRoute(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('application shell', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('vi')
  })

  it('renders the shell route and switches language without feature internals', async () => {
    renderRoute('/')

    expect(screen.getByLabelText('LNG Web')).toBeVisible()
    expect(i18n.resolvedLanguage).toBe('vi')
    fireEvent.click(screen.getByText('EN'))
    expect(await screen.findByRole('heading', { name: 'Foundation is ready' })).toBeVisible()
    expect(i18n.resolvedLanguage).toBe('en')
  })

  it('renders a localized not-found route with a home action', () => {
    renderRoute('/missing')

    const homeLink = screen.getAllByRole('link').find((link) => link.getAttribute('href') === '/')
    expect(homeLink).toBeDefined()
    expect(homeLink).toHaveAttribute('href', '/')
    expect(homeLink!.closest('button')).toBeNull()
  })
})
