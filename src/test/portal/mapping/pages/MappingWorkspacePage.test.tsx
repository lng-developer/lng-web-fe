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
import { MappingWorkspacePage } from '@/features/portal/mapping/pages/MappingWorkspacePage'
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
  const router = createMemoryRouter([
    {
      id: 'workspace',
      path: '/',
      loader: () => currentAccount,
      element: <MappingWorkspacePage />,
    },
  ])
  return render(
    <AntdApp>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AntdApp>,
  )
}

describe('MappingWorkspacePage', () => {
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
    vi.mocked(listMappingRules).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 100 },
    })
    vi.mocked(listUnmatchedItems).mockResolvedValue({
      items: [
        {
          id: 'item-1',
          sku: 'J2501-TS1S-01',
          blockingReasons: ['MISSING_SKU_CONFIG'],
          recommendedFixTypes: ['CREATE_SKU_CONFIG_RULE'],
        },
      ],
      pagination: { total: 1, page: 1, limit: 50 },
    })
    vi.mocked(previewOrderItem).mockResolvedValue({
      ready: false,
      blockingReasons: ['MISSING_SKU_CONFIG'],
      skuNormalization: { originalSku: 'J2501-TS1S-01', canonicalSku: 'J2501-TS1S-01' },
      skuMapping: { configCode: 'TS1S' },
    })
  })

  it('loads once and does not refetch mapping data on page scroll', async () => {
    renderPage()
    await screen.findByText('J2501-TS1S-01')

    expect(listUnmatchedItems).toHaveBeenCalledTimes(1)
    fireEvent.scroll(window)
    fireEvent.scroll(document)

    await waitFor(() => expect(listUnmatchedItems).toHaveBeenCalledTimes(1))
  })

  it('keeps write controls and authorable-shop calls hidden for readers', async () => {
    renderPage()
    await screen.findByText('Mapping pipeline')

    expect(screen.queryByRole('button', { name: 'Recheck safe items' })).not.toBeInTheDocument()
    expect(listAuthorableShops).not.toHaveBeenCalled()
  })

  it('loads the rule editor only after an operator chooses to fix an item', async () => {
    vi.mocked(listAuthorableShops).mockResolvedValue({ canCreateGlobal: true, items: [] })
    renderPage({ ...account, permissions: ['MAPPING:READ', 'MAPPING:WRITE'] })

    fireEvent.click(await screen.findByRole('button', { name: /J2501-TS1S-01/i }))
    expect(listMappingRules).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Fix now/i }))

    expect(await screen.findByText('Rule editor')).toBeVisible()
    await waitFor(() => expect(listMappingRules).toHaveBeenCalledTimes(1))
  })
})
