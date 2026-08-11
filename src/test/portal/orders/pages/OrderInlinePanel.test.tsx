import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/mapping/api/mappingApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/portal/mapping/api/mappingApi')>()
  return {
    ...actual,
    searchMappingVendors: vi.fn(),
    listMappingVendorProducts: vi.fn(),
    getMappingVendorProductOptions: vi.fn(),
    selectFulfillmentCandidate: vi.fn(),
  }
})

import {
  getMappingVendorProductOptions,
  listMappingVendorProducts,
  searchMappingVendors,
  selectFulfillmentCandidate,
} from '@/features/portal/mapping/api/mappingApi'
import type { OrderWorkbenchRow } from '@/features/portal/orders/api/orderApi'
import { OrderInlinePanel } from '@/features/portal/orders/pages/OrderInlinePanel'

afterEach(cleanup)

const row: OrderWorkbenchRow = {
  order: {
    id: 'order-1',
    externalOrderId: 'ORDER-1',
    createdAt: null,
    orderedAt: null,
    status: 'IMPORTED',
    buyer: { name: 'Customer', emailMasked: 'buyer@example.test' },
    shop: null,
    shippingService: {},
    shippingAddress: {
      name: 'Customer',
      addressLine1: '123 Main St',
      city: 'Austin',
      stateOrProvinceCode: 'TX',
      postalCode: '78701',
      countryCode: 'US',
    },
    addressValidationStatus: 'NOT_CHECKED',
    pricing: { customerPaidAmount: 0, baseCostAmount: null, currency: 'USD' },
    handlingLabel: null,
    caseStatus: null,
    assignedStaffIds: [],
  },
  items: [
    {
      item: {
        id: 'item-1',
        sourceSku: 'J2501-DM-1',
        sku: 'J2501-DM-1',
        asin: null,
        title: 'Long marketplace product title',
        quantity: 1,
        status: 'NEW',
        csNote: null,
      },
      seller: { employeeCode: 'J2501', name: 'Seller' },
      listing: {
        title: 'Listing product title',
      },
      customization: null,
      mapping: {
        status: 'BLOCKED',
        listingVariant: {
          id: 'variant-1',
          productTypeGroup: { id: 'group-1' },
        },
      },
      pricing: { customerPaidAmount: 0, baseCostAmount: null, currency: 'USD' },
      production: null,
      tracking: null,
      workflow: {
        stage: 'NEED_ADDRESS',
        owner: 'CS',
        blockers: [{ code: 'ADDRESS_NOT_VALID' }],
        nextActions: ['VALIDATE_ADDRESS'],
      },
    },
  ],
}

function renderPanel(
  canWrite = true,
  requestedModal?: 'address' | 'customer' | 'shipping' | 'case' | 'replacement' | 'timeline',
  source = row,
  canOperate = canWrite,
) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <App>
        <OrderInlinePanel
          row={source}
          canWrite={canWrite}
          canOperate={canOperate}
          requestedModal={requestedModal}
        />
      </App>
    </QueryClientProvider>,
  )
}

it('keeps replacement but hides operational actions for a cancelled order', () => {
  renderPanel(true, undefined, { ...row, order: { ...row.order, status: 'CANCELLED' } }, false)

  expect(screen.getByRole('button', { name: 'orders.actions.replaceShort' })).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'orders.actions.recheckShort' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'orders.actions.readyShort' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'orders.actions.cancelShort' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
})

