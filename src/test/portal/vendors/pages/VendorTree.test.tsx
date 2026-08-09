import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  listVendorCostCenters,
  listVendorProducts,
  listVendors,
} from '@/features/portal/vendors/api/vendorApi'
import { VendorTree } from '@/features/portal/vendors/pages/VendorTree'
import { setGlobalPermissions, setPermissions } from '@/shared/auth/session'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/portal/vendors/api/vendorApi', () => ({
  listVendorCostCenters: vi.fn(),
  listVendorProducts: vi.fn(),
  listVendors: vi.fn(),
}))

describe('VendorTree', () => {
  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    i18n.addResourceBundle(
      'en',
      'common',
      {
        portal: {
          vendors: {
            addVendor: 'Add vendor',
            branchUnavailable: 'Branch unavailable',
            close: 'Close {{name}}',
            directory: 'Vendor directory',
            noCostCenters: 'No cost centers',
            noProducts: 'No products',
            noVendors: 'No vendors',
            open: 'Open {{name}}',
            retry: 'Retry',
            retryBranch: 'Retry {{name}}',
            searchCostCenters: 'Search cost centers',
            searchProducts: 'Search products',
            searchVendors: 'Search vendors',
            status: { ACTIVE: 'Active', INACTIVE: 'Inactive' },
            unavailable: 'Vendors unavailable',
          },
        },
      },
      true,
      true,
    )
    void i18n.changeLanguage('en')
    setPermissions(['VENDORS:WRITE'])
    setGlobalPermissions(['VENDORS:WRITE'])
    vi.mocked(listVendors).mockResolvedValue({
      items: [
        {
          code: 'ACME',
          fulfillmentType: 'POD',
          id: 'vendor-1',
          name: 'Acme Print',
          providerKey: 'CUSTOM',
          status: 'ACTIVE',
        } as never,
      ],
      pagination: { limit: 20, page: 1, total: 1 },
    })
    vi.mocked(listVendorProducts).mockResolvedValue({
      items: [
        {
          code: 'TEE',
          baseCostAmount: 1250,
          currency: 'USD',
          costCenterCount: 1,
          id: 'product-1',
          maxProductionDays: 5,
          minProductionDays: 2,
          name: 'Tee',
          productTypeGroup: null,
          status: 'ACTIVE',
          vendor: null,
        } as never,
      ],
      pagination: { limit: 20, page: 1, total: 1 },
    })
    vi.mocked(listVendorCostCenters).mockResolvedValue({
      items: [
        {
          additionalCosts: {},
          attributes: {},
          baseCostAmount: 1750,
          code: 'TEE-XL',
          currency: 'USD',
          domesticShipping: {},
          id: 'cost-center-1',
          internationalShipping: {},
          name: 'Tee XL',
          priorityShipping: {},
          status: 'ACTIVE',
          vendorProductId: 'product-1',
        } as never,
      ],
      pagination: { limit: 20, page: 1, total: 1 },
    })
  })

  it('loads each tree level only after its parent is expanded', async () => {
    render(
      <AppProviders>
        <VendorTree onEdit={vi.fn()} />
      </AppProviders>,
    )

    expect(await screen.findByText('Acme Print')).toBeVisible()
    expect(listVendorProducts).not.toHaveBeenCalled()
    expect(listVendorCostCenters).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Open Acme Print' }))
    expect(await screen.findByText('Tee')).toBeVisible()
    expect(screen.getByText('$1250 USD')).toBeVisible()
    expect(screen.getByText(/2-5/)).toBeVisible()
    expect(listVendorProducts).toHaveBeenCalledWith({
      limit: 20,
      page: 1,
      q: undefined,
      vendorId: 'vendor-1',
    })
    expect(listVendorCostCenters).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Open Tee' }))
    expect(await screen.findByText('Tee XL')).toBeVisible()
    expect(screen.getByText('$1750 USD')).toBeVisible()
    expect(listVendorCostCenters).toHaveBeenCalledWith('product-1', {
      limit: 30,
      page: 1,
      q: undefined,
    })
  })

  it('retries a failed branch without closing its sibling branch', async () => {
    vi.mocked(listVendorProducts).mockRejectedValue(new Error('Unavailable'))

    render(
      <AppProviders>
        <VendorTree onEdit={vi.fn()} />
      </AppProviders>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Open Acme Print' }))
    const retry = await screen.findByRole('button', { name: 'Retry' })
    vi.mocked(listVendorProducts).mockResolvedValueOnce({
      items: [],
      pagination: { limit: 20, page: 1, total: 0 },
    })
    fireEvent.click(retry)

    await waitFor(() => expect(vi.mocked(listVendorProducts)).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Close Acme Print' })).toBeVisible()
  })

  it('reopens a branch from cache and hides write actions from read-only users', async () => {
    setPermissions(['VENDORS:READ'])
    setGlobalPermissions(['VENDORS:READ'])
    render(
      <AppProviders>
        <VendorTree onEdit={vi.fn()} />
      </AppProviders>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Open Acme Print' }))
    expect(await screen.findByText('Tee')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Close Acme Print' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Acme Print' }))

    expect(listVendorProducts).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Add vendor' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add product' })).not.toBeInTheDocument()
  })

  it('does not expose global-only Vendor actions from a scoped effective permission', async () => {
    setPermissions(['VENDORS:READ', 'VENDORS:WRITE'])
    setGlobalPermissions([])
    render(
      <AppProviders>
        <VendorTree onEdit={vi.fn()} />
      </AppProviders>,
    )

    expect(await screen.findByText('Acme Print')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Add vendor' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add product' })).not.toBeInTheDocument()
  })

  it('exposes Vendor actions from a global write permission', async () => {
    render(
      <AppProviders>
        <VendorTree onEdit={vi.fn()} />
      </AppProviders>,
    )

    expect(await screen.findByText('Acme Print')).toBeVisible()
    expect(screen.getByRole('button', { name: /Add vendor/ })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add product' })).toBeVisible()
  })

  it('keeps an expanded vendor open when its product search is cleared', async () => {
    render(
      <AppProviders>
        <VendorTree onEdit={vi.fn()} />
      </AppProviders>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Open Acme Print' }))
    const search = await screen.findByRole('textbox', { name: 'Search products' })
    fireEvent.change(search, { target: { value: 'tee' } })
    fireEvent.change(search, { target: { value: '' } })

    expect(screen.getByRole('button', { name: 'Close Acme Print' })).toBeVisible()
  })

  it('isolates Vendor, Product, and Cost Center searches while preserving expansion', async () => {
    render(
      <AppProviders>
        <VendorTree onEdit={vi.fn()} />
      </AppProviders>,
    )

    const vendorSearch = await screen.findByRole('textbox', { name: 'Search vendors' })
    fireEvent.change(vendorSearch, { target: { value: 'acme' } })
    await waitFor(() => expect(listVendors).toHaveBeenCalledWith({ limit: 50, page: 1, q: 'acme' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Open Acme Print' }))
    const productSearch = await screen.findByRole('textbox', { name: 'Search products' })
    fireEvent.change(productSearch, { target: { value: 'tee' } })
    await waitFor(() =>
      expect(listVendorProducts).toHaveBeenCalledWith({
        limit: 20,
        page: 1,
        q: 'tee',
        vendorId: 'vendor-1',
      }),
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Open Tee' }))
    const costCenterSearch = await screen.findByRole('textbox', { name: 'Search cost centers' })
    fireEvent.change(costCenterSearch, { target: { value: 'xl' } })
    await waitFor(() =>
      expect(listVendorCostCenters).toHaveBeenCalledWith('product-1', {
        limit: 30,
        page: 1,
        q: 'xl',
      }),
    )

    expect(vendorSearch).toHaveValue('acme')
    expect(productSearch).toHaveValue('tee')
    expect(screen.getByRole('button', { name: 'Close Acme Print' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Close Tee' })).toBeVisible()
  })

  it('keeps expanded branches stable when a mutation invalidates their data', async () => {
    render(
      <AppProviders>
        <VendorTree onEdit={vi.fn()} />
      </AppProviders>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Open Acme Print' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Open Tee' }))
    expect(await screen.findByText('Tee XL')).toBeVisible()

    await queryClient.invalidateQueries({ queryKey: ['portal', 'vendors', 'vendor-1', 'products'] })
    await waitFor(() => expect(listVendorProducts).toHaveBeenCalledTimes(2))

    expect(screen.getByRole('button', { name: 'Close Acme Print' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Close Tee' })).toBeVisible()
    expect(listVendorCostCenters).toHaveBeenCalledTimes(1)
  })
})
