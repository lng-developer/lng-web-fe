import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { AccessExplorerPage } from '@/features/auth/accounts/pages/AccessExplorerPage'
import { loadAccessAccounts } from '@/features/auth/api/accessExplorerApi'
import { setPermissions } from '@/shared/auth/session'
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
    setPermissions(['AUTH:READ', 'AUTH:WRITE'])
    await i18n.changeLanguage('vi')
    vi.mocked(loadAccessAccounts).mockResolvedValue(accounts)
  })

  it('opens the selected account in a right-hand inspector', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <AccessExplorerPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect((await screen.findAllByText('linh@lng.local'))[0]).toBeVisible()
    expect(screen.getByRole('heading', { level: 2, name: 'Tài khoản' })).toBeVisible()
    fireEvent.click(screen.getAllByText('linh@lng.local')[0])

    const inspector = await screen.findByRole('complementary', {
      name: 'Chi tiết tài khoản',
    })
    expect(inspector.parentElement).toContainElement(
      screen.getByRole('heading', { level: 2, name: 'Tài khoản' }),
    )
    expect(within(inspector).getByRole('heading', { name: 'linh@lng.local' })).toBeVisible()
    expect(
      within(inspector).queryByRole('button', { name: 'Quản lý quyền truy cập' }),
    ).not.toBeInTheDocument()

    fireEvent.click(within(inspector).getByRole('tab', { name: 'Quyền toàn cục' }))
    expect(within(inspector).getByRole('button', { name: 'Chỉnh quyền toàn cục' })).toBeVisible()

    fireEvent.click(within(inspector).getByRole('tab', { name: 'Thiết lập bảo mật' }))
    expect(within(inspector).getByRole('button', { name: 'Đặt lại mật khẩu' })).toBeVisible()
    expect(within(inspector).getByRole('button', { name: 'Thu hồi phiên đăng nhập' })).toBeVisible()
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

    expect((await screen.findAllByText('linh@lng.local'))[0]).toBeVisible()
  })
})
