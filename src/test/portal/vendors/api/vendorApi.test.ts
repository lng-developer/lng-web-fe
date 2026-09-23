import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}))

import {
  createVendor,
  createVendorCostCenter,
  createVendorProduct,
  importVendorTemplate,
  getVendorIntegrationConfig,
  listVendorCostCenters,
  listVendorProducts,
  listVendors,
  refreshVendorIntegrationCredential,
  updateVendor,
  updateVendorCostCenter,
  updateVendorIntegrationConfig,
  updateVendorProduct,
} from '@/features/portal/vendors/api/vendorApi'
import { apiClient } from '@/shared/api'

describe('vendorApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [], pagination: {} } })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
  })

  it('uses the Vendor master-data contracts', async () => {
    const integration = {
      authType: 'API_KEY' as const,
      baseUrl: 'https://vendor.example',
      providerKey: 'CUSTOM',
    }

    await listVendors({ limit: 20, page: 1, q: 'print' })
    await createVendor({ code: 'VENDOR', fulfillmentType: 'POD', name: 'Vendor' })
    await updateVendor('vendor-1', { name: 'Updated vendor' })
    await listVendorProducts({ limit: 20, page: 1, q: 'shirt', vendorId: 'vendor-1' })
    await createVendorProduct({
      code: 'SHIRT',
      name: 'Shirt',
      productTypeGroupId: 'group-1',
      vendorId: 'vendor-1',
    })
    await updateVendorProduct('product-1', { name: 'Updated shirt' })
    await listVendorCostCenters('product-1', { limit: 20, page: 1, q: 'XL' })
    await createVendorCostCenter('product-1', { code: 'XL', name: 'XL' })
    await updateVendorCostCenter('product-1', 'cost-center-1', { name: 'Updated XL' })
    await getVendorIntegrationConfig('vendor-1')
    await updateVendorIntegrationConfig('vendor-1', integration)
    await refreshVendorIntegrationCredential('vendor-1', { providerKey: 'CUSTOM' })

    expect(apiClient.get).toHaveBeenCalledWith('/api/vendors/products', {
      params: { vendorId: 'vendor-1', page: 1, limit: 20, q: 'shirt' },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/vendors/products/product-1/cost-centers', {
      params: { page: 1, limit: 20, q: 'XL' },
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/vendors/vendor-1/integration', integration)
    expect(apiClient.post).toHaveBeenCalledWith('/api/vendors/vendor-1/integration/refresh', {
      providerKey: 'CUSTOM',
    })
  })

  it('submits the three-file catalog payload for validation or import', async () => {
    const payload = {
      dryRun: true,
      vendors: [{ code: 'PRINTWAY', name: 'Printway', fulfillmentType: 'POD' }],
      vendorProducts: [{ vendorCode: 'PRINTWAY', code: 'TEE', name: 'Tee' }],
      vendorCostCenters: [{ vendorProductCode: 'TEE', code: 'TEE_BLACK_S', name: 'Black / S' }],
    }

    await importVendorTemplate(payload)

    expect(apiClient.post).toHaveBeenCalledWith('/api/vendors/catalog-import', payload)
  })

  it('returns the redacted integration DTO without credential values', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        accessTokenConfigured: true,
        authType: 'ACCESS_REFRESH',
        baseUrl: 'https://vendor.example',
        expiresAt: null,
        id: 'integration-1',
        lastCheckedAt: '2026-07-31T00:00:00Z',
        lastError: null,
        metadata: {},
        passwordConfigured: false,
        providerKey: 'CUSTOM',
        refreshTokenConfigured: true,
        status: 'CONNECTED',
        usernameConfigured: false,
        vendorId: 'vendor-1',
        accessToken: 'must-not-escape',
        refreshToken: 'must-not-escape',
        password: 'must-not-escape',
      },
    })

    const result = await getVendorIntegrationConfig('vendor-1')

    expect(result).toMatchObject({
      accessTokenConfigured: true,
      refreshTokenConfigured: true,
      status: 'CONNECTED',
    })
    expect(result).not.toHaveProperty('accessToken')
    expect(result).not.toHaveProperty('refreshToken')
    expect(result).not.toHaveProperty('password')
  })

  it('returns null when the vendor has no integration config yet', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: null })

    await expect(getVendorIntegrationConfig('vendor-1')).resolves.toBeNull()
  })

  it('omits empty search params from list requests', async () => {
    await listVendors({ limit: 20, page: 1, q: '' })
    await listVendorProducts({ limit: 20, page: 1, q: '  ', vendorId: 'vendor-1' })
    await listVendorCostCenters('product-1', { limit: 20, page: 1, q: '' })

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/vendors', {
      params: { limit: 20, page: 1 },
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/vendors/products', {
      params: { limit: 20, page: 1, vendorId: 'vendor-1' },
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(
      3,
      '/api/vendors/products/product-1/cost-centers',
      { params: { limit: 20, page: 1 } },
    )
  })
})
