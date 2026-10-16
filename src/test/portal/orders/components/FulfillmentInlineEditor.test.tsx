import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import * as mappingApi from '@/features/portal/mapping/api/mappingApi'
import type { OrderWorkbenchItem } from '@/features/portal/orders/api/orderApi'
import { FulfillmentInlineEditor } from '@/features/portal/orders/pages/FulfillmentInlineEditor'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/portal/mapping/api/mappingApi', async (original) => ({
  ...(await original<typeof mappingApi>()),
  searchMappingProducts: vi.fn().mockResolvedValue({
    items: [{ id: 'product', name: 'Napkin', vendor: { id: 'vendor', name: 'LNG' } }],
    pagination: { total: 1, page: 1, limit: 20 },
  }),
  getMappingVendorProductOptions: vi.fn().mockResolvedValue({
    dimensions: { hasSize: true, hasColor: true },
    options: { sizes: ['4in'], colors: ['White'] },
    candidates: [],
    allCandidates: [
      { id: 'variant', size: '4in', color: 'White', baseCostAmount: 500, currency: 'USD' },
    ],
  }),
  selectFulfillmentCandidate: vi.fn().mockResolvedValue({}),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('allows a keychain size to be selected without requiring a color', async () => {
  await i18n.changeLanguage('en')
  vi.mocked(mappingApi.getMappingVendorProductOptions).mockResolvedValueOnce({
    dimensions: { hasSize: true, hasColor: false },
    options: { sizes: ['1,9 in', '3,5 in'], colors: [] },
    candidates: [],
    allCandidates: [
      { id: 'small', size: '1,9 in', color: null, baseCostAmount: 65, currency: 'USD' },
      { id: 'large', size: '3,5 in', color: null, baseCostAmount: 100, currency: 'USD' },
    ],
  })
  render(
    <AppProviders>
      <QueryClientProvider client={new QueryClient()}>
        <FulfillmentInlineEditor canWrite item={{ item: { id: 'item' } } as OrderWorkbenchItem} />
      </QueryClientProvider>
    </AppProviders>,
  )
  expect(screen.queryByText('Not applicable')).toBeNull()
  fireEvent.mouseDown(screen.getByRole('combobox', { name: i18n.t('orders.fields.product') }))
  fireEvent.click(await screen.findByText('Napkin · LNG'))
  expect(await screen.findByText('Not applicable')).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: i18n.t('orders.fields.color') })).toBeDisabled()
  fireEvent.mouseDown(screen.getByRole('combobox', { name: i18n.t('orders.fields.size') }))
  const option = await screen.findByTitle('3,5 in')
  fireEvent.click(option)
  fireEvent.click(await screen.findByRole('button', { name: i18n.t('orders.actions.apply') }))
  await waitFor(() =>
    expect(mappingApi.selectFulfillmentCandidate).toHaveBeenCalledWith('item', {
      vendorProductId: 'product',
      vendorCostCenterId: 'large',
    }),
  )
})

it('does not offer the previous product variant while the next product is loading', async () => {
  await i18n.changeLanguage('en')
  vi.mocked(mappingApi.searchMappingProducts).mockResolvedValueOnce({
    items: [{ id: 'next', name: 'Towel', vendor: { id: 'vendor2', name: 'Other' } }],
    pagination: { total: 1, page: 1, limit: 20 },
  })
  vi.mocked(mappingApi.getMappingVendorProductOptions).mockImplementationOnce(
    () => new Promise(() => {}),
  )
  const client = new QueryClient()
  client.setQueryData(['portal', 'mapping', 'manual-options', 'old', undefined, undefined], {
    dimensions: { hasSize: false, hasColor: false },
    options: { sizes: [], colors: [] },
    candidates: [{ id: 'old-variant', baseCostAmount: 500 }],
  })
  render(
    <AppProviders>
      <QueryClientProvider client={client}>
        <FulfillmentInlineEditor
          canWrite
          item={
            {
              item: { id: 'item' },
              mapping: {
                vendorProduct: { id: 'old', name: 'Old' },
                vendor: { id: 'vendor', name: 'LNG' },
              },
            } as OrderWorkbenchItem
          }
        />
      </QueryClientProvider>
    </AppProviders>,
  )
  fireEvent.mouseDown(screen.getByRole('combobox', { name: i18n.t('orders.fields.product') }))
  fireEvent.click(await screen.findByText('Towel · Other'))
  expect(screen.queryByRole('button', { name: i18n.t('orders.actions.apply') })).toBeNull()
})

it('selects a product without selecting vendor first and saves its only variant', async () => {
  await i18n.changeLanguage('en')
  render(
    <AppProviders>
      <QueryClientProvider client={new QueryClient()}>
        <FulfillmentInlineEditor canWrite item={{ item: { id: 'item' } } as OrderWorkbenchItem} />
      </QueryClientProvider>
    </AppProviders>,
  )
  const product = screen.getByRole('combobox', { name: i18n.t('orders.fields.product') })
  expect(product).not.toBeDisabled()
  expect(screen.queryByRole('combobox', { name: i18n.t('orders.fields.vendor') })).toBeNull()
  fireEvent.mouseDown(product)
  fireEvent.click(await screen.findByText('Napkin · LNG'))
  fireEvent.click(await screen.findByRole('button', { name: i18n.t('orders.actions.apply') }))
  await waitFor(() =>
    expect(mappingApi.selectFulfillmentCandidate).toHaveBeenCalledWith('item', {
      vendorProductId: 'product',
      vendorCostCenterId: 'variant',
    }),
  )
})
