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
  expect(within(purchased).getAllByText('Personalization')[0]).toBeVisible()
  expect(within(purchased).queryByText('View details')).not.toBeInTheDocument()
  expect(
    within(purchased).getByText(/Other instruction: Keep the original capitalization/),
  ).toBeVisible()
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

it('renders scale output directly as an image like main listing image', async () => {
  await i18n.changeLanguage('vi')
  const onOpenImageViewer = vi.fn()
  const item = {
    item: { id: 'item-scaled', salesChannelCode: 'AMAZON', asin: 'B0HQN286S5', quantity: 1 },
    workflow: { nextActions: [], blockers: [] },
    pricing: {},
    production: {
      status: 'QC_PENDING',
      scaleStatus: 'SCALED',
      scaledOutputs: [
        {
          id: 'scale-1',
          slotKey: 'FRONT',
          slotLabel: 'Front',
          outputAssetId: 'asset-front',
          outputAssetDownloadUrl: '/api/media/assets/asset-front/download',
        },
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
        onOpenImageViewer={onOpenImageViewer}
      />
    </AppProviders>,
  )
  expect(screen.getByText('File output scale')).toBeInTheDocument()
  const scaleImage = screen.getByRole('img', { name: 'File output scale' })
  expect(scaleImage).toBeInTheDocument()
  fireEvent.click(scaleImage)
  expect(onOpenImageViewer).toHaveBeenCalledWith(
    expect.anything(),
    '/api/media/assets/asset-front/download',
    expect.arrayContaining(['/api/media/assets/asset-front/download']),
  )
})

it('renders tracking number in a single copyable chip with history button', async () => {
  await i18n.changeLanguage('vi')
  const onHistory = vi.fn()
  const item = {
    item: { id: 'item-tracking', salesChannelCode: 'AMAZON', asin: 'B0HQN28655', quantity: 1 },
    workflow: { nextActions: [], blockers: [] },
    pricing: {},
    tracking: {
      trackingNumber: '4207261630339214490374008505076419',
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
        onHistory={onHistory}
        onOpenImageViewer={vi.fn()}
      />
    </AppProviders>,
  )
  expect(screen.getByText('Tracking')).toBeInTheDocument()
  expect(screen.getByText('4207261630339214490374008505076419')).toBeInTheDocument()
  const historyBtn = screen.getByRole('button', { name: i18n.t('orders.actions.viewHistory') })
  expect(historyBtn).toBeInTheDocument()
  fireEvent.click(historyBtn)
  expect(onHistory).toHaveBeenCalledWith(expect.anything(), 'item-tracking')
})

it('stacks multiple scale outputs vertically', async () => {
  await i18n.changeLanguage('vi')
  const item = {
    item: { id: 'item-scaled-2', salesChannelCode: 'AMAZON', asin: 'B0HQN286S5', quantity: 1 },
    workflow: { nextActions: [], blockers: [] },
    pricing: {},
    production: {
      status: 'QC_PENDING',
      scaleStatus: 'SCALED',
      scaledOutputs: [
        {
          id: 'scale-front',
          slotKey: 'FRONT',
          slotLabel: 'Front',
          outputAssetId: 'asset-front',
          outputAssetDownloadUrl: '/api/media/assets/asset-front/download',
        },
        {
          id: 'scale-back',
          slotKey: 'BACK',
          slotLabel: 'Back',
          outputAssetId: 'asset-back',
          outputAssetDownloadUrl: '/api/media/assets/asset-back/download',
        },
      ],
    },
  } as unknown as OrderWorkbenchItem
  const { container } = render(
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
  expect(screen.getByText('File output scale (Front)')).toBeInTheDocument()
  expect(screen.getByText('File output scale (Back)')).toBeInTheDocument()
  expect(container.querySelector('[class*="scaledOutputsStack"]')).toBeInTheDocument()
})

it.each([
  [false, 'NEED_PRODUCTION', false],
  [true, 'READY_TO_SEND_VENDOR', false],
  [true, 'SHIPPED', false],
  [true, 'NEED_PRODUCTION', true],
])(
  'gates quantity editing for permission %s and status %s',
  async (canOperate, status, editable) => {
    await i18n.changeLanguage('en')
    const item = {
      item: { id: 'item', quantity: 1, status },
      workflow: { nextActions: [], blockers: [] },
      pricing: {},
    } as unknown as OrderWorkbenchItem
    const onConfirm = vi.fn()
    render(
      <AppProviders>
        <OrderItemPanel
          item={item}
          canWrite={canOperate}
          canOperate={canOperate}
          pending={false}
          mappingRecheckPending={false}
          onAction={vi.fn()}
          onConfirm={onConfirm}
          onHistory={vi.fn()}
          onOpenImageViewer={vi.fn()}
        />
      </AppProviders>,
    )
    const button = screen.queryByRole('button', { name: 'Edit quantity' })
    if (editable) {
      expect(button).toBeInTheDocument()
      fireEvent.click(button!)
      expect(onConfirm).toHaveBeenCalledWith(expect.anything(), 'quantity', item)
    } else {
      expect(button).not.toBeInTheDocument()
    }
  },
)
