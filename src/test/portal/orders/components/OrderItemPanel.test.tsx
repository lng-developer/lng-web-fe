import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { OrderWorkbenchItem } from '@/features/portal/orders/api/orderApi'
import { OrderItemPanel } from '@/features/portal/orders/components/OrderItemPanel'
import i18n from '@/shared/i18n/i18n'

afterEach(cleanup)

it('opens saved Etsy Media image instead of source thumbnail', async () => {
  await i18n.changeLanguage('en')
  const onOpenImageViewer = vi.fn()
  const item = {
    item: {
      id: 'item',
      salesChannelCode: 'ETSY',
      quantity: 1,
      listingImageAssetId: 'asset',
      listingImageUrl: 'https://i.etsystatic.com/large.jpg',
      listingImageThumbnailUrl: 'https://i.etsystatic.com/thumb.jpg',
    },
    workflow: { nextActions: [], blockers: [] },
    pricing: {},
  } as unknown as OrderWorkbenchItem
  render(
    <AppProviders>
      <OrderItemPanel
        item={item}
        canWrite={false}
        canOperate={false}
        pending={false}
        mappingRecheckPending={false}
        onAction={vi.fn()}
        onConfirm={vi.fn()}
        onHistory={vi.fn()}
        onOpenImageViewer={onOpenImageViewer}
      />
    </AppProviders>,
  )
  fireEvent.click(screen.getByRole('img', { name: i18n.t('orders.fields.mainListingImage') }))
  expect(onOpenImageViewer).toHaveBeenCalledWith(
    expect.anything(),
    '/api/media/assets/asset/download',
    ['/api/media/assets/asset/download'],
  )
  const image = screen.getByRole('img', { name: i18n.t('orders.fields.mainListingImage') })
  fireEvent.error(image)
  expect(image).toHaveAttribute('src', 'https://i.etsystatic.com/thumb.jpg')
})

it('shows Etsy listing identity and variations rather than an empty Amazon identity', async () => {
  await i18n.changeLanguage('en')
  const item = {
    item: {
      id: 'item',
      salesChannelCode: 'ETSY',
      externalListingId: '4584102909',
      externalItemId: '5243047383',
      variations: 'Size: 8in, Border: Red, Personalization: Aiden/Alabama',
      title: 'Custom sign',
      quantity: 1,
      status: 'IMPORTED',
    },
    workflow: { nextActions: [], blockers: [] },
    pricing: {},
    customization: {
      inputs: [
        { type: 'OPTION', label: 'Size', value: '8in' },
        { type: 'OPTION', label: 'Border', value: 'Red' },
        { type: 'TEXT', label: 'Personalization', value: 'Aiden/Alabama' },
        {
          type: 'TEXT',
          label: 'Personalization',
          value: 'Size: 8in Border: Red Personalization: Aiden/Alabama',
        },
        { type: 'TEXT', label: 'Other instruction', value: 'Keep the original capitalization' },
      ],
    },
  } as unknown as OrderWorkbenchItem
  render(
    <AppProviders>
      <OrderItemPanel
        item={item}
        canWrite={false}
        canOperate={false}
        pending={false}
        mappingRecheckPending={false}
        onAction={vi.fn()}
        onConfirm={vi.fn()}
        onHistory={vi.fn()}
        onOpenImageViewer={vi.fn()}
      />
    </AppProviders>,
  )
  expect(screen.getAllByText('4584102909').length).toBeGreaterThan(0)
  expect(screen.queryByText('5243047383')).not.toBeInTheDocument()
  expect(screen.queryByText('Custom sign')).not.toBeInTheDocument()
  const purchased = screen.getByRole('region', { name: 'Customization' })
  expect(within(purchased).getByText('8in')).toBeInTheDocument()
  expect(within(purchased).getByText('Red')).toBeInTheDocument()
  expect(within(purchased).getByText('Aiden/Alabama')).toBeVisible()
  expect(within(purchased).getByText('Personalization')).toBeVisible()
  expect(within(purchased).queryByText('View details')).not.toBeInTheDocument()
  expect(
    within(purchased).queryByText('Other instruction: Keep the original capitalization'),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByText('Production mapping, separate from customer selection.'),
  ).not.toBeInTheDocument()
  expect(screen.queryByText('ASIN')).not.toBeInTheDocument()
  expect(
    screen
      .getAllByRole('link')
      .some((link) => link.getAttribute('href') === 'https://www.etsy.com/listing/4584102909'),
  ).toBe(true)
})

it('keeps Amazon identity and customization in the existing panel', async () => {
  await i18n.changeLanguage('en')
  const item = {
    item: { id: 'amazon-item', salesChannelCode: 'AMAZON', asin: 'B012345678', quantity: 1 },
    workflow: { nextActions: [], blockers: [] },
    pricing: {},
    customization: { inputs: [{ type: 'TEXT', label: 'Name', value: 'Alice' }] },
  } as unknown as OrderWorkbenchItem
  render(
    <AppProviders>
      <OrderItemPanel
        item={item}
        canWrite={false}
        canOperate={false}
        pending={false}
        mappingRecheckPending={false}
        onAction={vi.fn()}
        onConfirm={vi.fn()}
        onHistory={vi.fn()}
        onOpenImageViewer={vi.fn()}
      />
    </AppProviders>,
  )
  expect(screen.getAllByText('ASIN').length).toBeGreaterThan(0)
  expect(screen.getByText('Alice')).toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Customer selection' })).not.toBeInTheDocument()
})
