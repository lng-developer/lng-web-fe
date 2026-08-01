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
  }
})

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  getMappingSummary,
  listAuthorableShops,
  listMappingRules,
  listUnmatchedItems,
  previewOrderItem,
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

function renderPage(currentAccount = account) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      {
        id: 'workspace',
        path: '/portal/mapping/workbench',
        loader: () => currentAccount,
        element: <MappingWorkbenchPage />,
      },
      { path: '/portal/mapping/product-mapping', element: <div>Product Mapping</div> },
    ],
    { initialEntries: ['/portal/mapping/workbench'] },
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
  })

  it('never loads rule inventory and links the selected blocker to its focused page', async () => {
    renderPage({ ...account, permissions: ['MAPPING:READ', 'MAPPING:WRITE'] })
    fireEvent.click(await screen.findByRole('button', { name: /J2501-TS1S-01/i }))

    const link = await screen.findByRole('link', { name: 'Open Product mapping' })
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('/portal/mapping/product-mapping?'),
    )
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
})
