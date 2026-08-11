import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createExtensionToken,
  listExtensionTokens,
  revokeExtensionToken,
} from '@/features/auth/extension-tokens/api/extensionTokensApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({
  apiClient: { delete: vi.fn(), get: vi.fn(), post: vi.fn() },
}))

describe('extensionTokensApi', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls the auth extension token endpoints', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: [] })
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: { token: 'lng_ext_raw' } })
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true, data: { id: 'token-1' } })

    await listExtensionTokens({ shopId: 'shop-1', environment: 'development' })
    await createExtensionToken({
      name: 'Dev PC',
      shopId: 'shop-1',
      environment: 'development',
      expiresAt: null,
    })
    await revokeExtensionToken('token-1')

    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/extension-tokens', {
      params: { shopId: 'shop-1', environment: 'development' },
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/extension-tokens', {
      name: 'Dev PC',
      shopId: 'shop-1',
      environment: 'development',
      expiresAt: null,
    })
    expect(apiClient.delete).toHaveBeenCalledWith('/api/auth/extension-tokens/token-1')
  })
})
