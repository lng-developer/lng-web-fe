import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/auth/api/authApi', () => ({
  restoreSession: vi.fn(),
}))

import { restoreSession } from '@/features/auth/api/authApi'
import {
  requirePasswordSetup,
  requireProfileSetup,
  requireWorkspace,
} from '@/features/auth/guards/accountSetupGuards'

const session = (mustChangePassword: boolean, profileSetupRequired = false) => ({
  accessToken: 'token',
  tokenType: 'Bearer' as const,
  account: { id: 'account-1', email: 'staff@lng.co', mustChangePassword },
  roles: [],
  permissions: [],
  scopes: [],
  profileSetupRequired,
})

async function redirectLocation(loader: () => Promise<unknown>) {
  try {
    await loader()
    return null
  } catch (error) {
    return (error as Response).headers.get('Location')
  }
}

describe('account setup guards', () => {
  it('requires Microsoft profile completion before initial LNG password setup', async () => {
    const state = {
      ...session(false, true),
      account: { ...session(false).account, passwordSetupRequired: true },
    }
    vi.mocked(restoreSession).mockResolvedValue(state)
    await expect(redirectLocation(requireWorkspace)).resolves.toBe('/setup/profile')
    vi.mocked(restoreSession).mockResolvedValue({ ...state, profileSetupRequired: false })
    await expect(redirectLocation(requireWorkspace)).resolves.toBe('/setup/password')
    await expect(redirectLocation(requireProfileSetup)).resolves.toBe('/setup/password')
  })
  beforeEach(() => vi.clearAllMocks())

  it('sends a provisioned account to password setup first', async () => {
    vi.mocked(restoreSession).mockResolvedValue(session(true))

    await expect(redirectLocation(requireWorkspace)).resolves.toBe('/setup/password')
  })

  it('sends an account with a changed password to profile setup', async () => {
    vi.mocked(restoreSession).mockResolvedValue(session(false, true))

    await expect(redirectLocation(requireWorkspace)).resolves.toBe('/setup/profile')
  })

  it('allows only the setup step currently required', async () => {
    vi.mocked(restoreSession).mockResolvedValue(session(true))
    await expect(requirePasswordSetup()).resolves.toMatchObject({
      account: { email: 'staff@lng.co' },
    })

    vi.mocked(restoreSession).mockResolvedValue(session(false, true))
    await expect(requireProfileSetup()).resolves.toMatchObject({ profileSetupRequired: true })
  })

  it('allows completed accounts into the workspace', async () => {
    vi.mocked(restoreSession).mockResolvedValue(session(false))

    await expect(requireWorkspace()).resolves.toMatchObject({ profileSetupRequired: false })
  })
})
