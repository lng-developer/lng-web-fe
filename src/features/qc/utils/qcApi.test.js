import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildQcExportQuery,
  buildQcImageReviewItems,
  buildQcSummaryQuery,
  buildQcTaskQuery,
  canSubmitQcPass,
  canSubmitQcReject,
  getPushableQcTaskIds,
  isSupportedQcStatusTab,
  mapProductionSummaryToQcCounts,
  mapProductionTaskToQcRow,
  mergeQcTaskDetail,
  readQcDashboardSearch,
} from './qcApi.js'

test('readQcDashboardSearch accepts supported status and channel values', () => {
  assert.deepEqual(readQcDashboardSearch('?status=pending&channel=amazon'), {
    platform: 'amazon',
    statusTab: 'pending',
  })
  assert.deepEqual(readQcDashboardSearch('?status=unknown&channel=unknown'), {})
})

test('buildQcTaskQuery maps supported QC filters to production task params', () => {
  assert.deepEqual(
    buildQcTaskQuery({
      platform: 'amazon',
      statusTab: 'pending',
      search: '  ORD-20041  ',
      sellerCode: ' j2605 ',
      shopId: '660000000000000000000201',
      dateRange: {
        start: { startOf: () => ({ toISOString: () => '2026-06-01T00:00:00.000Z' }) },
        end: { endOf: () => ({ toISOString: () => '2026-06-30T23:59:59.999Z' }) },
      },
      page: 2,
      pageSize: 20,
    }),
    {
      salesChannelCode: 'AMAZON',
      qcStatus: 'PENDING',
      search: 'ORD-20041',
      sellerCode: 'J2605',
      shopId: '660000000000000000000201',
      dateFrom: '2026-06-01T00:00:00.000Z',
      dateTo: '2026-06-30T23:59:59.999Z',
      page: 2,
      limit: 20,
    },
  )
})

test('buildQcTaskQuery omits empty filters and defaults pagination', () => {
  assert.deepEqual(buildQcTaskQuery({ platform: 'etsy', statusTab: 'all', shopId: 'all' }), {
    salesChannelCode: 'ETSY',
    page: 1,
    limit: 10,
  })
})

test('buildQcTaskQuery maps backend tab filters for failed and address invalid', () => {
  assert.deepEqual(buildQcTaskQuery({ platform: 'amazon', statusTab: 'failed' }), {
    salesChannelCode: 'AMAZON',
    tab: 'FAILED',
    page: 1,
    limit: 10,
  })
  assert.deepEqual(buildQcTaskQuery({ platform: 'etsy', statusTab: 'addressInvalid' }), {
    salesChannelCode: 'ETSY',
    tab: 'ADDRESS_INVALID',
    page: 1,
    limit: 10,
  })
})

test('buildQcExportQuery keeps active filters and omits pagination', () => {
  assert.deepEqual(
    buildQcExportQuery({
      platform: 'amazon',
      statusTab: 'addressInvalid',
      sellerCode: 'J2605',
      shopId: '660000000000000000000201',
      page: 3,
      pageSize: 50,
    }),
    {
      salesChannelCode: 'AMAZON',
      tab: 'ADDRESS_INVALID',
      sellerCode: 'J2605',
      shopId: '660000000000000000000201',
    },
  )
})

test('buildQcSummaryQuery keeps the pending QC filter', () => {
  assert.deepEqual(buildQcSummaryQuery({ platform: 'amazon', statusTab: 'pending' }), {
    salesChannelCode: 'AMAZON',
    qcStatus: 'PENDING',
  })
})

test('isSupportedQcStatusTab identifies tabs backed by production filters', () => {
  assert.equal(isSupportedQcStatusTab('all'), true)
  assert.equal(isSupportedQcStatusTab('pending'), true)
  assert.equal(isSupportedQcStatusTab('qcRejected'), true)
  assert.equal(isSupportedQcStatusTab('completed'), true)
  assert.equal(isSupportedQcStatusTab('failed'), true)
  assert.equal(isSupportedQcStatusTab('addressInvalid'), true)
})

test('mapProductionSummaryToQcCounts maps backend QC buckets to UI tabs', () => {
  assert.deepEqual(
    mapProductionSummaryToQcCounts({
      total: 22,
      byQcStatus: { PENDING: 4, REJECTED: 2, PASSED: 12, NOT_READY: 4 },
      failed: 1,
      addressInvalid: 3,
    }),
    {
      all: 22,
      pending: 4,
      qcRejected: 2,
      failed: 1,
      completed: 12,
      addressInvalid: 3,
    },
  )
})

