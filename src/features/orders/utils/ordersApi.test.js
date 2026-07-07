import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOrderListQuery,
  getOrderTabKey,
  mapApiOrderToOrderRow,
  mapApiTabCounts,
  mapOrderDetail,
  mapWorkbenchRows,
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

test('mapOrderDetail maps every backend order item status to a translation key', () => {
  const expectedStatusKeys = {
    NEW: 'orders.values.status.new',
    MAPPING_PENDING: 'orders.values.status.mappingPending',
    CUSTOMIZATION_PENDING: 'orders.values.status.customizationPending',
    CUSTOMIZATION_PARSED: 'orders.values.status.customizationParsed',
    FULFILLMENT_PLANNING: 'orders.values.status.fulfillmentPlanning',
    FULFILLMENT_READY: 'orders.values.status.fulfillmentReady',
    NEED_PRODUCTION: 'orders.values.status.needProduction',
    IN_PRODUCTION: 'orders.values.status.inProduction',
    QC_REJECTED: 'orders.values.status.qcRejected',
    READY_TO_SEND_VENDOR: 'orders.values.status.readyToSendVendor',
    SENT_TO_VENDOR: 'orders.values.status.sentToVendor',
    TRACKING_PENDING: 'orders.values.status.trackingPending',
    SHIPPED: 'orders.values.status.shipped',
    CANCELLED: 'orders.values.status.cancelled',
    REFUNDED: 'orders.values.status.refunded',
    FAILED: 'orders.values.status.failed',
  }

  Object.entries(expectedStatusKeys).forEach(([status, statusKey]) => {
    const detail = mapOrderDetail({
      items: [{ id: `item-${status}`, status }],
    })

    assert.equal(detail.fulfillment.statusKey, statusKey)
  })
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

test('mapWorkbenchRows builds order rows with embedded expanded detail', () => {
  const rows = mapWorkbenchRows(
    [
      {
        order: {
          id: '660000000000000000000301',
          externalOrderId: '114-1',
          createdAt: '2026-06-02T00:00:00.000Z',
          orderedAt: '2026-06-01T00:00:00.000Z',
          status: 'IMPORTED',
          buyer: { name: 'Buyer' },
          customerPaidAmount: 4217,
          pricing: {
            customerPaidAmount: 4217,
            baseCostAmount: 894,
            totalCostAmount: 1894,
            currency: 'USD',
            costCenterStatus: 'PRESENT',
          },
          currency: 'USD',
          shopId: '660000000000000000000201',
          shop: { id: '660000000000000000000201', name: 'Football US Shop' },
          salesChannelCode: 'AMAZON',
          marketplaceCode: 'AMAZON_US',
          shippingService: { level: 'Standard' },
          caseStatus: 'NONE',
        },
        items: [
          {
            item: {
              id: '660000000000000000000401',
              orderId: '660000000000000000000301',
              sku: 'SKU-1',
              title: 'Custom Shirt',
              asin: 'B000TEST',
              quantity: 1,
              status: 'CUSTOMIZATION_PARSED',
            },
            seller: { employeeCode: 'J2508', name: 'Nguyen Duc Son' },
            customization: {
              status: 'PARSED',
              inputs: [
                { type: 'TEXT', label: 'Custom Name', value: 'Hannah' },
                { type: 'OPTION', label: 'Select Size', value: 'M' },
                { type: 'OPTION', label: 'Shirt Color', value: 'Pepper' },
                {
                  type: 'IMAGE',
                  label: 'Customer Photo',
                  secureUrl: 'https://image.test/a.jpg',
                },
              ],
            },
            mapping: {
              status: 'READY',
              vendorProduct: { code: 'PRODUCT_1717', name: 'T-Shirt' },
              vendorCostCenter: { sku: 'UT-1717-PER-M', size: 'M', color: 'PEPPER' },
            },
            pricing: {
              customerPaidAmount: 1000,
              baseCostAmount: 894,
              totalCostAmount: 1894,
              currency: 'USD',
            },
            production: {
              taskId: '660000000000000000000601',
              status: 'READY_TO_SEND_VENDOR',
              scaleStatus: 'SCALED',
              qcStatus: 'PASSED',
              scaleBy: '660000000000000000000903',
              qcBy: '660000000000000000000904',
            },
          },
        ],
      },
    ],
    { locale: 'en' },
  )

  assert.equal(rows.length, 1)
  assert.equal(rows[0].apiId, '660000000000000000000301')
  assert.equal(rows[0].id, '114-1')
  assert.equal(rows[0].shopId, '660000000000000000000201')
  assert.equal(rows[0].storeName, 'Football US Shop')
  assert.equal(rows[0].shippingType, 'Standard')
  assert.equal(rows[0].basecost, '$8.94')
  assert.deepEqual(rows[0].productImages, ['https://image.test/a.jpg'])
  assert.equal(rows[0].product.sku, 'SKU-1')
  assert.equal(rows[0].product.asin, 'B000TEST')
  assert.equal(rows[0].product.seller, 'Nguyen Duc Son')
  assert.equal(rows[0].product.qcBy, '660000000000000000000904')
  assert.equal(rows[0].product.scaleBy, '660000000000000000000903')
  assert.equal(rows[0].customization.customerName, 'Hannah')
  assert.equal(rows[0].customization.size, 'M')
  assert.equal(rows[0].customization.shirtColor, 'Pepper')
  assert.deepEqual(rows[0].customization.fields, [
    { label: 'Custom Name', value: 'Hannah', type: 'TEXT' },
    { label: 'Select Size', value: 'M', type: 'OPTION' },
    { label: 'Shirt Color', value: 'Pepper', type: 'OPTION' },
  ])
  assert.deepEqual(rows[0].customization.images, [
    { label: 'Customer Photo', url: 'https://image.test/a.jpg' },
  ])
  assert.equal(rows[0].fulfillment.vendorProduct, 'T-Shirt')
  assert.equal(rows[0].fulfillment.size, 'M')
  assert.equal(rows[0].fulfillment.color, 'PEPPER')
  assert.equal(rows[0].fulfillment.statusKey, 'orders.values.status.customizationParsed')
})

test('mapWorkbenchRows keeps only customization inputs with actual order values', () => {
  const rows = mapWorkbenchRows([
    {
      order: {
        id: '660000000000000000000302',
        externalOrderId: '114-2',
        status: 'IMPORTED',
        buyer: { name: 'Buyer' },
        currency: 'USD',
      },
      items: [
        {
          item: { id: '660000000000000000000402', quantity: 1 },
          customization: {
            inputs: [
              { type: 'TEXT', label: 'Custom Name on sleeve', value: null },
              { type: 'TEXT', label: 'Enter Text', value: 'Dad & Jonas est. 2026' },
              {
                type: 'OPTION',
                label: 'Select Product Type & Color',
                value: 'Comfort Colors/Pepper',
              },
              { type: 'OPTION', label: 'Priority Production', value: '' },
              {
                type: 'IMAGE',
                label: 'Upload Your Photo 1',
                secureUrl: 'https://image.test/photo.jpg',
              },
            ],
          },
        },
      ],
    },
  ])

  assert.deepEqual(rows[0].customization.fields, [
    { label: 'Enter Text', value: 'Dad & Jonas est. 2026', type: 'TEXT' },
    {
      label: 'Select Product Type & Color',
      value: 'Comfort Colors/Pepper',
      type: 'OPTION',
    },
  ])
  assert.deepEqual(rows[0].customization.images, [
    { label: 'Upload Your Photo 1', url: 'https://image.test/photo.jpg' },
  ])
})
