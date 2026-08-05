import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createScope,
  deactivateScope,
  loadScopes,
  updateScope,
} from '@/features/auth/scopes/api/scopesApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({
  apiClient: { delete: vi.fn(), get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}))

describe('scopesApi', () => {
  beforeEach(() => {
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { items: [], total: 0 } })
    vi.mocked(apiClient.patch).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: {} })
  })

  it('uses the scope registry endpoints', async () => {
    await loadScopes()
    await createScope({
      name: 'Operations',
      scopeId: '507f1f77bcf86cd799439011',
      scopeType: 'DEPARTMENT',
    })
    await updateScope('scope-1', { name: 'Operations team' })
    await deactivateScope('scope-1')

    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/scopes', { params: { limit: 100 } })
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/scopes', {
      name: 'Operations',
      scopeId: '507f1f77bcf86cd799439011',
      scopeType: 'DEPARTMENT',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/auth/scopes/scope-1', {
      name: 'Operations team',
    })
    expect(apiClient.delete).toHaveBeenCalledWith('/api/auth/scopes/scope-1')
  })
})
