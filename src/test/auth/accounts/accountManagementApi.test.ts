import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  archiveAccount,
  loadAccount,
  resetAccountPassword,
  revokeAccountSessions,
  updateAccountEmail,
  updateAccountStatus,
} from '@/features/auth/accounts/api/accountManagementApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({
  apiClient: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}))

describe('accountManagementApi', () => {
  beforeEach(() => {
    vi.mocked(apiClient.patch).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: { account: { id: 'account-1' } },
    })
  })

  it('sends account lifecycle mutations to the Auth module', async () => {
    await updateAccountEmail('account-1', 'linh@lng.local')
    await updateAccountStatus('account-1', 'inactive')
    await resetAccountPassword('account-1', 'new-password')
    await revokeAccountSessions('account-1')
    await archiveAccount('account-1')

    expect(apiClient.patch).toHaveBeenCalledWith('/api/auth/accounts/account-1/email', {
      email: 'linh@lng.local',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/auth/accounts/account-1/status', {
      status: 'inactive',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/auth/accounts/account-1/password', {
      password: 'new-password',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/accounts/account-1/revoke-sessions')
    expect(apiClient.delete).toHaveBeenCalledWith('/api/auth/accounts/account-1')
  })

  it('loads one account without fetching the access-editor catalogs', async () => {
    await loadAccount('account-1')

    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/accounts/account-1')
  })
})
