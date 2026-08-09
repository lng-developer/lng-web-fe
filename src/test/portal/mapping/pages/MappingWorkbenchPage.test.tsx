import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App as AntdApp } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/mapping/api/mappingApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/portal/mapping/api/mappingApi')>()
  return {
    ...actual,
    getMappingSummary: vi.fn(),
    listAuthorableShops: vi.fn(),
    listMappingRules: vi.fn(),
    listUnmatchedItems: vi.fn(),
    previewOrderItem: vi.fn(),
    searchVendorCandidates: vi.fn(),
    selectFulfillmentCandidate: vi.fn(),
  }
})

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  getMappingSummary,
  listAuthorableShops,
  listMappingRules,
  listUnmatchedItems,
  previewOrderItem,
  searchVendorCandidates,
  selectFulfillmentCandidate,
} from '@/features/portal/mapping/api/mappingApi'
import { MappingWorkbenchPage } from '@/features/portal/mapping/pages/MappingWorkbenchPage'
import i18n from '@/shared/i18n/i18n'

const account: CurrentAccount = {
  account: { id: 'operator-1', email: 'operator@lng.co', mustChangePassword: false },
  roles: [],
  permissions: ['MAPPING:READ'],
  scopes: [],
  profileSetupRequired: false,
}

function renderPage(currentAccount = account, initialEntry = '/portal/mapping/workbench') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      {
        id: 'workspace',
        path: '/portal/mapping/workbench',
        loader: () => currentAccount,
        element: <MappingWorkbenchPage />,
      },
      { path: '/portal/mapping', element: <div>Product Mapping</div> },
    ],
    { initialEntries: [initialEntry] },
  )
  return render(
    <AntdApp>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AntdApp>,
  )
}

describe('MappingWorkbenchPage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    void i18n.changeLanguage('en')
    vi.mocked(getMappingSummary).mockResolvedValue({
      readyPlanCount: 1,
      confirmedPlanCount: 0,
      totalPlanCount: 1,
      blockedSampleCount: 1,
      missingSkuConfigCount: 1,
      missingSemanticRuleCount: 0,
      missingVendorProductCount: 0,
      missingVendorCostCenterCount: 0,
      ambiguousSkuConfigCount: 0,
    })
    vi.mocked(listAuthorableShops).mockResolvedValue({ items: [], canCreateGlobal: false })
    vi.mocked(listUnmatchedItems).mockResolvedValue({
      items: [
        {
          id: 'item-1',
          orderItemId: 'item-1',
          sku: 'J2501-TS1S-01',
          blockingReasons: ['LISTING_NOT_FOUND'],
          blockedStage: 'PRODUCT_MAPPING',
          recommendedFixTypes: ['SKU_CONFIG'],
          skuMapping: { configCode: 'TS1S' },
        },
      ],
      pagination: { total: 1, page: 1, limit: 50 },
    })
    vi.mocked(previewOrderItem).mockResolvedValue({
      ready: false,
      blockingReasons: ['LISTING_NOT_FOUND'],
      skuNormalization: { originalSku: 'J2501-TS1S-01', canonicalSku: 'J2501-TS1S-01' },
      skuMapping: { configCode: 'TS1S' },
    })
    vi.mocked(searchVendorCandidates).mockResolvedValue({
      orderItemId: 'item-1',
      signals: {},
      items: [
        {
          vendor: { id: 'vendor-1', name: 'Vendor One' },
          vendorProduct: { id: 'product-1', name: 'Product A' },
          vendorCostCenter: {
            id: 'cost-1',
            code: 'CC-M-BLACK',
            standardSize: 'M',
            standardColor: 'Black',
          },
          match: { score: 95, confidence: 'HIGH', reasons: [] },
        },
      ],
      pagination: { total: 1, page: 1, limit: 20 },
    })
    vi.mocked(selectFulfillmentCandidate).mockResolvedValue({ id: 'plan-1' })
  })

  it('never loads rule inventory and links the selected blocker to its focused page', async () => {
    renderPage({ ...account, permissions: ['MAPPING:READ', 'MAPPING:WRITE'] })
    fireEvent.click((await screen.findByText('J2501-TS1S-01')).closest('[role="button"]')!)

    const link = await screen.findByRole('link', { name: /Fix in Product mapping/ })
    expect(link).toHaveAttribute('href', expect.stringContaining('/portal/mapping?'))
    expect(link).toHaveAttribute('href', expect.stringContaining('tab=product-mapping'))
    expect(link).toHaveAttribute('href', expect.stringContaining('orderItemId=item-1'))
    expect(listMappingRules).not.toHaveBeenCalled()
  })

  it('does not refetch on scroll and hides write controls for readers', async () => {
    renderPage()
    await screen.findByText('J2501-TS1S-01')
    fireEvent.scroll(window)
    await waitFor(() => expect(listUnmatchedItems).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('button', { name: 'Recheck safe items' })).not.toBeInTheDocument()
    expect(listAuthorableShops).not.toHaveBeenCalled()
  })

  it('searches and applies a manual vendor candidate from the selected item', async () => {
    renderPage({ ...account, permissions: ['MAPPING:READ', 'MAPPING:WRITE'] })
    fireEvent.click((await screen.findByText('J2501-TS1S-01')).closest('[role="button"]')!)

    fireEvent.click((await screen.findByText('Find vendor candidate')).closest('button')!)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await waitFor(() => expect(searchVendorCandidates).toHaveBeenCalled())
    fireEvent.mouseDown(screen.getByLabelText('Vendor'))
    fireEvent.click(await screen.findByText('Vendor One'))
    fireEvent.mouseDown(screen.getByLabelText('Vendor product'))
    fireEvent.click(await screen.findByText('Product A'))
    fireEvent.mouseDown(screen.getByLabelText('Normalized size'))
    fireEvent.click((await screen.findAllByText('M')).at(-1)!)
    fireEvent.mouseDown(screen.getByLabelText('Normalized color'))
    fireEvent.click((await screen.findAllByText('Black')).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Apply candidate' }))

    await waitFor(() =>
      expect(selectFulfillmentCandidate).toHaveBeenCalledWith('item-1', {
        vendorProductId: 'product-1',
        vendorCostCenterId: 'cost-1',
      }),
    )
  })

  it('opens a linked order item directly in the workbench', async () => {
    renderPage(
      { ...account, permissions: ['MAPPING:READ', 'MAPPING:WRITE'] },
      '/portal/mapping/workbench?orderItemId=item-1',
    )

    await waitFor(() => expect(previewOrderItem).toHaveBeenCalledWith('item-1'))
    expect(await screen.findByText('Find vendor candidate')).toBeInTheDocument()
  })
})
