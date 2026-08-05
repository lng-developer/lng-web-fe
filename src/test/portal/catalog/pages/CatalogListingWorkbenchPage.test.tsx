import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { CatalogListingWorkbenchPage } from '@/features/portal/catalog/pages/CatalogListingWorkbenchPage'
import i18n from '@/shared/i18n/i18n'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => undefined,
}))

vi.mock('@/features/portal/catalog/api/catalogApi', () => ({
  getListingOptions: vi
    .fn()
    .mockResolvedValue({ shops: [], productTypeGroups: [], internalTemplates: [] }),
  listListings: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'listing-1',
        shopId: 'shop-1',
        sku: 'SKU-1',
        title: 'Shirt',
        salesChannelCode: 'AMAZON',
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
    title: 'Shirt',
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
  uploadListingPsdTemplate: vi.fn(),
}))

const account = { permissions: ['CATALOG:WRITE'], scopes: [] } as unknown as CurrentAccount

describe('CatalogListingWorkbenchPage', () => {
  afterEach(cleanup)
  beforeEach(() => i18n.changeLanguage('en'))
  it('shows a quick view action', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )
    const action = await screen.findByRole('button', { name: 'View' })
    expect(action).toHaveTextContent('')
    fireEvent.click(action)
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('SKU-1'))
  }, 15_000)

  it('opens the manual PSD upload from row actions', async () => {
    render(
      <AppProviders>
        <CatalogListingWorkbenchPage account={account} />
      </AppProviders>,
    )
    fireEvent.mouseEnter(await screen.findByRole('button', { name: 'More actions' }))
    fireEvent.click(await screen.findByText('Upload PSD'))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Drop a PSD, ZIP, or RAR file here')
  }, 15_000)
})
