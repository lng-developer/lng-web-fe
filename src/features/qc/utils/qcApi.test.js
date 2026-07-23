import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildQcDashboardSearch,
  buildQcExportQuery,
  buildQcImageReviewItems,
  buildQcSummaryQuery,
  buildQcTaskQuery,
  canSubmitQcPass,
  canSubmitQcReject,
  mapProductionSummaryToQcCounts,
  mapProductionTaskToQcRow,
  mergeQcTaskDetail,
  readQcDashboardSearch,
} from './qcApi.js'

test('readQcDashboardSearch accepts supported status and sales-channel values', () => {
  assert.deepEqual(readQcDashboardSearch('?status=pending&channel=amazon'), {
    channel: 'amazon',
    statusTab: 'pending',
  })
  assert.deepEqual(readQcDashboardSearch('?status=qcRejected&channel=etsy'), {
    channel: 'etsy',
    statusTab: 'qcRejected',
  })
  assert.deepEqual(readQcDashboardSearch('?status=completed&channel=amazon'), {
    channel: 'amazon',
    statusTab: 'completed',
  })
  assert.deepEqual(readQcDashboardSearch('?status=unknown&channel=all'), {})
})

test('readQcDashboardSearch parses persisted queue filters and pagination', () => {
  const result = readQcDashboardSearch(
    '?status=qcRejected&channel=etsy&search=ORD-9&sellerCode=s-22&shopId=shop-1&dateFrom=2026-07-01&dateTo=2026-07-09&page=3&limit=50',
  )

  assert.equal(result.statusTab, 'qcRejected')
  assert.equal(result.channel, 'etsy')
  assert.equal(result.search, 'ORD-9')
  assert.equal(result.sellerCode, 's-22')
  assert.equal(result.shopId, 'shop-1')
  assert.equal(result.page, 3)
  assert.equal(result.pageSize, 50)
  assert.equal(result.dateRange.start?.format('YYYY-MM-DD'), '2026-07-01')
  assert.equal(result.dateRange.end?.format('YYYY-MM-DD'), '2026-07-09')
})

test('buildQcDashboardSearch omits defaults and empty values from the queue URL', () => {
  assert.equal(
    buildQcDashboardSearch({
      channel: 'all',
      statusTab: 'pending',
      search: '   ',
      sellerCode: '',
      shopId: 'all',
      dateRange: { start: null, end: null },
      page: 1,
      pageSize: 10,
    }),
    '',
  )

  assert.equal(
    buildQcDashboardSearch({
      channel: 'etsy',
      statusTab: 'failed',
      search: '  ORD-9  ',
      sellerCode: ' s-22 ',
      shopId: 'shop-1',
      dateRange: {
        start: { format: () => '2026-07-01' },
        end: { format: () => '2026-07-09' },
      },
      page: 3,
      pageSize: 50,
    }),
    'status=failed&channel=etsy&search=ORD-9&sellerCode=s-22&shopId=shop-1&dateFrom=2026-07-01&dateTo=2026-07-09&page=3&limit=50',
  )
})

