import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  getVendorIntegrationConfig,
  refreshVendorIntegrationCredential,
  updateVendorIntegrationConfig,
} from '@/features/portal/vendors/api/vendorApi'
import { VendorIntegrationModal } from '@/features/portal/vendors/pages/VendorIntegrationModal'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/portal/vendors/api/vendorApi', () => ({
  getVendorIntegrationConfig: vi.fn(),
  refreshVendorIntegrationCredential: vi.fn(),
  updateVendorIntegrationConfig: vi.fn(),
}))

describe('VendorIntegrationModal', () => {
  afterEach(() => {
    cleanup()
    queryClient.clear()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })
  it('shows configured flags and omits blank replacement secrets', async () => {
    i18n.addResourceBundle(
      'en',
      'common',
      {
        portal: {
          vendors: {
            accessTokenConfigured: 'Access token configured',
            baseUrl: 'Base URL',
            save: 'Save',
          },
        },
      },
      true,
      true,
    )
    await i18n.changeLanguage('en')
    vi.mocked(getVendorIntegrationConfig).mockResolvedValue({
      accessTokenConfigured: true,
      authType: 'API_KEY',
      baseUrl: 'https://vendor.example',
      expiresAt: null,
      id: 'integration-1',
      lastCheckedAt: null,
      lastError: null,
      metadata: {},
      passwordConfigured: false,
      providerKey: 'CUSTOM',
      refreshTokenConfigured: false,
      status: 'CONNECTED',
      usernameConfigured: false,
      vendorId: 'vendor-1',
    })
    vi.mocked(updateVendorIntegrationConfig).mockResolvedValue({} as never)

    render(
      <AppProviders>
        <VendorIntegrationModal open vendorId="vendor-1" onCancel={vi.fn()} onSaved={vi.fn()} />
      </AppProviders>,
    )

    expect(await screen.findByDisplayValue('https://vendor.example')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(updateVendorIntegrationConfig).toHaveBeenCalled())
    expect(vi.mocked(updateVendorIntegrationConfig).mock.calls[0][1]).not.toHaveProperty(
      'accessToken',
    )
    expect(JSON.stringify(vi.mocked(updateVendorIntegrationConfig).mock.calls)).not.toContain(
      'secret',
    )
  })

  it('uses a provider dropdown when setting up a missing integration', async () => {
    vi.mocked(getVendorIntegrationConfig).mockResolvedValue(null as never)
    render(
      <AppProviders>
        <VendorIntegrationModal open vendorId="vendor-1" onCancel={vi.fn()} onSaved={vi.fn()} />
      </AppProviders>,
    )

    expect(await screen.findByRole('combobox', { name: /Provider/ })).toBeInTheDocument()
  })

  it('drops hidden credentials after switching auth type and sends only entered active secrets', async () => {
    vi.mocked(getVendorIntegrationConfig).mockResolvedValue({
      accessTokenConfigured: false,
      authType: 'API_KEY',
      baseUrl: 'https://vendor.example',
      expiresAt: null,
      id: 'integration-1',
      lastCheckedAt: null,
      lastError: null,
      metadata: {},
      passwordConfigured: false,
      providerKey: 'PRINTWAY',
      refreshTokenConfigured: false,
      status: 'DISCONNECTED',
      usernameConfigured: false,
      vendorId: 'vendor-1',
    })
    vi.mocked(updateVendorIntegrationConfig).mockResolvedValue({} as never)
    render(
      <AppProviders>
        <VendorIntegrationModal open vendorId="vendor-1" onCancel={vi.fn()} onSaved={vi.fn()} />
      </AppProviders>,
    )
    fireEvent.change(await screen.findByLabelText('Access token'), {
      target: { value: 'old-api-secret' },
    })
    fireEvent.click(screen.getByRole('radio', { name: 'Login & Password' }))
    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'operator' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'new-secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updateVendorIntegrationConfig).toHaveBeenCalled())
    expect(vi.mocked(updateVendorIntegrationConfig).mock.calls[0][1]).toMatchObject({
      username: 'operator',
      password: 'new-secret',
    })
    expect(vi.mocked(updateVendorIntegrationConfig).mock.calls[0][1]).not.toHaveProperty(
      'accessToken',
    )
  })

  it('submits both active ACCESS_REFRESH credentials', async () => {
    vi.mocked(getVendorIntegrationConfig).mockResolvedValue({
      accessTokenConfigured: false,
      authType: 'ACCESS_REFRESH',
      baseUrl: 'https://vendor.example',
      expiresAt: null,
      id: 'integration-1',
      lastCheckedAt: null,
      lastError: null,
      metadata: {},
      passwordConfigured: false,
      providerKey: 'PRINTWAY',
      refreshTokenConfigured: false,
      status: 'DISCONNECTED',
      usernameConfigured: false,
      vendorId: 'vendor-1',
    })
    vi.mocked(updateVendorIntegrationConfig).mockResolvedValue({} as never)
    render(
      <AppProviders>
        <VendorIntegrationModal open vendorId="vendor-1" onCancel={vi.fn()} onSaved={vi.fn()} />
      </AppProviders>,
    )
    fireEvent.change(await screen.findByLabelText('Access token'), {
      target: { value: 'access-secret' },
    })
    fireEvent.change(screen.getByLabelText('Refresh token'), {
      target: { value: 'refresh-secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updateVendorIntegrationConfig).toHaveBeenCalled())
    expect(vi.mocked(updateVendorIntegrationConfig).mock.calls[0][1]).toMatchObject({
      accessToken: 'access-secret',
      authType: 'ACCESS_REFRESH',
      refreshToken: 'refresh-secret',
    })
  })

  it('renders every redacted status field and blocks refresh until a valid provider key is loaded', async () => {
    let resolveConfig!: (value: Awaited<ReturnType<typeof getVendorIntegrationConfig>>) => void
    vi.mocked(getVendorIntegrationConfig).mockReturnValue(
      new Promise((resolve) => {
        resolveConfig = resolve
      }),
    )
    render(
      <AppProviders>
        <VendorIntegrationModal open vendorId="vendor-1" onCancel={vi.fn()} onSaved={vi.fn()} />
      </AppProviders>,
    )
    expect(screen.queryByRole('button', { name: /Refresh credentials/ })).not.toBeInTheDocument()
    resolveConfig({
      accessTokenConfigured: true,
      authType: 'ACCESS_REFRESH',
      baseUrl: 'https://vendor.example',
      expiresAt: null,
      id: 'integration-1',
      lastCheckedAt: '2026-07-31T00:00:00Z',
      lastError: null,
      metadata: {},
      passwordConfigured: true,
      providerKey: 'PRINTWAY',
      refreshTokenConfigured: true,
      status: 'CONNECTED',
      usernameConfigured: true,
      vendorId: 'vendor-1',
    })
    expect((await screen.findAllByText('CONNECTED')).length).toBeGreaterThan(0)
    expect(await screen.findByText('2026-07-31T00:00:00Z')).toBeInTheDocument()
    expect(screen.getAllByText('Configured')).toHaveLength(4)
    expect(screen.getByRole('button', { name: /Test connection/ })).toBeEnabled()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(refreshVendorIntegrationCredential).mockResolvedValue({} as never)
    fireEvent.click(screen.getByRole('button', { name: /Test connection/ }))
    const confirm = (await screen.findAllByRole('dialog')).at(-1)!
    fireEvent.click(within(confirm).getByRole('button', { name: /Test connection/ }))
    await waitFor(() =>
      expect(refreshVendorIntegrationCredential).toHaveBeenCalledWith('vendor-1', {
        providerKey: 'PRINTWAY',
      }),
    )
  })

  it('recovers a failed config query and exposes refresh loading without leaking errors', async () => {
    const config = {
      accessTokenConfigured: false,
      authType: 'API_KEY' as const,
      baseUrl: 'https://vendor.example',
      expiresAt: null,
      id: 'integration-1',
      lastCheckedAt: null,
      lastError: null,
      metadata: {},
      passwordConfigured: false,
      providerKey: 'PRINTWAY',
      refreshTokenConfigured: false,
      status: 'CONNECTED' as const,
      usernameConfigured: false,
      vendorId: 'vendor-1',
    }
    vi.mocked(getVendorIntegrationConfig)
      .mockRejectedValueOnce(new Error('query-secret'))
      .mockResolvedValue(config)
    render(
      <AppProviders>
        <VendorIntegrationModal open vendorId="vendor-1" onCancel={vi.fn()} onSaved={vi.fn()} />
      </AppProviders>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /Try again|Retry/ }))
    expect(await screen.findByDisplayValue('https://vendor.example')).toBeInTheDocument()
    let rejectRefresh!: (error: Error) => void
    vi.mocked(refreshVendorIntegrationCredential).mockReturnValue(
      new Promise((_, reject) => {
        rejectRefresh = reject
      }),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const refresh = screen.getByRole('button', { name: /Test connection/ })
    fireEvent.click(refresh)
    const confirm = (await screen.findAllByRole('dialog')).at(-1)!
    fireEvent.click(within(confirm).getByRole('button', { name: /Test connection/ }))
    await waitFor(() => expect(refresh).toHaveClass('ant-btn-loading'))
    rejectRefresh(new Error('credential-secret'))
    await waitFor(() => expect(refresh).not.toHaveClass('ant-btn-loading'))
    expect(document.body.textContent).not.toContain('query-secret')
    expect(document.body.textContent).not.toContain('credential-secret')
  })
})
