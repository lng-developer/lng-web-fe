import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { listListings } from '@/features/portal/catalog/api/catalogApi'
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
    queryClient.clear()
    i18n.changeLanguage('en')
  })
  it('opens listing variants from the listing table', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Expand variants' }))
    await waitFor(() => expect(screen.getByText(/Product variants/)).toBeInTheDocument())
    expect(await screen.findByText('Unisex Hoodie')).toBeInTheDocument()
    expect(screen.getByText('Hoodie Master')).toBeInTheDocument()
    expect(document.querySelector('button[aria-label="Request PSD"]')).not.toBeNull()
  }, 15_000)

  it('shows the imported listing image in the listing table', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    expect(await screen.findByRole('img', { name: 'Shirt' })).toHaveAttribute(
      'src',
      'https://m.media-amazon.com/images/S/listing.png',
    )
    expect(screen.getAllByRole('img', { name: 'Shirt' })).toHaveLength(1)
  }, 15_000)

  it('gives the QC column enough room for review status badges', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    const qcHeader = await screen.findByRole('columnheader', { name: 'QC' })
    const table = qcHeader.closest('table')
    expect(
      Array.from(table?.querySelectorAll('col') ?? []).some(
        (column) => column.style.width === '150px',
      ),
    ).toBe(true)
  })

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

  it('requests listings sorted by sold quantity when Sales is selected', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    fireEvent.click(await screen.findByRole('columnheader', { name: 'Sales' }))

    await waitFor(() =>
      expect(listListings).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, limit: 10, sort: 'quantitySoldDesc' }),
      ),
    )
  })
})
