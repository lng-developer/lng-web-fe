import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { listListings, requestListingPsd } from '@/features/portal/catalog/api/catalogApi'
import { CatalogListingWorkbenchPage } from '@/features/portal/catalog/pages/CatalogListingWorkbenchPage'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => undefined,
}))

vi.mock('@/features/portal/catalog/api/catalogApi', () => ({
  listListingVariants: vi.fn().mockResolvedValue([
    {
      id: 'variant-1',
      listingId: 'listing-1',
      productTypeGroup: { id: 'type-1', name: 'Unisex Hoodie' },
      internalTemplate: { id: 'template-1', code: 'HD-01', name: 'Hoodie Master' },
      psdReadiness: { status: 'MISSING' },
      previewAssetId: null,
      status: 'ACTIVE',
    },
  ]),
  getListingOptions: vi
    .fn()
    .mockResolvedValue({ shops: [], productTypeGroups: [], internalTemplates: [] }),
  listListings: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'listing-1',
        shopId: 'shop-1',
        shop: { id: 'shop-1', name: 'Amazon US' },
        sku: 'SKU-1',
        asin: 'B0TEST123',
        etsyListingId: null,
        title: 'Shirt',
        productImageUrl: 'https://m.media-amazon.com/images/S/listing.png',
        previewImageUrl: 'https://cdn.lng.co/previews/listing.png',
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'US',
        status: 'ACTIVE',
        costCenterStatus: 'READY',
        productTypeGroup: null,
        internalTemplate: null,
        salesStats: { quantitySold: 0, orderCount: 0 },
        psdReadiness: { status: 'MISSING' },
        qcStatus: 'DRAFT',
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ],
    pagination: { total: 1 },
  }),
  getListingSummary: vi.fn().mockResolvedValue({
    totalListingCount: 1,
    noPsdCount: 1,
    draftCount: 1,
    approvedCount: 0,
    rejectedCount: 0,
  }),
  getListing: vi.fn().mockResolvedValue({
    id: 'listing-1',
    shopId: 'shop-1',
    sku: 'SKU-1',
    asin: 'B0TEST123',
    title: 'Shirt',
    productImageUrl: 'https://m.media-amazon.com/images/S/listing.png',
    salesChannelCode: 'AMAZON',
    marketplaceCode: 'US',
    productTypeGroup: null,
    internalTemplate: null,
    salesStats: { quantitySold: 0, orderCount: 0 },
    psdReadiness: { status: 'MISSING' },
    qcStatus: 'DRAFT',
    updatedAt: '2026-08-01T00:00:00Z',
  }),
  createListing: vi.fn(),
  updateListing: vi.fn(),
  approveListing: vi.fn(),
  rejectListing: vi.fn(),
  requestListingPsd: vi.fn().mockResolvedValue({ id: 'task-1' }),
  requestListingVariantPsd: vi.fn().mockResolvedValue({ id: 'task-1' }),
  createListingVariant: vi.fn(),
  updateListingVariant: vi.fn(),
  uploadCatalogAsset: vi.fn(),
  uploadListingPsdTemplate: vi.fn(),
}))

const account = { permissions: ['CATALOG:WRITE'], scopes: [] } as unknown as CurrentAccount

