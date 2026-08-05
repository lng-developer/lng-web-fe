import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  loadAccount,
  resetAccountPassword,
} from '@/features/auth/accounts/api/accountManagementApi'
import { AccountSecurityPage } from '@/features/auth/accounts/pages/AccountSecurityPage'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/auth/accounts/api/accountManagementApi', () => ({
  archiveAccount: vi.fn(),
  loadAccount: vi.fn(),
  resetAccountPassword: vi.fn(),
  revokeAccountSessions: vi.fn(),
  updateAccountStatus: vi.fn(),
}))

describe('AccountSecurityPage', () => {
  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  beforeEach(async () => {
    queryClient.clear()
    await i18n.changeLanguage('en')
    vi.mocked(loadAccount).mockResolvedValue({
      account: { email: 'linh@lng.local', id: 'account-1', status: 'active' },
    })
    vi.mocked(resetAccountPassword).mockResolvedValue({})
  })

  it('resets a password from the separate security workspace', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/accounts/account-1/security']}>
        <AppProviders>
          <Routes>
            <Route path="/auth/accounts/:accountId/security" element={<AccountSecurityPage />} />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Security' })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    await waitFor(() =>
      expect(resetAccountPassword).toHaveBeenCalledWith('account-1', 'new-password'),
    )
  })
})
