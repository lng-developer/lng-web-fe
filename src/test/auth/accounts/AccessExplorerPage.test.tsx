import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { AccessExplorerPage } from '@/features/auth/accounts/pages/AccessExplorerPage'
import { loadAccessAccounts } from '@/features/auth/api/accessExplorerApi'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/auth/api/accessExplorerApi', () => ({ loadAccessAccounts: vi.fn() }))

describe('AccessExplorerPage', () => {
  const accounts = {
    items: [
      { id: 'account-1', email: 'linh@lng.local', status: 'active', roles: ['REVIEWER'] },
      { id: 'account-2', email: 'minh@lng.local', status: 'inactive', roles: [] },
      { id: 'account-3', email: 'hoa@lng.local', status: 'active' },
    ],
    total: 3,
  }

  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  beforeEach(async () => {
    queryClient.clear()
    await i18n.changeLanguage('vi')
    vi.mocked(loadAccessAccounts).mockResolvedValue(accounts)
  })

  it('renders an account directory with a clear access-management entry point', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <AccessExplorerPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText('linh@lng.local')).toBeVisible()
    expect(screen.getByRole('heading', { level: 2, name: 'Tài khoản' })).toBeVisible()
    expect(
      screen.getAllByRole('link', {
        name: new RegExp(i18n.t('auth.accessExplorer.manageAccess'), 'i'),
      })[0],
    ).toHaveAttribute('href', '/auth/accounts/account-1/access')
    expect(screen.getByText('Tổng tài khoản')).toBeVisible()
    expect(screen.getByText('Đang hoạt động')).toBeVisible()
    expect(screen.getAllByText('Chưa có vai trò')[0]).toBeVisible()
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  }, 10_000)

  it('retries account loading after a failed request', async () => {
    vi.mocked(loadAccessAccounts).mockReset()
    vi.mocked(loadAccessAccounts)
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue(accounts)

    render(
      <MemoryRouter>
        <AppProviders>
          <AccessExplorerPage />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }, { timeout: 3_000 }))

    expect(await screen.findByText('linh@lng.local')).toBeVisible()
  })
})
