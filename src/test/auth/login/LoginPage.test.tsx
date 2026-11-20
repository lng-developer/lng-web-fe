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

  it('uses the Ecomatrix welcome heading in the authentication card', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LoginPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Welcome to Ecomatrix' })).toBeVisible()
  })

  it('places the Ecomatrix welcome heading inside the sign-in card', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LoginPage />
        </AppProviders>
      </MemoryRouter>,
    )

    const workspace = screen.getByRole('group', { name: 'Welcome to Ecomatrix' })

    expect(workspace).toContainElement(screen.getByText('Welcome to Ecomatrix'))
  })

  it('keeps the brand and workspace introduction inside the sign-in card', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LoginPage />
        </AppProviders>
      </MemoryRouter>,
    )

    const card = screen.getByText('Welcome to Ecomatrix').closest('.ant-card')

    expect(card).toContainElement(screen.getByRole('img', { name: 'Ecomatrix' }))
    expect(card).toContainElement(screen.getByRole('heading', { name: 'Welcome to Ecomatrix' }))
    expect(card).toContainElement(screen.getByText('Ecomatrix', { selector: 'span' }))
  })

  it('offers language and appearance switching before sign in', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LoginPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: /language/i })).toHaveTextContent('EN')
    expect(screen.getByRole('button', { name: /appearance/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