describe('CatalogListingWorkbenchPage', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    i18n.changeLanguage('en')
  })
  it.each([
    ['ETSY', 'ETSY_US', 'US'],
    ['ETSY', 'US', 'US'],
    ['ETSY', 'ETSY_UK', 'ETSY_UK'],
    ['AMAZON', 'AMAZON_US', 'AMAZON_US'],
  ])(
    'displays %s marketplace %s as %s without changing source data',
    async (channel, code, label) => {
      const response = await listListings({ page: 1, limit: 10 })
      const listing = { ...response.items[0], salesChannelCode: channel, marketplaceCode: code }
      vi.mocked(listListings).mockResolvedValueOnce({ ...response, items: [listing] })

      render(
        <AppProviders>
          <CatalogListingWorkbenchPage account={account} />
        </AppProviders>,
      )

      const channelCell = (await screen.findByText(channel, { selector: 'td span' })).closest('td')!
      expect(within(channelCell).getByText(label)).toBeInTheDocument()
      expect(listing.marketplaceCode).toBe(code)
    },
  )

  it('opens listing variants from the listing table', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )
    fireEvent.click((await screen.findAllByRole('button', { name: 'Expand variants' }))[0])
    await waitFor(() => expect(screen.getByText(/Product variants/)).toBeInTheDocument())
    expect(await screen.findByText('Unisex Hoodie')).toBeInTheDocument()
    expect(screen.getByText('Hoodie Master')).toBeInTheDocument()
    expect(document.querySelector('button[aria-label="Request PSD"]')).not.toBeNull()
  }, 15_000)

  it('prefers the editable preview image without replacing the imported product image', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    expect(await screen.findByRole('img', { name: 'Shirt' })).toHaveAttribute(
      'src',
      'https://cdn.lng.co/previews/listing.png',
    )
    expect(screen.getAllByRole('img', { name: 'Shirt' })).toHaveLength(1)
  }, 15_000)

  it('opens the full-size viewer when the listing preview is clicked', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Preview' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  }, 15_000)

  it('removes the unused QC column from the listing workspace', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    await screen.findByRole('columnheader', { name: 'PSD' })
    expect(screen.queryByRole('columnheader', { name: 'QC' })).not.toBeInTheDocument()
  })

  it('asks for a PSD priority before creating the request', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    fireEvent.click(await screen.findByLabelText('Request default PSD'))
    expect(
      await screen.findByText('Select the delivery priority for this PSD request.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Request PSD' }))
    await waitFor(() => expect(requestListingPsd).toHaveBeenCalledWith('listing-1', 'NORMAL'))
  }, 15_000)

  it('shows a persisted PSD request and prevents opening a duplicate request', async () => {
    const response = await listListings({ page: 1, limit: 10 })
    vi.mocked(listListings).mockResolvedValueOnce({
      ...response,
      items: [
        {
          ...response.items[0],
          salesChannelCode: 'ETSY',
          etsyListingId: '4561569753',
          psdRequested: true,
        },
      ],
    })

    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} fixedSalesChannelCode="ETSY" />
      </AppProviders>,
    )

    const requested = await screen.findByRole('button', { name: 'PSD requested' })
    expect(requested).toBeDisabled()
    fireEvent.click(requested)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request default PSD' })).not.toBeInTheDocument()
  }, 60_000)

  it('refreshes the request indicator after a successful PSD request', async () => {
    const response = await listListings({ page: 1, limit: 10 })
    vi.mocked(listListings).mockResolvedValueOnce(response)
    vi.mocked(listListings).mockResolvedValueOnce({
      ...response,
      items: [{ ...response.items[0], psdRequested: true }],
    })
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Request default PSD' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Request PSD' }).at(-1)!)
    expect(await screen.findByRole('button', { name: 'PSD requested' })).toBeDisabled()
  }, 60_000)

  it('loads ten listings on the first page by default', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    await waitFor(() =>
      expect(listListings).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      ),
    )
  })

  it.each(['AMAZON', 'ETSY'] as const)(
    'hides the sales-channel filter when the %s listing route is fixed',
    async (fixedSalesChannelCode) => {
      render(
        <AppProviders>
          <CatalogListingWorkbenchPage
            account={account}
            fixedSalesChannelCode={fixedSalesChannelCode}
          />
        </AppProviders>,
      )

      await waitFor(() =>
        expect(listListings).toHaveBeenCalledWith(
          expect.objectContaining({ salesChannelCode: fixedSalesChannelCode }),
        ),
      )
      expect(document.querySelector('[class*="channelFilter"]')).not.toBeInTheDocument()
    },
  )

  it('fills the remaining viewport so listing pagination stays docked at the bottom', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    const table = (await screen.findByRole('columnheader', { name: 'Listing' })).closest('table')
    if (!table) throw new Error('Listing table is unavailable')
    expect(table.closest('[class*="dataTableFillViewport"]')).toBeInTheDocument()
    expect(table.closest('[class*="dataTablePaginationAtBottom"]')).toBeInTheDocument()
  })

  it('sorts sales through the full paginated API result', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    await screen.findByText('SKU-1')
    fireEvent.click(screen.getByRole('columnheader', { name: 'Sales' }))

    await waitFor(() =>
      expect(listListings).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, limit: 10, sort: 'quantitySoldDesc' }),
      ),
    )
  })
})
