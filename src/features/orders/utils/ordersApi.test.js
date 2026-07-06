import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOrderListQuery,
  getOrderTabKey,
  mapApiOrderToOrderRow,
  mapApiTabCounts,
  mapOrderDetail,
} from './ordersApi.js'

test('buildOrderListQuery maps supported filters to backend query params', () => {
  assert.deepEqual(
    buildOrderListQuery({
      tab: 'missingPsd',
      search: '  113-1234567-1234567 ',
      channel: 'amazon',
      shopId: '660000000000000000000201',
      seller: 'dao-quang-tung',
      dateRange: {
        start: { format: () => '2026-06-01' },
        end: { format: () => '2026-06-30' },
      },
      page: 2,
      limit: 25,
    }),
    {
      page: 2,
      limit: 25,
      tab: 'NO_PSD',
      search: '113-1234567-1234567',
      salesChannelCode: 'AMAZON',
      shopId: '660000000000000000000201',
      seller: 'dao-quang-tung',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
    },
  )
})

test('buildOrderListQuery defaults to 10 orders per page', () => {
  assert.deepEqual(buildOrderListQuery({ tab: 'all' }), {
    page: 1,
    limit: 10,
    tab: 'ALL',
  })
})

test('mapApiTabCounts maps backend tab counts to UI tab keys', () => {
  assert.deepEqual(
    mapApiTabCounts({
      ALL: 20,
      NEW_ORDER: 3,
      NO_COST_CENTER: 2,
      NO_PSD: 4,
      PAYMENT_PENDING: 1,
      IN_PROGRESS: 5,
      SHIPPED: 6,
      DELIVERED: 7,
      CANCELLED: 8,
      OPEN_CASE: 9,
    }),
    {
      all: 20,
      new: 3,
      missingCostCenter: 2,
      missingPsd: 4,
      awaitingPayment: 1,
      processing: 5,
      shipped: 6,
      delivered: 7,
      cancelled: 8,
      openCase: 9,
    },
  )
})

test('getOrderTabKey maps backend tab flags and status to available UI tabs', () => {
  assert.equal(getOrderTabKey({ flags: { missingPsd: true }, status: 'PROCESSING' }), 'missingPsd')
  assert.equal(
    getOrderTabKey({ flags: { awaitingPayment: true }, status: 'IMPORTED' }),
    'awaitingPayment',
  )
  assert.equal(getOrderTabKey({ flags: { delivered: true }, status: 'SHIPPED' }), 'delivered')
  assert.equal(getOrderTabKey({ flags: { openCase: true }, status: 'PROCESSING' }), 'openCase')
  assert.equal(getOrderTabKey({ status: 'IMPORTED' }), 'new')
})

test('mapApiOrderToOrderRow builds a display row from backend order fields', () => {
  const row = mapApiOrderToOrderRow(
    {
      id: 'order-id',
      externalOrderId: '113-1234567-1234567',
      salesChannelCode: 'AMAZON',
      shopId: 'shop-id',
      status: 'IMPORTED',
      createdAt: '2026-06-20T10:00:00.000Z',
      orderedAt: '2026-06-18T08:00:00.000Z',
      buyer: { name: 'Ethan' },
      itemsSummary: [{ sku: 'SKU-1', title: 'Custom Hoodie', quantity: 2 }],
      itemsCount: 1,
      totalAmount: 2599,
      currency: 'USD',
    },
    {
      shopNameById: new Map([['shop-id', 'Tan tan']]),
      locale: 'en',
    },
  )

  assert.equal(row.id, '113-1234567-1234567')
  assert.equal(row.apiId, 'order-id')
  assert.equal(row.channel, 'amazon')
  assert.equal(row.shopId, 'shop-id')
  assert.equal(row.shop, 'Tan tan')
  assert.equal(row.customer, 'Ethan')
  assert.equal(row.status, 'IMPORTED')
  assert.equal(row.tabKey, 'new')
  assert.equal(row.shippingType, '-')
  assert.equal(row.product.sku, 'SKU-1')
  assert.equal(row.basecost, '$25.99')
})

test('mapOrderDetail combines order item and customization payload data', () => {
  const detail = mapOrderDetail({
    order: { externalOrderId: '113-1234567-1234567' },
    items: [
      {
        id: 'item-id',
        sku: 'SKU-1',
        asin: 'B000TEST',
        title: 'Custom Hoodie',
        quantity: 2,
        price: { itemPriceAmount: 2599, currency: 'USD' },
        status: 'CUSTOMIZATION_PARSED',
        variantRaw: { Size: 'L', Color: 'Sand' },
      },
    ],
    customizationsByItemId: new Map([
      [
        'item-id',
        {
          customerInputs: { name: 'NURSE' },
          extractedImages: [{ secureUrl: 'https://example.test/image.jpg' }],
          review: { status: 'PARSED' },
        },
      ],
    ]),
  })

  assert.equal(detail.product.sku, 'SKU-1')
  assert.equal(detail.product.asin, 'B000TEST')
  assert.equal(detail.customization.customerName, 'NURSE')
  assert.deepEqual(detail.customization.customerPhoto, ['https://example.test/image.jpg'])
  assert.equal(detail.fulfillment.quantity, '2')
})

test('mapOrderDetail normalizes object variant and customer input values for rendering', () => {
  const detail = mapOrderDetail({
    order: { externalOrderId: '113-7654321-7654321' },
    items: [
      {
        id: 'item-object-id',
        title: 'Custom Tee',
        quantity: 1,
        variantRaw: {
          Color: { label: 'Sand', name: 'shirt_color', value: 'sand' },
          Size: { label: 'XL', name: 'shirt_size', value: 'xl' },
        },
      },
    ],
    customizationsByItemId: new Map([
      [
        'item-object-id',
        {
          customerInputs: {
            custom_name: { label: 'Name', name: 'custom_name', value: 'MIA' },
          },
        },
      ],
    ]),
  })

  assert.equal(detail.customization.shirtColor, 'Sand')
  assert.equal(detail.customization.size, 'XL')
  assert.equal(detail.customization.customerName, 'MIA')
  assert.equal(detail.fulfillment.color, 'Sand')
  assert.equal(detail.fulfillment.size, 'XL')
})

test('mapOrderDetail reads expanded customization view payloads', () => {
  const detail = mapOrderDetail({
    order: { externalOrderId: '113-9999999-9999999' },
    items: [
      {
        id: 'item-expanded-id',
        title: 'Custom Sweatshirt',
        quantity: 1,
        variantRaw: {},
      },
    ],
    customizationsByItemId: new Map([
      [
        'item-expanded-id',
        {
          customerInputs: {
            options: [{ label: 'Shirt Color', name: 'shirt_color', value: 'Sand' }],
            texts: [{ label: 'Name', name: 'custom_name', value: 'NURSE' }],
          },
          imageAssets: [{ secureUrl: 'https://example.test/customer-photo.jpg' }],
        },
      ],
    ]),
  })

  assert.equal(detail.customization.shirtColor, 'Sand')
  assert.equal(detail.customization.customerName, 'NURSE')
  assert.deepEqual(detail.customization.customerPhoto, ['https://example.test/customer-photo.jpg'])
})
