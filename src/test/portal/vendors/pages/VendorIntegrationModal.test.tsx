import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  deleteVendorIntegrationConfig,
  getLenfulOrder,
  getVendorIntegrationConfig,
  testVendorIntegrationConnection,
  updateVendorIntegrationConfig,
} from '@/features/portal/vendors/api/vendorApi'
import { VendorIntegrationModal } from '@/features/portal/vendors/pages/VendorIntegrationModal'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/portal/vendors/api/vendorApi', () => ({
  getVendorIntegrationConfig: vi.fn(),
  deleteVendorIntegrationConfig: vi.fn(),
  getLenfulOrder: vi.fn(),
  testVendorIntegrationConnection: vi.fn(),
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
    expect(vi.mocked(updateVendorIntegrationConfig).mock.calls[0][1]).toMatchObject({
      mode: 'GENERIC_API',
      adapterKey: null,
    })
    expect(vi.mocked(updateVendorIntegrationConfig).mock.calls[0][1]).not.toHaveProperty(
      'accessToken',
    )
    expect(JSON.stringify(vi.mocked(updateVendorIntegrationConfig).mock.calls)).not.toContain(
      'secret',
    )
  })

  it('looks up a Lenful order only when the operator searches', async () => {
    vi.mocked(getVendorIntegrationConfig).mockResolvedValue({
      accessTokenConfigured: true,
      authType: 'LOGIN_PASSWORD',
      baseUrl: 'https://s-lencam.lenful.com/api',
      expiresAt: null,
      id: 'integration-1',
      lastCheckedAt: null,
      lastError: null,
      metadata: {},
      passwordConfigured: true,
      providerKey: 'LENFUL',
      refreshTokenConfigured: false,
      status: 'CONNECTED',
      usernameConfigured: true,
      vendorId: 'vendor-1',
    })
    vi.mocked(getLenfulOrder).mockResolvedValue({
      createdAt: '2026-09-12T00:00:00.000Z',
      currency: 'USD',
      id: 'order-1',
      items: [
        {
          fulfillment: 'POD',
          id: 'item-1',
          productId: 'product-1',
          productName: 'Acrylic shirt',
          quantity: 2,
          status: 'NEW',
          variant: { id: 'variant-1', name: 'Blue / L', sku: 'SHIRT-BL-L' },
        },
      ],
      orderNumber: 'LF-100',
      paymentStatus: 'PAID',
      shippingMethod: { description: 'Standard', name: 'Economy', price: 5 },
      shortId: 'LF100',
      status: 'PROCESSING',
      totalItems: 2,
      totalPrice: 25,
    })
    render(
      <AppProviders>
        <VendorIntegrationModal open vendorId="vendor-1" onCancel={vi.fn()} onSaved={vi.fn()} />
      </AppProviders>,
    )

    expect(await screen.findByText('Order lookup')).toBeInTheDocument()
    expect(getLenfulOrder).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Order lookup'))
    fireEvent.change(await screen.findByLabelText('Order number'), { target: { value: 'LF-100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(getLenfulOrder).toHaveBeenCalledWith('vendor-1', 'LF-100'))
    expect(await screen.findByText('Acrylic shirt')).toBeInTheDocument()
    expect(screen.getByText('SHIRT-BL-L')).toBeInTheDocument()
  })

  it('submits Merchfox API key and secret instead of an access token', async () => {
    vi.mocked(getVendorIntegrationConfig).mockResolvedValue({
      accessTokenConfigured: false,
      apiKeyConfigured: false,
      apiSecretConfigured: false,
      authType: 'API_KEY',
      baseUrl: 'https://api.merchfox.example',
      expiresAt: null,
      id: 'integration-1',
      lastCheckedAt: null,
      lastError: null,
      metadata: {},
      passwordConfigured: false,
      providerKey: 'MERCHFOX',
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

    fireEvent.change(await screen.findByLabelText('API key'), { target: { value: 'app-key' } })
    fireEvent.change(screen.getByLabelText('API secret'), { target: { value: 'app-secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updateVendorIntegrationConfig).toHaveBeenCalled())
    expect(vi.mocked(updateVendorIntegrationConfig).mock.calls[0][1]).toMatchObject({
      apiKey: 'app-key',
      apiSecret: 'app-secret',
    })
    expect(vi.mocked(updateVendorIntegrationConfig).mock.calls[0][1]).not.toHaveProperty('accessToken')
  })

  it('defaults to manual mode and reveals connection fields only for an explicit mode', async () => {
    vi.mocked(getVendorIntegrationConfig).mockResolvedValue(null as never)
    render(
      <AppProviders>
        <VendorIntegrationModal open vendorId="vendor-1" onCancel={vi.fn()} onSaved={vi.fn()} />
      </AppProviders>,
    )

    expect(await screen.findByText('Manual')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /Provider/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Base URL')).not.toBeInTheDocument()

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Integration mode/ }))
    fireEvent.click(await screen.findByText('Generic API'))
    expect(screen.queryByRole('combobox', { name: /Provider/ })).not.toBeInTheDocument()
    expect(await screen.findByLabelText('Base URL')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Integration mode/ }))
    fireEvent.click(await screen.findByText('Native integration'))
    expect(await screen.findByRole('combobox', { name: /Provider/ })).toBeInTheDocument()
  })

  it('closes a dirty integration form without a discard confirmation', async () => {
    vi.mocked(getVendorIntegrationConfig).mockResolvedValue(null as never)
    const onCancel = vi.fn()
    render(
      <AppProviders>
        <VendorIntegrationModal open vendorId="vendor-1" onCancel={onCancel} onSaved={vi.fn()} />
      </AppProviders>,
    )

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Integration mode/ }))
    fireEvent.click(await screen.findByText('Native integration'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument()
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

  it('deletes an existing integration when switched to manual mode', async () => {
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
      providerKey: 'PRINTWAY',
      refreshTokenConfigured: false,
      status: 'DISCONNECTED',
      usernameConfigured: false,
      vendorId: 'vendor-1',
    })
    vi.mocked(deleteVendorIntegrationConfig).mockResolvedValue({ deleted: true })
    const onCancel = vi.fn()
    render(
      <AppProviders>
        <VendorIntegrationModal open vendorId="vendor-1" onCancel={onCancel} onSaved={vi.fn()} />
      </AppProviders>,
    )

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Integration mode/ }))
    fireEvent.click(await screen.findByText('Manual'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(deleteVendorIntegrationConfig).toHaveBeenCalledWith('vendor-1'))
    expect(onCancel).toHaveBeenCalled()
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

  it('renders every redacted status field and tests connection after a valid provider key is loaded', async () => {
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
    vi.mocked(testVendorIntegrationConnection).mockResolvedValue({} as never)
    fireEvent.click(screen.getByRole('button', { name: /Test connection/ }))
    await waitFor(() =>
      expect(testVendorIntegrationConnection).toHaveBeenCalledWith('vendor-1'),
    )
    expect(screen.queryByText('Test the provider connection now?')).not.toBeInTheDocument()
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
    vi.mocked(testVendorIntegrationConnection).mockReturnValue(
      new Promise((_, reject) => {
        rejectRefresh = reject
      }),
    )
    const refresh = screen.getByRole('button', { name: /Test connection/ })
    fireEvent.click(refresh)
    await waitFor(() => expect(refresh).toHaveClass('ant-btn-loading'))
    rejectRefresh(new Error('credential-secret'))
    await waitFor(() => expect(refresh).not.toHaveClass('ant-btn-loading'))
    expect(document.body.textContent).not.toContain('query-secret')
    expect(document.body.textContent).not.toContain('credential-secret')
  })
})
