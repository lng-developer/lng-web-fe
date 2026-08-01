import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { App as AntdApp } from 'antd'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/mapping/api/mappingApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/portal/mapping/api/mappingApi')>()
  return {
    ...actual,
    listMappingRules: vi.fn(),
    listAuthorableShops: vi.fn(),
    previewOrderItem: vi.fn(),
  }
})

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  listAuthorableShops,
  listMappingRules,
  previewOrderItem,
} from '@/features/portal/mapping/api/mappingApi'
import { MappingRulePage } from '@/features/portal/mapping/pages/MappingRulePage'
import i18n from '@/shared/i18n/i18n'

const account: CurrentAccount = {
  account: { id: 'operator-1', email: 'operator@lng.co', mustChangePassword: false },
  roles: [],
  permissions: ['MAPPING:READ', 'MAPPING:WRITE'],
  scopes: [],
  profileSetupRequired: false,
}

describe('MappingRulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    void i18n.changeLanguage('en')
    vi.mocked(listMappingRules).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 100 },
    })
    vi.mocked(listAuthorableShops).mockResolvedValue({ canCreateGlobal: true, items: [] })
    vi.mocked(previewOrderItem).mockResolvedValue({
      ready: false,
      skuMapping: { configCode: 'TS1S' },
      blockingReasons: ['LISTING_NOT_FOUND'],
    })
  })

  it('loads only its rule type and prefills context from the originating item', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createMemoryRouter(
      [
        {
          id: 'workspace',
          path: '/portal/mapping/product-mapping',
          loader: () => account,
          element: <MappingRulePage pageKey="product-mapping" />,
        },
      ],
      {
        initialEntries: [
          '/portal/mapping/product-mapping?orderItemId=item-1&configCode=TS1S&returnTo=/portal/mapping/workbench',
        ],
      },
    )
    render(
      <AntdApp>
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntdApp>,
    )

    await waitFor(() =>
      expect(listMappingRules).toHaveBeenCalledWith('skuConfig', expect.anything()),
    )
    expect(listMappingRules).toHaveBeenCalledTimes(1)
    expect(previewOrderItem).toHaveBeenCalledWith('item-1')
    expect(screen.getByRole('textbox', { name: 'Config code' })).toHaveValue('TS1S')
  })
})