test('mapProductionTaskToQcRow maps production summary and derives PNG availability', () => {
  const row = mapProductionTaskToQcRow(
    {
      id: 'task-id',
      orderItemId: 'order-item-id',
      fulfillmentPlanId: 'fulfillment-plan-id',
      orderItem: {
        externalOrderId: 'ORD-20041',
        asin: 'B000TEST',
        sku: 'SKU-1',
        title: 'Custom shirt',
      },
      productionStatus: 'QC_PENDING',
      scaleStatus: 'SCALED',
      qcStatus: 'PENDING',
      fulfillQty: 2,
      shopId: 'shop-id',
      orderStatus: 'PROCESSING',
      assignedDesigner: { id: 'designer-id', fullName: 'Nam Tran' },
      qcUser: null,
      orderOwner: { id: 'owner-id', fullName: 'Admin User' },
      vendorProduct: {
        id: 'vendor-product-id',
        name: 'Lenful - US Tapestry',
        vendor: { name: 'Lenful' },
      },
      vendorCostCenter: { id: 'cost-center-id', name: 'XL / CHARCOAL' },
      shopName: 'LNG Main Shop',
      orderDate: '2026-06-20T10:00:00.000Z',
      shippingType: 'Expedited',
      fulfillName: 'Jane Buyer',
      productImageUrl: 'https://image.test/listing.png',
      scaleContext: {
        use: {
          scaleSlots: [
            { fileCheckId: 'front', required: true, outputStatus: 'UPLOADED' },
            { fileCheckId: 'back', required: true, outputStatus: 'UPLOADED' },
          ],
        },
      },
      vendorSubmission: { id: 'submission-id', status: 'READY' },
      createdAt: '2026-06-26T10:00:00.000Z',
    },
    { shopNameById: new Map([['shop-id', 'Main Shop']]) },
  )

  assert.equal(row.id, 'task-id')
  assert.equal(row.orderItemId, 'order-item-id')
  assert.equal(row.orderId, 'ORD-20041')
  assert.equal(row.statusQc, 'PENDING')
  assert.equal(row.statusOrder, 'PROCESSING')
  assert.equal(row.shop, 'LNG Main Shop')
  assert.equal(row.orderDate, '2026-06-20T10:00:00.000Z')
  assert.equal(row.shippingType, 'Expedited')
  assert.equal(row.scaleBy, 'Nam Tran')
  assert.equal(row.qcBy, '-')
  assert.equal(row.detail.product.quantity, 2)
  assert.equal(row.detail.product.imageUrl, 'https://image.test/listing.png')
  assert.equal(row.detail.fulfillName, 'Jane Buyer')
  assert.equal(row.detail.pngStatus, 'UPLOADED')
  assert.equal(row.detail.vendorProduct, 'Lenful - US Tapestry')
  assert.equal(row.detail.vendorName, 'Lenful')
  assert.equal(row.detail.vendorCostCenter, 'XL / CHARCOAL')
  assert.deepEqual(row.detail.blockers, [])
  assert.equal(row.vendorSubmissionStatus, 'READY')
})

test('mapProductionTaskToQcRow falls back safely when optional snapshots are absent', () => {
  const row = mapProductionTaskToQcRow({ id: 'task-id', qcStatus: 'NOT_READY' })

  assert.equal(row.orderId, '-')
  assert.equal(row.shop, '-')
  assert.equal(row.detail.pngStatus, 'NOT_REQUIRED')
  assert.equal(row.detail.product.quantity, 0)
})

test('mapProductionTaskToQcRow returns missing PNG status when any required output is missing', () => {
  const row = mapProductionTaskToQcRow({
    id: 'task-id',
    fileChecks: [
      { id: 'front', required: true, outputStatus: 'UPLOADED' },
      { id: 'back', required: true, outputStatus: 'MISSING' },
    ],
  })

  assert.equal(row.detail.pngStatus, 'MISSING')
})

test('getPushableQcTaskIds only returns selected ready-to-send tasks', () => {
  const tasks = [
    { id: 'ready', productionStatus: 'READY_TO_SEND_VENDOR' },
    { id: 'pending', productionStatus: 'QC_PENDING' },
    { id: 'sent', productionStatus: 'SENT_TO_VENDOR' },
  ]

  assert.deepEqual(getPushableQcTaskIds(tasks, new Set(['ready', 'pending', 'sent'])), ['ready'])
})

test('canSubmitQcPass allows pass when required scaled outputs are present', () => {
  assert.equal(
    canSubmitQcPass({
      statusQc: 'NOT_READY',
      detail: {
        fileChecks: [
          { id: 'front', required: true, outputAssetId: 'asset-id' },
          { id: 'optional', required: false },
        ],
      },
    }),
    true,
  )
  assert.equal(
    canSubmitQcPass({
      statusQc: 'PASSED',
      detail: {
        fileChecks: [{ id: 'front', required: true, outputAssetId: 'asset-id' }],
      },
    }),
    false,
  )
  assert.equal(
    canSubmitQcPass({
      statusQc: 'NOT_READY',
      detail: {
        fileChecks: [{ id: 'front', required: true }],
      },
    }),
    false,
  )
  assert.equal(
    canSubmitQcPass({
      statusQc: 'PENDING',
      detail: { fileChecks: [{ id: 'front', required: true }] },
    }),
    false,
  )
})

test('canSubmitQcReject allows reject before pass even when scaled output is missing', () => {
  assert.equal(
    canSubmitQcReject({
      statusQc: 'NOT_READY',
      detail: {
        fileChecks: [{ id: 'front', required: true }],
      },
    }),
    true,
  )
  assert.equal(canSubmitQcReject({ statusQc: 'PASSED' }), false)
})

