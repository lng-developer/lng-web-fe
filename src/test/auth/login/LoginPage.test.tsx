import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { LoginPage } from '@/features/auth/login/pages/LoginPage'
import i18n from '@/shared/i18n/i18n'
import { LANGUAGE_STORAGE_KEY } from '@/shared/i18n/i18n'

describe('LoginPage', () => {
  beforeEach(async () => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY)
    await i18n.changeLanguage('en')
  })

  afterEach(cleanup)

  it('renders credentials fields and a login action', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LoginPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByLabelText(/email|mã/i)).toBeVisible()
    expect(screen.getByLabelText(/password|mật khẩu/i)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Login' })).toBeVisible()
  })

  it('offers the standard login controls from the authentication screen', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LoginPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByText(/remember me/i)).toBeVisible()
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeVisible()
  })

  it('uses the LNG welcome heading in the authentication card', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LoginPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Welcome to LNG' })).toBeVisible()
  })

  it('places the LNG welcome heading inside the sign-in card', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LoginPage />
        </AppProviders>
      </MemoryRouter>,
    )

    const workspace = screen.getByRole('group', { name: 'Welcome to LNG' })

    expect(workspace).toContainElement(screen.getByText('Welcome to LNG'))
  })

  it('keeps the brand and workspace introduction inside the sign-in card', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LoginPage />
        </AppProviders>
      </MemoryRouter>,
    )

    const card = screen.getByText('Welcome to LNG').closest('.ant-card')

    expect(card).toContainElement(screen.getByRole('img', { name: 'LNG Web' }))
    expect(card).toContainElement(screen.getByRole('heading', { name: 'Welcome to LNG' }))
  })

  it('offers language and appearance switching before sign in', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LoginPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByRole('radiogroup', { name: /language/i })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'EN' })).toBeChecked()
    expect(screen.getByRole('radiogroup', { name: /appearance/i })).toBeVisible()
  })
})
