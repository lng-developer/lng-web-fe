import assert from 'node:assert/strict'
import test from 'node:test'

import * as scaleApi from './scaleApi.js'

const {
  buildProductionSummaryQuery,
  buildProductionTaskQuery,
  mapProductionListResponse,
  mapProductionTask,
  mapScaleSummary,
} = scaleApi

test('buildProductionTaskQuery maps shared filters and channel to the production list contract', () => {
  assert.deepEqual(
    buildProductionTaskQuery({
      salesChannelCode: 'AMAZON',
      statusTab: 'pending',
      search: ' ORD-10042 ',
      shop: '660000000000000000000201',
      scaleBy: '660000000000000000000903',
      qcBy: '660000000000000000000904',
      page: 2,
      pageSize: 25,
    }),
    {
      designAssignmentStatus: 'ASSIGNED',
      salesChannelCode: 'AMAZON',
      search: 'ORD-10042',
      shopId: '660000000000000000000201',
      scaleBy: '660000000000000000000903',
      qcBy: '660000000000000000000904',
      page: 2,
      limit: 25,
      sort: '-updatedAt',
    },
  )
})

test('buildProductionTaskQuery maps every server-supported status tab', () => {
  assert.deepEqual(buildProductionTaskQuery({ statusTab: 'needScale' }), {
    scaleStatus: 'NEED_SCALE',
    page: 1,
    limit: 10,
    sort: '-updatedAt',
  })
  assert.equal(buildProductionTaskQuery({ statusTab: 'completed' }).scaleStatus, 'SCALED')
  assert.equal(buildProductionTaskQuery({ statusTab: 'qcRejected' }).qcStatus, 'REJECTED')
  assert.deepEqual(buildProductionTaskQuery({ statusTab: 'csUnassigned' }), {
    csUnassigned: true,
    page: 1,
    limit: 10,
    sort: '-updatedAt',
  })
})

test('buildProductionSummaryQuery keeps shared filters but removes list status and pagination', () => {
  assert.deepEqual(
    buildProductionSummaryQuery({
      salesChannelCode: 'ETSY',
      statusTab: 'qcRejected',
      shop: 'shop-1',
      page: 4,
      pageSize: 50,
    }),
    {
      salesChannelCode: 'ETSY',
      shopId: 'shop-1',
      sort: '-updatedAt',
    },
  )
})

test('buildProductionTaskQuery maps the UI Kit date range to full-day ISO boundaries', () => {
  let startUnit
  let endUnit
  const start = {
    startOf: (unit) => {
      startUnit = unit
      return { toISOString: () => '2026-06-30T17:00:00.000Z' }
    },
  }
  const end = {
    endOf: (unit) => {
      endUnit = unit
      return { toISOString: () => '2026-07-03T16:59:59.999Z' }
    },
  }

  const result = buildProductionTaskQuery({ dateRange: { start, end } })

  assert.equal(startUnit, 'day')
  assert.equal(endUnit, 'day')
  assert.equal(result.dateFrom, '2026-06-30T17:00:00.000Z')
  assert.equal(result.dateTo, '2026-07-03T16:59:59.999Z')
})