test('mergeQcTaskDetail keeps list fields and adds full file checks', () => {
  const row = mapProductionTaskToQcRow({
    id: 'task-id',
    orderItemId: 'item-id',
    orderItem: { externalOrderId: 'ORD-1', sku: 'SKU-1' },
    qcStatus: 'PENDING',
  })
  const merged = mergeQcTaskDetail(row, {
    id: 'task-id',
    orderItemId: 'item-id',
    fileChecks: [
      {
        id: 'check-id',
        slotLabel: 'Front',
        outputStatus: 'UPLOADED',
        outputAssetDownloadUrl: '/api/media/assets/asset-id/download',
      },
    ],
  })

  assert.equal(merged.orderId, 'ORD-1')
  assert.equal(merged.detail.product.sku, 'SKU-1')
  assert.equal(merged.detail.fileChecks.length, 1)
  assert.equal(merged.detail.pngStatus, 'UPLOADED')
})

test('buildQcImageReviewItems builds modal references and editable layers', () => {
  const items = buildQcImageReviewItems({
    id: 'task-id',
    orderId: 'ORD-1',
    orderItemId: 'item-id',
    statusQc: 'PENDING',
    scaleBy: 'Nam Tran',
    qcBy: 'Lan Nguyen',
    detail: {
      product: {
        sku: 'SKU-1',
        asin: 'B000TEST',
        title: 'Custom shirt',
        quantity: 1,
        imageUrl: '/product.png',
        customerImages: ['/customer.png', ''],
      },
      customization: {
        customerInputs: [
          { label: 'Custom Name', value: 'Mia' },
          { label: 'Customer Photo', value: '/custom-photo.png', type: 'image' },
        ],
        imageAssets: [{ assetDownloadUrl: '/custom-upload.png', filename: 'buyer.png' }],
      },
      csNote: 'Please check photo crop.',
      qcNote: 'Previous note.',
      fulfillName: '111-222-item-id',
      vendorProduct: 'Lenful - US Tapestry',
      pngStatus: 'UPLOADED',
      fileChecks: [
        {
          id: 'front-check',
          slotLabel: 'Front',
          inputAssetDownloadUrl: '/front-input.png',
          outputAssetDownloadUrl: '/front-output.png',
          outputStatus: 'UPLOADED',
        },
      ],
      scaleSlots: [
        {
          fileCheckId: 'back-check',
          position: 'Back',
          outputAssetDownloadUrl: '/back-output.png',
          outputStatus: 'UPLOADED',
        },
      ],
    },
  })

  assert.equal(items.length, 1)
  assert.equal(items[0].id, 'item-id')
  assert.equal(items[0].orderId, 'ORD-1')
  assert.deepEqual(
    items[0].referenceImages.map((item) => item.url),
    ['/product.png', '/customer.png', '/custom-photo.png', '/custom-upload.png'],
  )
  assert.deepEqual(
    items[0].layers.map((layer) => [layer.id, layer.label, layer.url, layer.outputStatus]),
    [
      ['front-check-input', 'Front input', '/front-input.png', 'UPLOADED'],
      ['front-check-output', 'Front output', '/front-output.png', 'UPLOADED'],
      ['back-check-output', 'Back output', '/back-output.png', 'UPLOADED'],
    ],
  )
  assert.equal(items[0].customization.length, 2)
  assert.equal(items[0].csNote, 'Please check photo crop.')
  assert.equal(items[0].qcNote, 'Previous note.')
})

test('buildQcImageReviewItems keeps customization options as text fields', () => {
  const [item] = buildQcImageReviewItems({
    detail: {
      customization: {
        customerInputs: {
          texts: [{ label: 'Name', value: 'Mia' }],
          options: [{ label: 'Select Size', value: 'M' }],
          images: [{ label: 'Upload photo', secureUrl: '/photo.png' }],
        },
      },
    },
  })

  assert.deepEqual(
    item.customization.map(({ label, type, value }) => ({ label, type, value })),
    [
      { label: 'Name', type: 'text', value: 'Mia' },
      { label: 'Select Size', type: 'option', value: 'M' },
      { label: 'Upload photo', type: 'image', value: '/photo.png' },
    ],
  )
})

test('mergeQcTaskDetail preserves scale slots from full task detail', () => {
  const row = mapProductionTaskToQcRow({
    id: 'task-id',
    orderItemId: 'item-id',
    orderItem: { externalOrderId: 'ORD-1', sku: 'SKU-1' },
    qcStatus: 'PENDING',
  })
  const merged = mergeQcTaskDetail(row, {
    id: 'task-id',
    orderItemId: 'item-id',
    scaleContext: {
      use: {
        scaleSlots: [
          {
            fileCheckId: 'front-check',
            position: 'Front',
            outputAssetDownloadUrl: '/front-output.png',
            outputStatus: 'UPLOADED',
          },
        ],
      },
    },
  })

  assert.equal(merged.detail.scaleSlots.length, 1)
  assert.equal(merged.detail.pngStatus, 'UPLOADED')
})
