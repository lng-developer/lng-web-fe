import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn() } }))

import { loadAccessAccounts, loadAccessExplorer } from '@/features/auth/api/accessExplorerApi'
import { apiClient } from '@/shared/api'

describe('loadAccessExplorer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the selected account and its access sources', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        success: true,
        data: { items: [{ id: 'account-1', email: 'linh@lng.local' }], total: 1 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { account: { id: 'account-1', email: 'linh@lng.local' } },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { items: [{ id: 'assignment-1', accountId: 'account-1' }], total: 1 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { items: [{ id: 'role-1', code: 'REVIEWER' }], total: 1 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { items: [{ id: 'permission-1', code: 'DESIGN:REVIEW' }], total: 1 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { items: [{ id: 'scope-1', name: 'Design' }], total: 1 },
      })
      .mockResolvedValueOnce({ success: true, data: { items: [], total: 0 } })

    const result = await loadAccessExplorer('account-1')

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/auth/accounts', {
      params: { limit: 50 },
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/auth/accounts/account-1')
    expect(apiClient.get).toHaveBeenNthCalledWith(3, '/api/auth/access-assignments', {
      params: { accountId: 'account-1', limit: 100 },
    })
    expect(result.account.account.email).toBe('linh@lng.local')
    expect(result.permissions.items[0]?.code).toBe('DESIGN:REVIEW')
  })

  it('uses the first account when no account is selected yet', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        success: true,
        data: { items: [{ id: 'account-1', email: 'linh@lng.local' }], total: 1 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { account: { id: 'account-1', email: 'linh@lng.local' } },
      })
      .mockResolvedValue({ success: true, data: { items: [], total: 0 } })

    await loadAccessExplorer()

    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/auth/accounts/account-1')
  })

  it('loads only the account directory when details are not needed', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ success: true, data: { items: [], total: 0 } })

    await loadAccessAccounts()

    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/accounts', { params: { limit: 100 } })
  })
})