describe('OrderInlinePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(searchMappingVendors).mockResolvedValue({
      items: [{ id: 'vendor-1', name: 'Vendor One' }],
      hasMore: false,
    })
    vi.mocked(listMappingVendorProducts).mockResolvedValue([
      { id: 'product-1', name: 'Product One' },
      { id: 'product-2', name: 'Product Two' },
    ])
    vi.mocked(getMappingVendorProductOptions).mockResolvedValue({
      dimensions: { hasSize: true, hasColor: true },
      options: { sizes: ['M'], colors: ['Black'] },
      candidates: [
        {
          id: 'cost-1',
          code: 'M-BLACK',
          size: 'M',
          color: 'Black',
          baseCostAmount: 1250,
          currency: 'USD',
        },
      ],
    })
    vi.mocked(selectFulfillmentCandidate).mockResolvedValue({ id: 'plan-1' })
  })

  it('omits duplicated address and marketplace product titles', () => {
    renderPanel()

    expect(screen.queryByText(/123 Main St/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Austin/)).not.toBeInTheDocument()
    expect(screen.queryByText('Long marketplace product title')).not.toBeInTheDocument()
    expect(screen.queryByText('Listing product title')).not.toBeInTheDocument()
  })

  it('shows the mapped SKU supplied by the order contract', () => {
    renderPanel(true, undefined, {
      ...row,
      items: [
        {
          ...row.items[0],
          item: { ...row.items[0].item, sku: 'J2501-DM2S-1' },
        },
      ],
    })

    expect(screen.getAllByText('J2501-DM2S-1').length).toBeGreaterThan(0)
    expect(screen.queryByText('J2501-DM-1')).not.toBeInTheDocument()
  })

  it('shows PSD readiness from the resolved listing variant', () => {
    renderPanel(true, undefined, {
      ...row,
      items: [
        {
          ...row.items[0],
          mapping: {
            status: 'BLOCKED',
            listingVariant: {
              id: 'variant-1',
              psdReadiness: { status: 'PRESENT' },
              psdTemplate: { downloadUrl: '/api/media/assets/asset-1/download' },
            },
          },
        },
      ],
    })

    expect(screen.getByText('PSD PRESENT')).toBeInTheDocument()
    expect(screen.queryByText('PSD MISSING')).not.toBeInTheDocument()
  })

  it('shows recheck for a production-blocked item after PSD becomes ready', () => {
    renderPanel(true, undefined, {
      ...row,
      items: [
        {
          ...row.items[0],
          mapping: {
            status: 'READY',
            listingVariant: {
              id: 'variant-1',
              psdReadiness: { status: 'PRESENT' },
            },
          },
          production: { status: 'BLOCKED', scaleStatus: 'NEED_SCALE', qcStatus: 'NOT_READY' },
          workflow: {
            stage: 'NEED_PSD',
            owner: 'DESIGN',
            blockers: [{ code: 'PSD_MISSING' }],
            nextActions: ['REQUEST_PSD_FROM_CATALOG'],
          },
        },
      ],
    })

    expect(screen.getByRole('button', { name: 'orders.actions.recheckShort' })).toBeVisible()
  })

  it('keeps order-level actions out of the expanded detail', () => {
    renderPanel(false)
    expect(
      screen.queryByRole('button', { name: 'orders.actions.editAddress' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'orders.actions.editShipping' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'orders.actions.manageCase' }),
    ).not.toBeInTheDocument()
  })

  it('opens the address modal when requested by the customer column', () => {
    renderPanel(true, 'address')
    const replacement = screen.getByRole('button', { name: 'orders.actions.replaceShort' })

    expect(replacement).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument()
  })

  it('exposes item history and edits customer details in place', () => {
    renderPanel(true, 'customer')

    expect(screen.getByRole('button', { name: 'orders.actions.viewHistory' })).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Customer')).toBeInTheDocument()
    expect(screen.getByDisplayValue('buyer@example.test')).toBeInTheDocument()
  })

  it('lets an order replacement select multiple items', () => {
    const secondItem = {
      ...row.items[0],
      item: { ...row.items[0].item, id: 'item-2', sku: 'J2502-DM-2' },
    }
    renderPanel(true, 'replacement', { ...row, items: [row.items[0], secondItem] })

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(within(dialog).getByText('J2501-DM-1')).toBeInTheDocument()
    expect(within(dialog).getByText('J2502-DM-2')).toBeInTheDocument()
  })

  it('renders buyer-uploaded customization images in the expanded item', () => {
    const source: OrderWorkbenchRow = {
      ...row,
      items: [
        {
          ...row.items[0],
          customization: {
            status: 'PARSED',
            needsReview: false,
            inputs: [
              {
                type: 'IMAGE',
                label: 'Buyer photo',
                assetDownloadUrl: '/api/media/assets/buyer-photo/download',
              },
            ],
          },
        },
      ],
    }

    renderPanel(true, undefined, source)

    expect(screen.getByAltText('Buyer photo')).toBeInTheDocument()
  })

  it('does not repeat extracted Amazon assets beside buyer-uploaded images', () => {
    const source: OrderWorkbenchRow = {
      ...row,
      items: [
        {
          ...row.items[0],
          customization: {
            status: 'PARSED',
            needsReview: false,
            inputs: [
              {
                type: 'IMAGE',
                label: 'Buyer photo',
                assetDownloadUrl: '/api/media/assets/buyer-photo/download',
              },
            ],
            extractedImages: [
              {
                filename: 'archive-preview.jpg',
                assetDownloadUrl: '/api/media/assets/archive-preview/download',
              },
            ],
          },
        },
      ],
    }

    renderPanel(true, undefined, source)

    expect(screen.getByAltText('Buyer photo')).toBeInTheDocument()
    expect(screen.queryByAltText('archive-preview.jpg')).not.toBeInTheDocument()
  })

  it('opens the source URL imported from Amazon for users who can edit the order', () => {
    const source: OrderWorkbenchRow = {
      ...row,
      items: [
        {
          ...row.items[0],
          customization: {
            status: 'PARSED',
            needsReview: false,
            sourceCustomizationUrl:
              'https://zme-caps.amazon.com/t/imported-customization.zip?token=order-bound',
            inputs: [],
          },
        },
      ],
    }

    renderPanel(true, undefined, source)
    expect(
      screen.getByRole('link', { name: /orders\.actions\.downloadAmazonCustomization/ }),
    ).toHaveAttribute(
      'href',
      'https://zme-caps.amazon.com/t/imported-customization.zip?token=order-bound',
    )
  })

  it('previews candidate base cost and saves only after Apply', async () => {
    renderPanel()

    expect(screen.queryByRole('button', { name: 'orders.actions.apply' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('orders.fields.size')).toBeDisabled()
    expect(screen.getByLabelText('orders.fields.color')).toBeDisabled()

    fireEvent.mouseDown(screen.getByLabelText('orders.fields.vendor'))
    fireEvent.click(await screen.findByText('Vendor One'))
    await waitFor(() =>
      expect(listMappingVendorProducts).toHaveBeenCalledWith('vendor-1', {
        productTypeGroupId: 'group-1',
        includeDifferentProductType: true,
      }),
    )
    expect(screen.queryByRole('button', { name: 'orders.actions.apply' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('orders.fields.product')).toBeEnabled()
    fireEvent.mouseDown(screen.getByLabelText('orders.fields.product'))
    fireEvent.click(await screen.findByText('Product One'))
    await waitFor(() =>
      expect(getMappingVendorProductOptions).toHaveBeenCalledWith('product-1', {}),
    )
    await waitFor(() => expect(screen.getByLabelText('orders.fields.size')).toBeEnabled())
    fireEvent.mouseDown(screen.getByLabelText('orders.fields.size'))
    fireEvent.click((await screen.findAllByText('M')).at(-1)!)
    await waitFor(() => expect(screen.getByLabelText('orders.fields.color')).toBeEnabled())
    fireEvent.mouseDown(screen.getByLabelText('orders.fields.color'))
    fireEvent.click((await screen.findAllByText('Black')).at(-1)!)

    expect(selectFulfillmentCandidate).not.toHaveBeenCalled()
    expect(screen.getByText('$12.50')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'orders.actions.apply' }))

    await waitFor(() =>
      expect(selectFulfillmentCandidate).toHaveBeenCalledWith('item-1', {
        vendorProductId: 'product-1',
        vendorCostCenterId: 'cost-1',
      }),
    )
  })

  it('allows Apply when the selected product has no color option', async () => {
    vi.mocked(getMappingVendorProductOptions).mockResolvedValue({
      dimensions: { hasSize: true, hasColor: false },
      options: { sizes: ['72x36'], colors: [] },
      candidates: [
        {
          id: 'cost-1',
          size: '72x36',
          color: null,
          baseCostAmount: 1250,
          currency: 'USD',
        },
      ],
    })
    renderPanel()

    fireEvent.mouseDown(screen.getByLabelText('orders.fields.vendor'))
    fireEvent.click(await screen.findByText('Vendor One'))
    fireEvent.mouseDown(screen.getByLabelText('orders.fields.product'))
    fireEvent.click(await screen.findByText('Product One'))
    await waitFor(() => expect(screen.getByLabelText('orders.fields.size')).toBeEnabled())
    fireEvent.mouseDown(screen.getByLabelText('orders.fields.size'))
    fireEvent.click((await screen.findAllByText('72x36')).at(-1)!)

    await waitFor(() => expect(screen.getByLabelText('orders.fields.color')).toBeDisabled())
    expect(await screen.findByRole('button', { name: 'orders.actions.apply' })).toBeInTheDocument()
  })

  it('allows Apply when the selected product has color but no size', async () => {
    vi.mocked(getMappingVendorProductOptions).mockResolvedValue({
      dimensions: { hasSize: false, hasColor: true },
      options: { sizes: [], colors: ['Old Gold'] },
      candidates: [
        {
          id: 'cost-1',
          code: 'OLD-GOLD',
          size: null,
          color: 'Old Gold',
          baseCostAmount: 1250,
          currency: 'USD',
        },
      ],
    })
    renderPanel()

    fireEvent.mouseDown(screen.getByLabelText('orders.fields.vendor'))
    fireEvent.click(await screen.findByText('Vendor One'))
    fireEvent.mouseDown(screen.getByLabelText('orders.fields.product'))
    fireEvent.click(await screen.findByText('Product One'))
    await waitFor(() => expect(screen.getByLabelText('orders.fields.color')).toBeEnabled())
    fireEvent.mouseDown(screen.getByLabelText('orders.fields.color'))
    fireEvent.click((await screen.findAllByText('Old Gold')).at(-1)!)

    await waitFor(() => expect(screen.getByLabelText('orders.fields.size')).toBeDisabled())
    expect(await screen.findByRole('button', { name: 'orders.actions.apply' })).toBeInTheDocument()
  })

  it('shows the candidate lookup error instead of an empty vendor list', async () => {
    vi.mocked(searchMappingVendors).mockRejectedValueOnce(new Error('Forbidden'))
    renderPanel()

    fireEvent.mouseDown(screen.getByLabelText('orders.fields.vendor'))

    expect((await screen.findAllByText('Forbidden')).length).toBeGreaterThan(0)
  })

  it('loads products for the listing variant product type after choosing a vendor', async () => {
    renderPanel(true, undefined, {
      ...row,
      items: [
        {
          ...row.items[0],
          mapping: {
            status: 'BLOCKED',
            listingVariant: {
              id: 'variant-1',
              productTypeGroup: { id: 'group-1' },
            },
          },
        },
      ],
    })

    fireEvent.mouseDown(screen.getByLabelText('orders.fields.vendor'))
    fireEvent.click(await screen.findByText('Vendor One'))
    await waitFor(() =>
      expect(listMappingVendorProducts).toHaveBeenCalledWith('vendor-1', {
        productTypeGroupId: 'group-1',
        includeDifferentProductType: true,
      }),
    )
    fireEvent.mouseDown(screen.getByLabelText('orders.fields.product'))

    expect(await screen.findByText('Product Two')).toBeInTheDocument()
  })

  it('debounces manual vendor search requests', async () => {
    renderPanel()
    const vendor = screen.getByLabelText('orders.fields.vendor')
    fireEvent.mouseDown(vendor)
    await waitFor(() => expect(searchMappingVendors).toHaveBeenCalledTimes(1))

    fireEvent.change(vendor, { target: { value: 'm' } })
    fireEvent.change(vendor, { target: { value: 'mango' } })
    fireEvent.change(vendor, { target: { value: 'mango tee' } })

    expect(searchMappingVendors).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(searchMappingVendors).toHaveBeenCalledTimes(2))
    expect(searchMappingVendors).toHaveBeenLastCalledWith({ q: 'mango tee', limit: 20 })
  })
})
