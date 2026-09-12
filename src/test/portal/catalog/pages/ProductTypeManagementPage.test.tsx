import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/common/CoreDataTable', async () => ({
  CoreDataTable: (await import('@/test/mocks/CoreDataTable')).CoreDataTable,
}))

import { AppProviders } from '@/app/providers/AppProviders'
import { listProductTypeGroups } from '@/features/portal/catalog/api/catalogApi'
import { ProductTypeManagementPage } from '@/features/portal/catalog/pages/ProductTypeManagementPage'
import {
  listVendorProducts,
  updateVendorProduct,
} from '@/features/portal/vendors/api/vendorApi'
import { setGlobalPermissions, setPermissions } from '@/shared/auth/session'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/portal/catalog/api/catalogApi', () => ({
  listProductTypeGroups: vi.fn().mockResolvedValue({
    items: [{ id: 'group-1', code: 'SHIRT', name: 'Shirt', status: 'ACTIVE' }],
    pagination: { total: 1 },
  }),
  createProductTypeGroup: vi.fn(),
  updateProductTypeGroup: vi.fn(),
}))

vi.mock('@/features/portal/vendors/api/vendorApi', () => ({
  listVendorProducts: vi.fn(),
  updateVendorProduct: vi.fn(),
}))

describe('ProductTypeManagementPage', () => {
  afterEach(cleanup)
  beforeEach(async () => {
    vi.clearAllMocks()
    i18n.addResourceBundle(
      'en',
      'common',
      {
        portal: {
          catalog: {
            master: {
              closeVendorProducts: 'Close vendor products for {{name}}',
              addVendorProductFor: 'Add vendor product for {{name}}',
              addVendorProduct: 'Add vendor product',
              selectVendorProduct: 'Select an imported vendor product',
              vendorProduct: 'Vendor product',
              openVendorProducts: 'Open vendor products for {{name}}',
              vendorProductsForProductType: 'Vendor products for {{name}}',
            },
          },
        },
      },
      true,
      true,
    )
    setPermissions(['CATALOG:WRITE', 'VENDORS:WRITE'])
    setGlobalPermissions(['CATALOG:WRITE', 'VENDORS:WRITE'])
    await i18n.changeLanguage('en')
  })
  it('shows a quick edit action for managers', async () => {
    render(
      <AppProviders>
        <ProductTypeManagementPage canManage />
      </AppProviders>,
    )
    const action = await screen.findByRole('button', { name: 'Edit product type' })
    expect(action).toHaveTextContent('')
    fireEvent.click(action)
    expect(screen.getByRole('dialog')).toHaveTextContent('Edit product type')
  })

  it('hides mutation actions from read-only users', async () => {
    render(
      <AppProviders>
        <ProductTypeManagementPage canManage={false} />
      </AppProviders>,
    )
    await screen.findByText('SHIRT')
    expect(screen.queryByRole('button', { name: 'Edit product type' })).not.toBeInTheDocument()
  })

  it('can render without its embedded page header', async () => {
    render(
      <AppProviders>
        <ProductTypeManagementPage {...{ canManage: true, showHeader: false }} />
      </AppProviders>,
    )

    await screen.findByText('SHIRT')
    expect(screen.queryByRole('heading', { name: 'Product types' })).not.toBeInTheDocument()
  })

  it('keeps search and create controls outside the data card', async () => {
    const { container } = render(
      <AppProviders>
        <ProductTypeManagementPage canManage />
      </AppProviders>,
    )

    await screen.findByText('SHIRT')
    const card = container.querySelector('.ant-card')
    expect(card).not.toBeNull()
    expect(within(card as HTMLElement).queryByPlaceholderText('Search product types')).toBeNull()
    expect(
      within(card as HTMLElement).queryByRole('button', { name: 'Create product type' }),
    ).toBeNull()
  })

  it('assigns an imported vendor product after a product type is expanded', async () => {
    vi.mocked(listVendorProducts).mockResolvedValueOnce({
      items: [
        {
          code: 'ACRYLIC-CLIP',
          externalProductId: 'APCVN',
          id: 'vendor-product-1',
          name: 'Acrylic Photo Car Visor Clip',
          productTypeGroup: { id: 'group-1', name: 'Shirt' },
          status: 'ACTIVE',
          vendor: { id: 'vendor-1', name: 'Merchize' },
        },
      ],
      pagination: { total: 1 },
    } as never)
    vi.mocked(listVendorProducts).mockResolvedValueOnce({
      items: [
        {
          code: 'CERAMIC-MUG',
          id: 'vendor-product-2',
          name: 'Ceramic Mug',
          productTypeGroup: null,
          status: 'ACTIVE',
          vendor: { id: 'vendor-1', name: 'Merchize' },
        },
      ],
      pagination: { total: 1 },
    } as never)
    vi.mocked(updateVendorProduct).mockResolvedValue({ id: 'vendor-product-2' } as never)

    render(
      <AppProviders>
        <ProductTypeManagementPage canManage />
      </AppProviders>,
    )

    await screen.findByText('SHIRT')
    expect(listVendorProducts).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Open vendor products for Shirt' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Acrylic Photo Car Visor Clip')).toBeVisible()
    expect(
      screen.getByRole('table', { name: 'Vendor products for Shirt' }),
    ).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Add vendor product for Shirt' }))
    fireEvent.mouseDown(await screen.findByLabelText('Vendor product'))
    fireEvent.click(await screen.findByText('Merchize · CERAMIC-MUG · Ceramic Mug'))
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }))

    await waitFor(() =>
      expect(updateVendorProduct).toHaveBeenCalledWith('vendor-product-2', {
        productTypeGroupId: 'group-1',
      }),
    )
    expect(listVendorProducts).toHaveBeenCalledWith({
      limit: 20,
      page: 1,
      productTypeGroupId: 'group-1',
    })
    expect(listVendorProducts).toHaveBeenCalledWith({ limit: 100, page: 1 })
  })

  it('toggles a vendor product inactive from its Product Type', async () => {
    vi.mocked(listVendorProducts).mockResolvedValue({
      items: [
        {
          code: 'ACRYLIC-CLIP',
          id: 'vendor-product-1',
          name: 'Acrylic Photo Car Visor Clip',
          status: 'ACTIVE',
          vendor: { id: 'vendor-1', name: 'Merchize' },
        },
      ],
      pagination: { total: 1 },
    } as never)
    vi.mocked(updateVendorProduct).mockResolvedValue({ id: 'vendor-product-1' } as never)

    render(
      <AppProviders>
        <ProductTypeManagementPage canManage />
      </AppProviders>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Open vendor products for Shirt' }))
    fireEvent.click(
      await screen.findByRole('switch', { name: 'Deactivate vendor product Acrylic Photo Car Visor Clip' }),
    )

    await waitFor(() =>
      expect(updateVendorProduct).toHaveBeenCalledWith('vendor-product-1', { status: 'INACTIVE' }),
    )
  })

  it('resets to the first page and searches while typing', async () => {
    render(
      <AppProviders>
        <ProductTypeManagementPage canManage />
      </AppProviders>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Page 2' }))
    await waitFor(() =>
      expect(listProductTypeGroups).toHaveBeenLastCalledWith({
        page: 2,
        limit: 20,
        search: undefined,
      }),
    )

    fireEvent.change(screen.getByPlaceholderText('Search product types'), {
      target: { value: 'shirt' },
    })

    await waitFor(() =>
      expect(listProductTypeGroups).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        search: 'shirt',
      }),
    )
  })
})
