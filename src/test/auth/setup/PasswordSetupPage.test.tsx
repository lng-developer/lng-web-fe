import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/auth/api/authApi', () => ({
  changeOwnPassword: vi.fn(),
  setInitialPassword: vi.fn(),
  login: vi.fn(),
}))

import { changeOwnPassword, login, setInitialPassword } from '@/features/auth/api/authApi'
import { setAccount } from '@/shared/auth/session'
import { PasswordSetupPage } from '@/features/auth/setup/pages/PasswordSetupPage'
import i18n from '@/shared/i18n/i18n'

describe('PasswordSetupPage', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    vi.clearAllMocks()
    setAccount(null)
    await i18n.changeLanguage('en')
  })

  it('creates an LNG password for Microsoft users without asking for their Microsoft password', async () => {
    setAccount({ id: 'account-1', email: 'staff@lngwork.co', passwordSetupRequired: true })
    vi.mocked(setInitialPassword).mockResolvedValue({
      id: 'account-1',
      email: 'staff@lngwork.co',
      mustChangePassword: false,
    })
    vi.mocked(login).mockResolvedValue({
      accessToken: 'new',
      tokenType: 'Bearer',
      account: { id: 'account-1', email: 'staff@lngwork.co', mustChangePassword: false },
      roles: [],
      permissions: [],
    })
    render(
      <MemoryRouter initialEntries={['/setup/password']}>
        <Routes>
          <Route path="/setup/password" element={<PasswordSetupPage />} />
          <Route path="/operations-dashboard" element={<h1>Workspace reached</h1>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'LNG-password-123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'LNG-password-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('heading', { name: 'Workspace reached' })).toBeVisible()
    expect(setInitialPassword).toHaveBeenCalledWith('LNG-password-123')
    expect(changeOwnPassword).not.toHaveBeenCalled()
    expect(login).toHaveBeenCalledWith('staff@lngwork.co', 'LNG-password-123')
  })

  it('changes the temporary password, renews the session, and continues to profile setup', async () => {
    vi.mocked(changeOwnPassword).mockResolvedValue({
      id: 'account-1',
      email: 'staff@lng.co',
      mustChangePassword: false,
    })
    vi.mocked(login).mockResolvedValue({
      accessToken: 'new-token',
      tokenType: 'Bearer',
      account: { id: 'account-1', email: 'staff@lng.co', mustChangePassword: false },
      roles: [],
      permissions: [],
    })

    render(
      <MemoryRouter initialEntries={['/setup/password']}>
        <Routes>
          <Route path="/setup/password" element={<PasswordSetupPage />} />
          <Route path="/setup/profile" element={<h1>Profile setup reached</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(changeOwnPassword).toHaveBeenCalledWith('123456', 'new-password'))
    expect(login).toHaveBeenCalledWith('staff@lng.co', 'new-password')
    expect(await screen.findByRole('heading', { name: 'Profile setup reached' })).toBeVisible()
  })

  it('returns to login when session renewal fails after the password was changed', async () => {
    vi.mocked(changeOwnPassword).mockResolvedValue({
      id: 'account-1',
      email: 'staff@lng.co',
      mustChangePassword: false,
    })
    vi.mocked(login).mockRejectedValue(new Error('Network error'))

    render(
      <MemoryRouter initialEntries={['/setup/password']}>
        <Routes>
          <Route path="/setup/password" element={<PasswordSetupPage />} />
          <Route path="/login" element={<h1>Login reached</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { name: 'Login reached' })).toBeVisible()
  })
})
