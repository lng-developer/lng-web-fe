import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { loadAccount, updateAccountEmail } from '@/features/auth/accounts/api/accountManagementApi'
import { AccountDetailPage } from '@/features/auth/accounts/pages/AccountDetailPage'
import { setPermissions } from '@/shared/auth/session'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/auth/accounts/api/accountManagementApi', () => ({
  loadAccount: vi.fn(),
  updateAccountEmail: vi.fn(),
  updateAccountStatus: vi.fn(),
}))

describe('AccountDetailPage', () => {
  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  beforeEach(async () => {
    queryClient.clear()
    setPermissions(['AUTH:READ', 'AUTH:WRITE'])
    await i18n.changeLanguage('en')
    vi.mocked(loadAccount).mockResolvedValue({
      account: { email: 'linh@lng.local', id: 'account-1', status: 'active' },
    })
    vi.mocked(updateAccountEmail).mockResolvedValue({})
  })

  it('keeps account details separate from access and security workspaces', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/accounts/account-1']}>
        <AppProviders>
          <Routes>
            <Route path="/auth/accounts/:accountId" element={<AccountDetailPage />} />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByDisplayValue('linh@lng.local')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Manage access' })).toHaveAttribute(
      'href',
      '/auth/accounts/account-1/access',
    )
    expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute(
      'href',
      '/auth/accounts/account-1/security',
    )
  })

  it('updates the account email from the account detail workspace', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/accounts/account-1']}>
        <AppProviders>
          <Routes>
            <Route path="/auth/accounts/:accountId" element={<AccountDetailPage />} />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    )

    await screen.findByDisplayValue('linh@lng.local')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@lng.local' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save email' }))

    await waitFor(() =>
      expect(updateAccountEmail).toHaveBeenCalledWith('account-1', 'new@lng.local'),
    )
  })
})
