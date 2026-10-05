import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const feedbackToast = vi.fn()

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { changeLanguage: vi.fn() },
    }),
  }
})

vi.mock('@/shared/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  useFeedbackToast: () => feedbackToast,
}))

vi.mock('@/shared/media', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/media')>()
  return {
    ...actual,
    AuthenticatedMediaImage: ({
      alt,
      downloadUrl,
      ...props
    }: React.ImgHTMLAttributes<HTMLImageElement> & { downloadUrl?: string | null }) => (
      <img {...props} alt={alt} src={downloadUrl ?? undefined} />
    ),
  }
})

vi.mock('@/features/portal/orders/api/orderApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/orders/api/orderApi')>()),
  recheckMapping: vi.fn(),
  recheckProduction: vi.fn(),
}))

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
import {
  type OrderWorkbenchRow,
  recheckMapping,
  recheckProduction,
} from '@/features/portal/orders/api/orderApi'
import { orderKeys } from '@/features/portal/orders/api/orderKeys'
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
  client = new QueryClient(),
) {
  return render(
    <QueryClientProvider client={client}>
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

function openMoreActions() {
  fireEvent.click(screen.getByRole('button', { name: 'orders.actions.more' }))
}

function actionMenuItem(name: string) {
  return screen.getAllByRole('menuitem', { name: new RegExp(`${name}$`) }).at(-1)!
}

it('keeps replacement but hides operational actions for a cancelled order', () => {
  renderPanel(true, undefined, { ...row, order: { ...row.order, status: 'CANCELLED' } }, false)

  openMoreActions()
  expect(actionMenuItem('orders.actions.replaceShort')).toBeInTheDocument()
  expect(
    screen.queryByRole('menuitem', { name: /orders\.actions\.recheckShort$/ }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('menuitem', { name: /orders\.actions\.readyShort$/ }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('menuitem', { name: /orders\.actions\.cancelShort$/ }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
})

describe('OrderInlinePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(recheckMapping).mockResolvedValue({ status: 'BLOCKED' })
    vi.mocked(recheckProduction).mockResolvedValue({ status: 'BLOCKED', blockers: ['OPEN_CASE'] })
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

  it('does not create an inactive timeline query until history is opened', () => {
    const client = new QueryClient()
    renderPanel(true, undefined, row, true, client)

    expect(client.getQueryState(orderKeys.timeline(row.order.id))).toBeUndefined()
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

  it('shows the scale assignee code and name from production.scaleBy', () => {
    renderPanel(true, undefined, {
      ...row,
      items: [
        {
          ...row.items[0],
          production: {
            status: 'NEED_SCALE',
            scaleStatus: 'SCALED',
            qcStatus: 'NOT_READY',
            scaleBy: { employeeCode: 'J2502', name: 'Đặng Thành Trung' },
          },
        },
      ],
    })

    expect(screen.getByText('J2502 · Đặng Thành Trung')).toBeInTheDocument()
  })

  it('shows recheck for a mapping-blocked item', () => {
    renderPanel()

    openMoreActions()
    expect(actionMenuItem('orders.actions.recheckMappingShort')).toBeInTheDocument()
  })

  it('shows mapping recheck for a mapped processing item', () => {
    renderPanel(true, undefined, {
      ...row,
      items: [
        {
          ...row.items[0],
          item: { ...row.items[0].item, status: 'PROCESSING' },
          mapping: { status: 'READY' },
          workflow: { ...row.items[0].workflow, nextActions: [] },
        },
      ],
    })

    openMoreActions()
    expect(actionMenuItem('orders.actions.recheckMappingShort')).toBeInTheDocument()
  })

  it('warns when mapping recheck remains blocked without a vendor', async () => {
    renderPanel()

    openMoreActions()
    fireEvent.click(actionMenuItem('orders.actions.recheckMappingShort'))

    await waitFor(() => {
      expect(feedbackToast).toHaveBeenCalledWith('warning', 'orders.messages.mappingStillBlocked')
    })
    expect(feedbackToast).not.toHaveBeenCalledWith('success', 'orders.messages.updated')
  })

  it('confirms a successful mapping recheck with a vendor-specific message', async () => {
    vi.mocked(recheckMapping).mockResolvedValue({
      status: 'READY',
      vendorProduct: { id: 'product-1' },
      vendorCostCenter: { id: 'cost-1' },
    })
    renderPanel()

    openMoreActions()
    fireEvent.click(actionMenuItem('orders.actions.recheckMappingShort'))

    await waitFor(() => {
      expect(feedbackToast).toHaveBeenCalledWith('success', 'orders.messages.mappingMatched')
    })
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

  it('shows PSD readiness from listing default PSD when no variant is mapped', () => {
    renderPanel(true, undefined, {
      ...row,
      items: [
        {
          ...row.items[0],
          mapping: {
            status: 'BLOCKED',
            listingVariant: null,
            listingPsd: {
              psdReadiness: { status: 'PRESENT' },
              psdTemplate: { downloadUrl: '/api/media/assets/default-psd/download' },
            },
          },
        },
      ],
    })

    expect(screen.getByText('PSD PRESENT')).toBeInTheDocument()
    expect(screen.queryByText('PSD MISSING')).not.toBeInTheDocument()
  })

  it('shows PSD readiness from a replacement snapshot without mapping', () => {
    renderPanel(true, undefined, {
      ...row,
      items: [
        {
          ...row.items[0],
          mapping: null,
          psd: { listingPsd: { psdReadiness: { status: 'PRESENT' } } },
        },
      ],
    })

    expect(screen.getByText('PSD PRESENT')).toBeInTheDocument()
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

    openMoreActions()
    expect(actionMenuItem('orders.actions.recheckProductionShort')).toBeInTheDocument()
  })

  it('shows recheck production when mapping is ready and the first task must be created', () => {
    renderPanel(true, undefined, {
      ...row,
      items: [
        {
          ...row.items[0],
          mapping: { status: 'READY', listingVariant: { id: 'variant-1' } },
          psd: { listingPsd: { psdReadiness: { status: 'PRESENT' } } },
          production: null,
          workflow: {
            stage: 'NEED_PRODUCTION',
            owner: 'OPERATIONS',
            blockers: [],
            nextActions: ['CREATE_PRODUCTION_TASK'],
          },
        },
      ],
    })

    openMoreActions()
    expect(actionMenuItem('orders.actions.recheckProductionShort')).toBeInTheDocument()
  })

  it('blocks production recheck until mapping is ready', () => {
    renderPanel()

    openMoreActions()
    expect(actionMenuItem('orders.actions.recheckProductionNeedsMapping')).toHaveClass(
      'ant-dropdown-menu-item-disabled',
    )
  })

  it('blocks production recheck while the item mapping recheck is running', async () => {
    let resolveMapping: (result: unknown) => void = () => undefined
    vi.mocked(recheckMapping).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMapping = resolve
        }),
    )
    renderPanel(true, undefined, {
      ...row,
      items: [
        {
          ...row.items[0],
          mapping: { status: 'READY', listingVariant: { id: 'variant-1' } },
          production: null,
          workflow: { ...row.items[0].workflow, nextActions: ['CREATE_PRODUCTION_TASK'] },
        },
      ],
    })

    openMoreActions()
    fireEvent.click(actionMenuItem('orders.actions.recheckMappingShort'))
    await waitFor(() => expect(recheckMapping).toHaveBeenCalledWith('item-1'))

    openMoreActions()
    expect(actionMenuItem('orders.actions.recheckProductionWaitingMapping')).toHaveClass(
      'ant-dropdown-menu-item-disabled',
    )

    resolveMapping({
      status: 'READY',
      vendorProduct: { id: 'product-1' },
      vendorCostCenter: { id: 'cost-1' },
    })
    await waitFor(() =>
      expect(feedbackToast).toHaveBeenCalledWith('success', 'orders.messages.mappingMatched'),
    )
  })

  it('warns when production recheck is blocked by an open case', async () => {
    renderPanel(true, undefined, {
      ...row,
      items: [
        {
          ...row.items[0],
          mapping: {
            status: 'READY',
            listingVariant: { id: 'variant-1', psdReadiness: { status: 'PRESENT' } },
          },
          production: { status: 'BLOCKED', scaleStatus: 'NEED_SCALE', qcStatus: 'NOT_READY' },
        },
      ],
    })

    openMoreActions()
    fireEvent.click(actionMenuItem('orders.actions.recheckProductionShort'))

    await waitFor(() => {
      expect(feedbackToast).toHaveBeenCalledWith(
        'warning',
        'orders.messages.productionBlockedOpenCase',
      )
    })
    expect(feedbackToast).not.toHaveBeenCalledWith('success', 'orders.messages.updated')
  })

  it('groups infrequent item actions in the more-actions menu', () => {
    renderPanel()

    expect(screen.getByRole('button', { name: 'orders.actions.more' })).toHaveClass(
      'ant-btn-icon-only',
    )
    openMoreActions()

    for (const label of [
      'orders.actions.replaceShort',
      'orders.actions.readyShort',
      'orders.actions.cancelShort',
    ]) {
      expect(actionMenuItem(label)).toBeInTheDocument()
    }
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
    openMoreActions()
    const replacement = actionMenuItem('orders.actions.replaceShort')

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

  it('collapses long customization lists until expanded', () => {
    const source: OrderWorkbenchRow = {
      ...row,
      items: [
        {
          ...row.items[0],
          customization: {
            status: 'PARSED',
            needsReview: false,
            inputs: [
              { type: 'TEXT', label: 'Field 1', value: 'Value 1' },
              { type: 'TEXT', label: 'Field 2', value: 'Value 2' },
              { type: 'TEXT', label: 'Field 3', value: 'Value 3' },
              { type: 'TEXT', label: 'Field 4', value: 'Value 4' },
              { type: 'TEXT', label: 'Field 5', value: 'Value 5' },
            ],
          },
        },
      ],
    }

    renderPanel(true, undefined, source)

    expect(screen.getByText(/Field 4/)).toBeInTheDocument()
    expect(screen.queryByText(/Field 5/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'orders.actions.showMoreCustomization' }))
    expect(screen.getByText(/Field 5/)).toBeInTheDocument()
  })

  it('keeps buyer-uploaded images visible when customization values are collapsed', () => {
    const source: OrderWorkbenchRow = {
      ...row,
      items: [
        {
          ...row.items[0],
          customization: {
            status: 'PARSED',
            needsReview: false,
            inputs: [
              { type: 'TEXT', label: 'Field 1', value: 'Value 1' },
              { type: 'TEXT', label: 'Field 2', value: 'Value 2' },
              { type: 'TEXT', label: 'Field 3', value: 'Value 3' },
              { type: 'TEXT', label: 'Field 4', value: 'Value 4' },
              {
                type: 'IMAGE',
                label: 'Upload Photo',
                assetDownloadUrl: '/api/media/assets/buyer-photo/download',
              },
            ],
          },
        },
      ],
    }

    renderPanel(true, undefined, source)

    expect(screen.getByAltText('Upload Photo')).toBeInTheDocument()
  })

  it('keeps item actions in the more menu', () => {
    renderPanel()

    expect(screen.getByRole('button', { name: 'orders.actions.more' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'orders.actions.replaceShort' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'orders.actions.more' }))
    expect(actionMenuItem('orders.actions.replaceShort')).toBeInTheDocument()
  })

  it('shows extracted customization artwork separately from a buyer upload', () => {
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
    expect(screen.getByText('orders.fields.customizationArtwork')).toBeInTheDocument()
    expect(screen.getByAltText('archive-preview.jpg')).toBeInTheDocument()
  })

  it('does not render buyer-uploaded artwork twice', () => {
    const source: OrderWorkbenchRow = {
      ...row,
      items: [
        {
          ...row.items[0],
          customization: {
            status: 'PARSED',
            needsReview: false,
            previewImageUrl: '/api/media/assets/buyer-photo/download',
            inputs: [
              {
                type: 'IMAGE',
                label: 'Upload Photo',
                assetDownloadUrl: '/api/media/assets/buyer-photo/download',
              },
            ],
          },
        },
      ],
    }

    renderPanel(true, undefined, source)

    expect(screen.getByAltText('Upload Photo')).toBeInTheDocument()
    expect(screen.queryByText('orders.fields.customizationArtwork')).not.toBeInTheDocument()
  })

  it('shows customization artwork when it differs from the buyer upload', () => {
    const source: OrderWorkbenchRow = {
      ...row,
      items: [
        {
          ...row.items[0],
          customization: {
            status: 'PARSED',
            needsReview: false,
            previewImageUrl: 'https://m.media-amazon.com/images/S/customize-preview.png',
            inputs: [
              {
                type: 'IMAGE',
                label: 'Upload Photo',
                assetDownloadUrl: '/api/media/assets/buyer-photo/download',
              },
            ],
          },
        },
      ],
    }

    renderPanel(true, undefined, source)

    expect(screen.getByAltText('Upload Photo')).toBeInTheDocument()
    expect(screen.getByText('orders.fields.customizationArtwork')).toBeInTheDocument()
    expect(screen.getByAltText('orders.fields.image')).toHaveAttribute(
      'src',
      'https://m.media-amazon.com/images/S/customize-preview.png',
    )
  })

  it('prefers the downloaded artwork over an Amazon preview when ZIP artwork is available', () => {
    const source: OrderWorkbenchRow = {
      ...row,
      items: [
        {
          ...row.items[0],
          customization: {
            status: 'PARSED',
            needsReview: false,
            previewImageUrl: 'https://m.media-amazon.com/images/S/customize-preview.png',
            extractedImages: [
              {
                filename: 'customer-artwork.jpg',
                assetDownloadUrl: '/api/media/assets/customer-artwork/download',
              },
            ],
            inputs: [],
          },
        },
      ],
    }

    renderPanel(true, undefined, source)

    expect(screen.getByAltText('customer-artwork.jpg')).toHaveAttribute(
      'src',
      '/api/media/assets/customer-artwork/download',
    )
  })

  it('shows the synced main listing image separately from customization artwork', () => {
    const source: OrderWorkbenchRow = {
      ...row,
      items: [
        {
          ...row.items[0],
          listing: {
            ...row.items[0].listing,
            title: row.items[0].listing?.title ?? null,
            productImageUrl: 'https://res.cloudinary.com/example/main-listing.jpg',
          },
          customization: {
            status: 'PARSED',
            needsReview: false,
            previewImageUrl: 'https://m.media-amazon.com/images/S/customize-preview.png',
            inputs: [],
          },
        },
      ],
    }

    renderPanel(true, undefined, source)

    expect(screen.getByAltText('orders.fields.mainListingImage')).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/example/main-listing.jpg',
    )
    expect(screen.getByAltText('orders.fields.image')).toHaveAttribute(
      'src',
      'https://m.media-amazon.com/images/S/customize-preview.png',
    )
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
    await waitFor(() => expect(getMappingVendorProductOptions).toHaveBeenCalledWith('product-1'))
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

  it('uses a product option snapshot locally while choosing size and color', async () => {
    vi.mocked(getMappingVendorProductOptions).mockResolvedValue({
      dimensions: { hasSize: true, hasColor: true },
      options: { sizes: ['M'], colors: ['Black'] },
      candidates: [],
      allCandidates: [
        {
          id: 'cost-1',
          code: 'PRODUCT-M-BLACK',
          size: 'M',
          color: 'Black',
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
    fireEvent.click((await screen.findAllByText('M')).at(-1)!)
    fireEvent.mouseDown(screen.getByLabelText('orders.fields.color'))
    fireEvent.click((await screen.findAllByText('Black')).at(-1)!)

    expect(await screen.findByRole('button', { name: 'orders.actions.apply' })).toBeInTheDocument()
    expect(getMappingVendorProductOptions).toHaveBeenCalledTimes(1)
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

  it('runs candidate lookup when fulfillment selection opens', async () => {
    vi.mocked(searchMappingVendors).mockRejectedValueOnce(new Error('Forbidden'))
    renderPanel()

    fireEvent.mouseDown(screen.getByLabelText('orders.fields.vendor'))

    await waitFor(() => expect(searchMappingVendors).toHaveBeenCalledWith({ q: '', limit: 20 }))
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