test('mapProductionTask maps the enriched Production V2 summary contract', () => {
  const result = mapProductionTask(
    {
      id: 'task-1',
      shopId: 'shop-1',
      salesChannelCode: 'AMAZON',
      marketplaceCode: 'AMAZON_US',
      orderStatus: 'PROCESSING',
      groupId: 'GRP-001',
      groupType: 'SCALE',
      orderOwner: { id: 'owner-1', fullName: 'Order Owner', employeeCode: 'CS01' },
      seller: { employeeCode: 'J2605', name: 'Seller User' },
      orderItem: {
        externalOrderId: 'ORD-10042',
        asin: 'B0TEST',
        sku: 'SKU-01',
        title: 'Custom shirt',
        status: 'NEED_PRODUCTION',
      },
      customization: {
        customerInputs: {
          customName: 'Mia',
          size: 'M',
        },
        imageAssets: [
          {
            assetId: 'image-1',
            secureUrl: 'https://example.test/image.png',
            assetDownloadUrl: '/api/media/assets/image-1/download',
          },
        ],
      },
      vendorProduct: { name: 'Lenful T-Shirt', code: 'VP-01' },
      vendorCostCenter: { name: 'US Apparel', code: 'CC-01' },
      productionStatus: 'QC_PENDING',
      scaleStatus: 'SCALED',
      qcStatus: 'PENDING',
      assignedDesignUserId: 'designer-1',
      assignedDesigner: { id: 'designer-1', fullName: 'Scale User' },
      qcBy: 'qc-1',
      qcUser: { id: 'qc-1', fullName: 'QC User' },
      csAssigneeId: 'cs-1',
      csAssignee: { id: 'cs-1', fullName: 'CS User' },
      csStatus: 'ASSIGNED',
      csNote: 'Confirm the shipping address',
      designNote: 'Keep artwork centered',
      scaleContext: {
        status: 'READY_TO_SCALE',
        canScale: true,
        missingRequirements: [],
        use: {
          listing: {
            id: 'listing-1',
            title: 'Listing title',
            asin: 'B0LISTING',
            sku: 'LISTING-SKU',
            psdStatus: 'PRESENT',
          },
          template: { id: 'template-1', code: 'TPL', name: 'Template' },
          psdTemplate: {
            assetId: 'psd-1',
            assetDownloadUrl: '/api/media/assets/psd-1/download',
            fileCheckId: 'psd-check-1',
            status: 'READY',
          },
          scaleSlots: [
            {
              fileCheckId: 'check-1',
              slotKey: 'FRONT',
              slotLabel: 'Front',
              sourceType: 'CUSTOMER_IMAGE',
              inputAssetId: 'input-1',
              inputAssetDownloadUrl: '/api/media/assets/input-1/download',
              outputAssetId: 'output-1',
              outputAssetDownloadUrl: '/api/media/assets/output-1/download',
              scaleStatus: 'SCALED',
              qcStatus: 'PENDING',
              blockers: [],
            },
          ],
        },
      },
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
    },
    new Map([['shop-1', 'Shop 1']]),
  )

  assert.equal(result.orderId, 'ORD-10042')
  assert.equal(result.groupId, 'GRP-001')
  assert.equal(result.groupType, 'SCALE')
  assert.equal(result.channel, 'AMAZON')
  assert.equal(result.marketplaceCode, 'AMAZON_US')
  assert.equal(result.orderStatus, 'PROCESSING')
  assert.equal(result.orderOwner, 'Order Owner')
  assert.equal(result.seller, 'Seller User')
  assert.equal(result.scaleStatus, 'COMPLETED')
  assert.equal(result.scaleBy, 'designer-1')
  assert.equal(result.scaleByName, 'Scale User')
  assert.equal(result.qcBy, 'QC User')
  assert.equal(result.csAssigneeId, 'cs-1')
  assert.equal(result.csAssigneeName, 'CS User')
  assert.equal(result.csStatus, 'ASSIGNED')
  assert.equal(result.detail.product.primaryCode, 'B0TEST')
  assert.equal(result.detail.product.secondaryCode, 'SKU-01')
  assert.equal(result.detail.product.psdStatus, 'READY')
  assert.deepEqual(
    result.detail.customization.map(({ label, value }) => ({ label, value })),
    [
      { label: 'Custom Name', value: 'Mia' },
      { label: 'Size', value: 'M' },
      { label: 'Customer Photo', value: '-' },
    ],
  )
  assert.equal(result.detail.psdTemplate.assetId, 'psd-1')
  assert.equal(result.detail.mockups[0].fileCheckId, 'check-1')
  assert.equal(result.detail.mockups[0].inputAssetId, 'input-1')
  assert.equal(result.detail.mockups[0].outputAssetId, 'output-1')
  assert.equal(result.detail.mockups[0].outputAssetDownloadUrl.endsWith('/download'), true)
  assert.equal(result.detail.canScale, true)
  assert.equal(result.detail.contextStatus, 'READY_TO_SCALE')
  assert.equal(result.detail.notes.design, 'Keep artwork centered')
  assert.equal(result.detail.notes.cs, 'Confirm the shipping address')
})

test('mapProductionTask preserves blockers and missing requirements for blocked tasks', () => {
  const result = mapProductionTask({
    id: 'task-blocked',
    blockers: ['PSD_MISSING'],
    scaleContext: {
      status: 'BLOCKED',
      canScale: false,
      missingRequirements: [{ code: 'PSD_TEMPLATE', message: 'PSD template is missing.' }],
      use: { listing: null, template: null, psdTemplate: { status: 'MISSING' }, scaleSlots: [] },
    },
  })

  assert.equal(result.detail.canScale, false)
  assert.deepEqual(result.detail.blockers, ['PSD_MISSING'])
  assert.equal(result.detail.missingRequirements[0].code, 'PSD_TEMPLATE')
  assert.equal(result.detail.product.psdStatus, 'MISSING')
})

test('mapProductionTask derives pending and rejected display states', () => {
  assert.equal(
    mapProductionTask({ scaleStatus: 'NEED_SCALE', assignedDesignUserId: 'designer-1' })
      .scaleStatus,
    'PENDING',
  )
  assert.equal(
    mapProductionTask({ scaleStatus: 'SCALED', qcStatus: 'REJECTED' }).scaleStatus,
    'QC_REJECTED',
  )
})

test('mapScaleSummary maps V2 status-group counters', () => {
  assert.deepEqual(
    mapScaleSummary({
      total: 18,
      needScale: 7,
      csUnassigned: 3,
      byAssignmentStatus: { UNASSIGNED: 5, ASSIGNED: 4, OUTPUT_UPLOADED: 9 },
      byCsStatus: { UNASSIGNED: 3, ASSIGNED: 6 },
      byScaleStatus: { NEED_SCALE: 11, SCALED: 7 },
      byQcStatus: { NOT_READY: 8, PENDING: 6, REJECTED: 2, APPROVED: 2 },
    }),
    {
      all: 18,
      csUnassigned: 3,
      needScale: 7,
      pending: 4,
      completed: 7,
      qcRejected: 2,
    },
  )
})

test('mapProductionListResponse builds QC filter options from the current qcUser DTO', () => {
  const result = mapProductionListResponse({
    items: [
      {
        id: 'task-1',
        qcBy: 'qc-1',
        qcUser: { id: 'qc-1', fullName: 'QC User', employeeCode: 'QC01' },
      },
    ],
  })

  assert.deepEqual(result.options.qcUsers, [{ id: 'qc-1', name: 'QC User' }])
})

test('mapScaleAssignees maps dedicated assignee DTOs to select options', () => {
  assert.equal(typeof scaleApi.mapScaleAssignees, 'function')
  assert.deepEqual(
    scaleApi.mapScaleAssignees([
      { id: 'user-1', fullName: 'Scale User', employeeCode: 'J2605' },
      { id: 'user-2', fullName: null, employeeCode: 'J2606' },
    ]),
    [
      { id: 'user-1', name: 'Scale User', employeeCode: 'J2605' },
      { id: 'user-2', name: 'J2606', employeeCode: 'J2606' },
    ],
  )
})
