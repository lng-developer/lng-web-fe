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

  it('renders credentials fields and a sign-in action', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LoginPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByLabelText(/email|mã/i)).toBeVisible()
    expect(screen.getByLabelText(/password|mật khẩu/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /sign in|đăng nhập/i })).toBeVisible()
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
