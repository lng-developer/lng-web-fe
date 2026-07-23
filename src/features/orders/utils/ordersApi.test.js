import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOrderListQuery,
  buildOrderSummaryQuery,
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

test('buildOrderListQuery maps operational item queues to backend tabs', () => {
  assert.deepEqual(buildOrderListQuery({ tab: 'atVendor' }), {
    page: 1,
    limit: 10,
    tab: 'SENT_TO_VENDOR',
  })
})

test('buildOrderSummaryQuery keeps filters stable when switching tabs', () => {
  assert.deepEqual(
    buildOrderSummaryQuery({
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
      search: '113-1234567-1234567',
      salesChannelCode: 'AMAZON',
      shopId: '660000000000000000000201',
      seller: 'dao-quang-tung',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
    },
  )
})

test('maps the order item CS note separately from shipment tracking note', () => {
  const [row] = mapWorkbenchRows([
    {
      order: { id: 'order-1', externalOrderId: 'order-1' },
      items: [
        {
          item: { id: 'item-1', quantity: 1, csNote: 'Confirm customer artwork' },
          tracking: { note: 'Shipment note' },
        },
      ],
    },
  ])

  assert.equal(row.itemDetails[0].fulfillment.csNote, 'Confirm customer artwork')
  assert.equal(row.itemDetails[0].fulfillment.noteKey, 'Shipment note')
})

test('mapApiTabCounts maps backend tab counts to UI tab keys', () => {
  assert.deepEqual(
    mapApiTabCounts({
      ALL: 20,
      NEW_ORDER: 3,
      NO_COST_CENTER: 2,
      NO_PSD: 4,
      SENT_TO_VENDOR: 5,
      TRACKING_PENDING: 10,
      READY_FOR_PRODUCTION: 60,
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
      atVendor: 5,
      trackingPending: 10,
      readyForProduction: 60,
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
      addressValidationStatus: 'INVALID',
      createdAt: '2026-06-20T10:00:00.000Z',
      orderedAt: '2026-06-18T08:00:00.000Z',
      buyer: { name: 'Ethan' },
      shippingService: { level: 'Std US D2D Dom', name: 'Standard' },
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
  assert.equal(row.addressValidationStatus, 'INVALID')
  assert.equal(row.status, 'IMPORTED')
  assert.equal(row.tabKey, 'new')
  assert.equal(row.shippingType, 'Std US D2D Dom')
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
      },
    ],
    customizationsByItemId: new Map([
      [
        'item-id',
        {
          customerInputs: {
            name: 'NURSE',
            options: [
              { label: 'Color', name: 'color', value: 'Sand' },
              { label: 'Size', name: 'size', value: 'XL' },
            ],
          },
          extractedImages: [{ secureUrl: 'https://example.test/image.jpg' }],
          review: { status: 'PARSED' },
        },
      ],
    ]),
  })

  assert.equal(detail.product.sku, 'SKU-1')
  assert.equal(detail.product.asin, 'B000TEST')
  assert.equal(detail.customization.customerName, 'NURSE')
  assert.equal(detail.customization.shirtColor, 'Sand')
  assert.equal(detail.customization.size, 'XL')
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

test('mapOrderDetail normalizes object customer input values for rendering', () => {
  const detail = mapOrderDetail({
    order: { externalOrderId: '113-7654321-7654321' },
    items: [
      {
        id: 'item-object-id',
        title: 'Custom Tee',
        quantity: 1,
      },
    ],
    customizationsByItemId: new Map([
      [
        'item-object-id',
        {
          customerInputs: {
            custom_name: { label: 'Name', name: 'custom_name', value: 'MIA' },
            color: { label: 'Sand', name: 'shirt_color', value: 'Sand' },
            size: { label: 'XL', name: 'shirt_size', value: 'XL' },
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

test('order detail mapper does not depend on raw variant payloads', () => {
  assert.equal(mapOrderDetail.toString().includes('variantRaw'), false)
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
          shipByDate: '2026-06-07T00:00:00.000Z',
          status: 'IMPORTED',
          addressValidationStatus: 'INVALID',
          caseStatus: 'OPEN',
          caseTitle: 'Need buyer photo',
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
          shippingService: { level: 'Std US D2D Dom', name: 'Standard' },
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
            listing: {
              productTypeGroup: { id: '660000000000000000000901' },
              previewAsset: {
                previewUrl: 'https://image.test/listing.jpg',
              },
            },
            customization: {
              status: 'PARSED',
              downloadedZip: { sourceUrlRedacted: 'https://custom.test/download.zip' },
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
              vendor: { name: 'Lenful' },
              vendorProduct: {
                code: 'PRODUCT_1717',
                name: 'T-Shirt',
              },
              vendorCostCenter: {
                sku: 'UT-1717-PER-M',
                standardSize: 'M',
                standardColor: 'PEPPER',
              },
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
            tracking: {
              carrier: 'USPS',
              trackingNumber: '9400100000000000000000',
              note: 'Vendor tracking recheck: LENFUL',
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
  assert.equal(rows[0].shippingType, 'Std US D2D Dom')
  assert.equal(rows[0].handling, '6 Days')
  assert.equal(rows[0].addressValidationStatus, 'INVALID')
  assert.equal(rows[0].caseStatus, 'OPEN')
  assert.equal(rows[0].caseTitle, 'Need buyer photo')
  assert.equal(rows[0].basecost, '$8.94')
  assert.deepEqual(rows[0].productImages, ['https://image.test/listing.jpg'])
  assert.equal(rows[0].product.sku, 'SKU-1')
  assert.equal(rows[0].product.asin, 'B000TEST')
  assert.equal(rows[0].product.seller, 'Nguyen Duc Son')
  assert.equal(rows[0].product.qcBy, '660000000000000000000904')
  assert.equal(rows[0].product.scaleBy, '660000000000000000000903')
  assert.equal(rows[0].customization.customerName, 'Hannah')
  assert.equal(rows[0].customization.customizationUrl, 'https://custom.test/download.zip')
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
  assert.equal(rows[0].fulfillment.vendorProduct, 'Lenful - T-Shirt')
  assert.equal(rows[0].fulfillment.productTypeGroupId, '660000000000000000000901')
  assert.equal(rows[0].fulfillment.size, 'M')
  assert.equal(rows[0].fulfillment.color, 'PEPPER')
  assert.equal(rows[0].fulfillment.carrierKey, 'USPS')
  assert.equal(rows[0].fulfillment.trackingKey, '9400100000000000000000')
  assert.equal(rows[0].fulfillment.statusKey, 'orders.values.status.customizationParsed')
})

test('buildOrderListQuery maps the address issue tab to its backend tab', () => {
  assert.deepEqual(buildOrderListQuery({ tab: 'addressIssue' }), {
    page: 1,
    limit: 10,
    tab: 'ADDRESS_ISSUE',
  })
})

test('mapWorkbenchRows uses listing previewUrl for product image when customization has no image', () => {
  const rows = mapWorkbenchRows([
    {
      order: {
        id: '660000000000000000000303',
        externalOrderId: '114-3',
        status: 'PROCESSING',
        buyer: { name: 'Buyer' },
        currency: 'USD',
      },
      items: [
        {
          item: {
            id: '660000000000000000000403',
            sku: 'SKU-3',
            title: 'Custom Napkins',
            quantity: 1,
          },
          listing: {
            previewAsset: {
              previewUrl: 'https://image.test/listing-preview.png',
            },
            psdTemplate: {
              previewUrl: 'https://image.test/psd-preview.jpg',
            },
          },
          customization: {
            inputs: [{ type: 'TEXT', label: 'Custom Name', value: 'Christie' }],
          },
        },
      ],
    },
  ])

  assert.deepEqual(rows[0].productImages, ['https://image.test/listing-preview.png'])
  assert.deepEqual(rows[0].customization.customerPhoto, [])
})

test('mapWorkbenchRows does not show customer paid amount as base cost', () => {
  const rows = mapWorkbenchRows([
    {
      order: {
        id: '660000000000000000000307',
        externalOrderId: '113-7180016-0704235',
        status: 'PROCESSING',
        pricing: {
          customerPaidAmount: 4217,
          baseCostAmount: null,
          totalCostAmount: null,
          currency: 'USD',
          costCenterStatus: 'MISSING',
        },
      },
      items: [
        {
          item: { id: '660000000000000000000407', quantity: 1 },
          pricing: {
            customerPaidAmount: 4217,
            baseCostAmount: null,
            totalCostAmount: null,
            currency: 'USD',
          },
        },
      ],
    },
  ])

  assert.equal(rows[0].basecost, '-')
})

test('mapWorkbenchRows shows waiting customization after vendor is matched', () => {
  const rows = mapWorkbenchRows([
    {
      order: {
        id: '660000000000000000000310',
        externalOrderId: '4100870576',
        status: 'PROCESSING',
      },
      items: [
        {
          item: {
            id: '660000000000000000000410',
            sku: 'SKU-PENDING-CUSTOM',
            quantity: 1,
            status: 'CUSTOMIZATION_PENDING',
          },
          mapping: {
            status: 'READY',
            vendor: { name: 'Printway' },
            vendorProduct: { id: '660000000000000000000510', name: 'Napkins' },
            vendorCostCenter: {
              id: '660000000000000000000610',
              standardSize: '6.5 x 6.5',
              standardColor: 'WHITE',
            },
          },
        },
      ],
    },
  ])

  assert.equal(rows[0].fulfillment.statusKey, 'orders.values.status.waitingCustomization')
  assert.equal(rows[0].fulfillment.vendorProduct, 'Printway - Napkins')
})

test('mapWorkbenchRows shows missing PSD before waiting customization', () => {
  const rows = mapWorkbenchRows([
    {
      order: { externalOrderId: '4102785351', status: 'PROCESSING' },
      items: [
        {
          item: {
            id: '660000000000000000000411',
            sku: 'J2615-NK-2805-006',
            quantity: 1,
            status: 'CUSTOMIZATION_PENDING',
          },
          listing: { psdStatus: 'MISSING' },
          mapping: {
            status: 'READY',
            vendorProduct: { id: '660000000000000000000510', name: 'Napkins' },
            vendorCostCenter: { id: '660000000000000000000610', standardSize: '6.5 x 6.5' },
          },
        },
      ],
    },
  ])

  assert.equal(rows[0].fulfillment.statusKey, 'orders.values.status.missingPsd')
})

test('mapWorkbenchRows uses the backend workflow stage instead of stale local facts', () => {
  const rows = mapWorkbenchRows([
    {
      order: { externalOrderId: '4102785351', status: 'PROCESSING' },
      items: [
        {
          item: { id: '660000000000000000000412', status: 'CUSTOMIZATION_PENDING' },
          listing: { psdStatus: 'MISSING' },
          workflow: { stage: 'READY_TO_SEND_VENDOR' },
        },
      ],
    },
  ])

  assert.equal(rows[0].fulfillment.statusKey, 'orders.values.status.readyToSendVendor')
})

test('mapWorkbenchRows maps PSD readiness from workbench listing and order status', () => {
  const rows = mapWorkbenchRows([
    {
      order: {
        id: '660000000000000000000306',
        externalOrderId: '114-6',
        status: 'PROCESSING',
        psdStatus: 'MISSING',
      },
      items: [
        {
          item: { id: '660000000000000000000406', sku: 'SKU-6A' },
          listing: { psdStatus: 'PRESENT' },
        },
        {
          item: { id: '660000000000000000000407', sku: 'SKU-6B' },
          listing: {},
        },
      ],
    },
  ])

  assert.equal(rows[0].itemDetails[0].product.psdKey, 'orders.values.status.present')
  assert.equal(rows[0].itemDetails[0].product.psdColor, 'success')
  assert.equal(rows[0].itemDetails[1].product.psdKey, 'orders.values.status.missing')
  assert.equal(rows[0].itemDetails[1].product.psdColor, 'danger')
})

test('mapWorkbenchRows preserves every order item for expanded detail rendering', () => {
  const rows = mapWorkbenchRows([
    {
      order: {
        id: '660000000000000000000304',
        externalOrderId: '114-4',
        status: 'PROCESSING',
        buyer: { name: 'Buyer' },
        marketplaceCode: 'AMAZON_US',
      },
      items: [
        {
          item: {
            id: '660000000000000000000404',
            sku: 'SKU-4A',
            title: 'First custom item',
            asin: 'B000FIRST',
            quantity: 1,
            status: 'IN_PRODUCTION',
          },
          listing: { previewAsset: { previewUrl: 'https://image.test/first.png' } },
          customization: {
            inputs: [{ type: 'TEXT', label: 'Custom Name', value: 'First' }],
          },
          mapping: {
            vendorProduct: { name: 'First Vendor Product' },
            vendorCostCenter: { size: 'M', color: 'BLACK' },
          },
        },
        {
          item: {
            id: '660000000000000000000405',
            sku: 'SKU-4B',
            title: 'Second custom item',
            asin: 'B000SECOND',
            quantity: 2,
            status: 'SENT_TO_VENDOR',
          },
          listing: { previewAsset: { previewUrl: 'https://image.test/second.png' } },
          customization: {
            inputs: [{ type: 'TEXT', label: 'Custom Name', value: 'Second' }],
          },
          mapping: {
            vendorProduct: { name: 'Second Vendor Product' },
            vendorCostCenter: { size: 'L', color: 'WHITE' },
          },
          tracking: {
            carrier: 'USPS',
            trackingNumber: '9400SECOND',
          },
        },
      ],
    },
  ])

  assert.equal(rows[0].itemDetails.length, 2)
  assert.equal(rows[0].product.sku, 'SKU-4A')
  assert.equal(rows[0].itemDetails[0].product.sku, 'SKU-4A')
  assert.equal(rows[0].itemDetails[1].product.sku, 'SKU-4B')
  assert.equal(rows[0].itemDetails[1].product.asin, 'B000SECOND')
  assert.deepEqual(rows[0].itemDetails[1].productImages, ['https://image.test/second.png'])
  assert.equal(rows[0].itemDetails[1].customization.customerName, 'Second')
  assert.equal(rows[0].itemDetails[1].fulfillment.quantity, '2')
  assert.equal(rows[0].itemDetails[1].fulfillment.vendorProduct, 'Second Vendor Product')
  assert.equal(rows[0].itemDetails[1].fulfillment.trackingKey, '9400SECOND')
})

test('mapWorkbenchRows does not show listing title as vendor product when vendor is unmatched', () => {
  const rows = mapWorkbenchRows([
    {
      order: {
        id: '660000000000000000000303',
        externalOrderId: '114-3',
        status: 'IMPORTED',
        buyer: { name: 'Buyer' },
      },
      items: [
        {
          item: {
            id: '660000000000000000000403',
            title: 'Personalized long listing title',
            quantity: 1,
          },
          customization: {
            inputs: [
              { type: 'OPTION', label: 'Select Size', value: '11.8 x 23.6 Inches' },
              { type: 'OPTION', label: 'Color', value: 'We love you!' },
            ],
          },
          mapping: { status: 'PENDING' },
        },
      ],
    },
  ])

  assert.equal(rows[0].customization.productType, 'Personalized long listing title')
  assert.equal(rows[0].customization.size, '11.8 x 23.6 Inches')
  assert.equal(rows[0].customization.shirtColor, 'We love you!')
  assert.equal(rows[0].fulfillment.vendorProduct, '-')
  assert.equal(rows[0].fulfillment.size, '-')
  assert.equal(rows[0].fulfillment.color, '-')
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
