import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  broadcastResponseToMainFrame: vi.fn(),
}))

vi.mock('@azure/msal-browser/redirect-bridge', () => ({
  broadcastResponseToMainFrame: mocks.broadcastResponseToMainFrame,
}))

describe('Microsoft popup redirect bridge', () => {
  it('relays the response from the dedicated popup callback page', async () => {
    mocks.broadcastResponseToMainFrame.mockReset().mockResolvedValue(undefined)
    const { relayMicrosoftPopupResponse } =
      await import('@/features/auth/microsoft/popupRedirectBridge')

    await relayMicrosoftPopupResponse()

    expect(mocks.broadcastResponseToMainFrame).toHaveBeenCalledOnce()
  })
})
