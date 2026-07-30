import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { LoginPage } from '@/features/auth/login/pages/LoginPage'

describe('LoginPage', () => {
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
})
