import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App as AntdApp } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/mapping/api/mappingApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/portal/mapping/api/mappingApi')>()
  return {
    ...actual,
    listMappingRules: vi.fn(),
    listAuthorableShops: vi.fn(),
    previewOrderItem: vi.fn(),
    previewMappingRule: vi.fn(),
    findMappingRuleConflicts: vi.fn(),
  }
})
vi.mock('@/features/portal/catalog/api/catalogApi', () => ({ getListingOptions: vi.fn() }))
vi.mock('@/features/portal/vendors/api/vendorApi', () => ({ listVendors: vi.fn() }))

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { getListingOptions } from '@/features/portal/catalog/api/catalogApi'
import {
  findMappingRuleConflicts,
  listAuthorableShops,
  listMappingRules,
  previewMappingRule,
  previewOrderItem,
} from '@/features/portal/mapping/api/mappingApi'
import { MappingRulePage } from '@/features/portal/mapping/pages/MappingRulePage'
import { listVendors } from '@/features/portal/vendors/api/vendorApi'
import i18n from '@/shared/i18n/i18n'

const account: CurrentAccount = {
  account: { id: 'operator-1', email: 'operator@lng.co', mustChangePassword: false },
  roles: [],
  permissions: ['MAPPING:READ', 'MAPPING:WRITE'],
  scopes: [],
  profileSetupRequired: false,
}

describe('MappingRulePage', () => {
  afterEach(cleanup)

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
      skuNormalization: { originalSku: 'NTL-TS-240625-05' },
      skuMapping: { configCode: 'TS1S' },
      productTypeGroup: { id: '69b12f8d99b2e3b197021d76' },
      blockingReasons: ['LISTING_NOT_FOUND'],
    })
    vi.mocked(previewMappingRule).mockResolvedValue({ items: [] })
    vi.mocked(findMappingRuleConflicts).mockResolvedValue({ conflicts: [] })
    vi.mocked(getListingOptions).mockResolvedValue({
      salesChannels: [],
      shops: [],
      productTypeGroups: [{ id: '69b12f8d99b2e3b197021d76', name: 'T-shirt', code: 'TS' }],
      internalTemplates: [],
    })
    vi.mocked(listVendors).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 100 },
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
    expect((await screen.findAllByText('Product group')).length).toBeGreaterThan(0)
    expect(screen.queryByDisplayValue('69b12f8d99b2e3b197021d76')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('opens create in a modal and never uses an ObjectID as the rule label', async () => {
    vi.mocked(listMappingRules).mockResolvedValue({
      items: [{ id: '69b12f8d99b2e3b197021d76', status: 'ACTIVE' }],
      pagination: { total: 1, page: 1, limit: 100 },
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createMemoryRouter(
      [
        {
          id: 'workspace',
          path: '/portal/mapping',
          loader: () => account,
          element: <MappingRulePage pageKey="product-mapping" />,
        },
      ],
      { initialEntries: ['/portal/mapping?tab=product-mapping'] },
    )
    render(
      <AntdApp>
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntdApp>,
    )

    expect((await screen.findAllByText('Unavailable')).length).toBeGreaterThan(0)
    expect(screen.queryByText('69b12f8d99b2e3b197021d76')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Create rule/ }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('keeps combined parser settings out of product mappings', async () => {
    renderRuleTable()

    fireEvent.click(await screen.findByRole('button', { name: /Create rule/ }))

    expect(
      screen.queryByRole('textbox', { name: 'Product type & color keys' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: 'Product type & size keys' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Size keys' })).not.toBeInTheDocument()
  })

  const renderRuleTable = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createMemoryRouter(
      [
        {
          id: 'workspace',
          path: '/portal/mapping',
          loader: () => account,
          element: <MappingRulePage pageKey="product-mapping" />,
        },
      ],
      { initialEntries: ['/portal/mapping?tab=product-mapping'] },
    )
    render(
      <AntdApp>
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntdApp>,
    )
  }

  it('opens update from a table row', async () => {
    vi.mocked(listMappingRules).mockResolvedValue({
      items: [{ id: 'rule-1', configCode: 'TS1S', status: 'ACTIVE', priority: 10 }],
      pagination: { total: 1, page: 1, limit: 100 },
    })
    renderRuleTable()

    const row = (await screen.findByText('TS1S')).closest('tr')
    expect(row).not.toBeNull()
    fireEvent.click(row!)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('previews an originating order item with the SKU string contract', async () => {
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
      { initialEntries: ['/portal/mapping/product-mapping?orderItemId=item-1&configCode=TS1S'] },
    )
    render(
      <AntdApp>
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntdApp>,
    )

    await screen.findByRole('dialog')
    await waitFor(() =>
      expect(screen.getByLabelText('Product group').closest('.ant-select')).toHaveTextContent(
        'T-shirt',
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))

    await waitFor(() =>
      expect(previewMappingRule).toHaveBeenCalledWith(
        expect.objectContaining({
          samples: ['NTL-TS-240625-05'],
        }),
      ),
    )
  })
})
