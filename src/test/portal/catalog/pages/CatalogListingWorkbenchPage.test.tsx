import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount } from '@/features/auth/api/authApi'
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
        defaultVariantId: 'variant-1',
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
  setDefaultListingVariant: vi.fn(),
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
  it('opens listing details from the catalog card', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )
    fireEvent.click(await screen.findByRole('button', { name: /SKU-1/ }))
    await waitFor(() => expect(screen.getByText('Product variants')).toBeInTheDocument())
  }, 60_000)

  it('shows variants and Request PSD inline without listing title or QC column', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /SKU-1/ }))
    expect(await screen.findByText('Unisex Hoodie')).toBeInTheDocument()
    expect(screen.getByText('Hoodie Master')).toBeInTheDocument()
    expect(screen.getByText('B0TEST123')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request PSD' })).toBeInTheDocument()
  }, 60_000)

  it('shows the imported listing image in the card and detail panel', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )

    expect(await screen.findByRole('img', { name: 'Shirt' })).toHaveAttribute(
      'src',
      'https://m.media-amazon.com/images/S/listing.png',
    )
    fireEvent.click(await screen.findByRole('button', { name: /SKU-1/ }))
    await waitFor(() => expect(screen.getAllByRole('img', { name: 'Shirt' })).toHaveLength(2))
  }, 60_000)
})