test('buildQcTaskQuery maps supported QC filters to production task params', () => {
  assert.deepEqual(
    buildQcTaskQuery({
      channel: 'amazon',
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
      view: 'QC',
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
  assert.deepEqual(buildQcTaskQuery({ channel: 'etsy', statusTab: 'all', shopId: 'all' }), {
    salesChannelCode: 'ETSY',
    view: 'QC',
    page: 1,
    limit: 10,
  })
})

test('buildQcTaskQuery requests the slim QC projection without a sales channel for all', () => {
  const query = buildQcTaskQuery({})

  assert.equal(query.view, 'QC')
  assert.equal(Object.hasOwn(query, 'salesChannelCode'), false)
})

test('buildQcTaskQuery maps backend tab filters for failed and address invalid', () => {
  assert.deepEqual(buildQcTaskQuery({ channel: 'amazon', statusTab: 'failed' }), {
    salesChannelCode: 'AMAZON',
    view: 'QC',
    tab: 'FAILED',
    page: 1,
    limit: 10,
  })
  assert.deepEqual(buildQcTaskQuery({ channel: 'etsy', statusTab: 'addressInvalid' }), {
    salesChannelCode: 'ETSY',
    view: 'QC',
    tab: 'ADDRESS_INVALID',
    page: 1,
    limit: 10,
  })
})

test('buildQcTaskQuery lets the backend own selected status scope', () => {
  assert.deepEqual(buildQcTaskQuery({ statusTab: 'pending' }), {
    view: 'QC',
    qcStatus: 'PENDING',
    page: 1,
    limit: 10,
  })
  assert.deepEqual(buildQcTaskQuery({ statusTab: 'qcRejected' }), {
    view: 'QC',
    qcStatus: 'REJECTED',
    page: 1,
    limit: 10,
  })
})

test('buildQcExportQuery keeps active filters and omits pagination', () => {
  assert.deepEqual(
    buildQcExportQuery({
      channel: 'amazon',
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

test('buildQcSummaryQuery omits row scope so header filters keep full counts', () => {
  assert.deepEqual(buildQcSummaryQuery({ channel: 'all', statusTab: 'pending' }), {})
  assert.deepEqual(buildQcSummaryQuery({ channel: 'etsy', statusTab: 'failed' }), {
    salesChannelCode: 'ETSY',
  })
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

test('canSubmitQcPass allows pass when no scaled outputs are required', () => {
  assert.equal(canSubmitQcPass({ statusQc: 'PENDING', detail: { fileChecks: [] } }), true)
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
  assert.equal(canSubmitQcReject({ statusQc: 'REJECTED' }), false)
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

test('buildQcImageReviewItems builds modal references and review layers', () => {
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
    ],
  )
  assert.deepEqual(
    items[0].layers.slice(0, 2).map(({ kind, sourceId }) => ({ kind, sourceId })),
    [
      { kind: 'input', sourceId: 'front-check' },
      { kind: 'output', sourceId: 'front-check' },
    ],
  )
  assert.equal(items[0].customization.length, 2)
  assert.equal(items[0].csNote, 'Please check photo crop.')
  assert.equal(items[0].qcNote, 'Previous note.')
})

test('buildQcImageReviewItems keeps list preview slots when input URLs repeat', () => {
  const [item] = buildQcImageReviewItems(
    mapProductionTaskToQcRow({
      id: 'task-id',
      orderItemId: 'item-id',
      qcPreviewFileChecks: [
        {
          id: 'front',
          slotKey: 'FRONT',
          slotLabel: 'Front',
          required: true,
          inputAssetDownloadUrl: '/shared-input.png',
          outputAssetDownloadUrl: '/front-output.png',
          outputStatus: 'UPLOADED',
        },
        {
          id: 'back',
          slotKey: 'BACK',
          slotLabel: 'Back',
          required: true,
          inputAssetDownloadUrl: '/shared-input.png',
          outputAssetDownloadUrl: '/back-output.png',
          outputStatus: 'UPLOADED',
        },
      ],
    }),
  )

  assert.deepEqual(
    item.layers.map(({ id, sourceId, kind }) => ({ id, sourceId, kind })),
    [
      { id: 'front-input', sourceId: 'front', kind: 'input' },
      { id: 'front-output', sourceId: 'front', kind: 'output' },
      { id: 'back-input', sourceId: 'back', kind: 'input' },
      { id: 'back-output', sourceId: 'back', kind: 'output' },
    ],
  )
})

test('buildQcImageReviewItems retains a required output without a download URL', () => {
  const [item] = buildQcImageReviewItems({
    qcPreviewFileChecks: [
      {
        id: 'front',
        slotKey: 'FRONT',
        slotLabel: 'Front',
        required: true,
        inputAssetDownloadUrl: '/front-input.png',
      },
    ],
  })

  assert.deepEqual(
    item.layers.find((layer) => layer.id === 'front-output'),
    {
      id: 'front-output',
      label: 'Front output',
      url: '',
      kind: 'output',
      required: true,
      outputRequired: true,
      outputStatus: 'MISSING',
      sourceId: 'front',
      unavailableReason: 'MISSING',
    },
  )
})

test('buildQcImageReviewItems hides non-reviewable templates and duplicate references', () => {
  const [item] = buildQcImageReviewItems({
    customization: {
      imageAssets: [{ assetDownloadUrl: '/media/customer.jpg' }],
    },
    qcPreviewFileChecks: [
      {
        id: 'template',
        slotKey: 'PSD_TEMPLATE',
        sourceType: 'PSD_TEMPLATE',
        inputAssetDownloadUrl: '/media/template.psd',
        scaleStatus: 'NOT_REQUIRED',
      },
      {
        id: 'front',
        slotKey: 'FRONT',
        sourceType: 'CUSTOMER_IMAGE',
        inputAssetDownloadUrl: '/media/customer.jpg',
        outputAssetDownloadUrl: '/media/front.png',
        outputRequired: true,
      },
    ],
  })

  assert.deepEqual(
    item.layers.map((layer) => layer.id),
    ['front-input', 'front-output'],
  )
  assert.deepEqual(item.referenceImages, [])
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
