import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getListItems, mapApiRowForModule } from './podRows.js'

describe('POD API row adapters', () => {
  it('unwraps common paginated list response shapes', () => {
    assert.deepEqual(getListItems({ items: [{ id: 'one' }] }), [{ id: 'one' }])
    assert.deepEqual(getListItems({ data: { rows: [{ id: 'two' }] } }), [{ id: 'two' }])
    assert.deepEqual(getListItems({ data: { total: 10 } }), [])
  })

  it('flattens order workbench rows from the backend shape', () => {
    const row = mapApiRowForModule(
      'orders',
      {
        order: {
          id: 'ord-1',
          externalOrderId: 'AMZ-1001',
          salesChannelCode: 'AMAZON',
          shop: { name: 'US POD' },
          status: 'OPEN',
          updatedAt: '2026-07-12T01:00:00.000Z',
        },
        items: [
          {
            item: {
              id: 'item-1',
              title: '11oz Mug',
              sku: 'MUG-11',
              readinessStatus: 'MAPPING_MISSING',
            },
            mapping: { status: 'NEEDS_MAPPING' },
          },
        ],
      },
      0,
    )

    assert.equal(row.id, 'item-1')
    assert.equal(row.platform, 'AMAZON')
    assert.equal(row.title, '11oz Mug')
    assert.equal(row.owner, 'US POD')
    assert.equal(row.status, 'MAPPING_MISSING')
    assert.equal(row.issue, 'MAPPING_MISSING')
  })

  it('maps nested production task fields into visible table columns', () => {
    const row = mapApiRowForModule(
      'production',
      {
        id: 'prd-1',
        status: 'SCALING',
        qcStatus: 'PENDING_QC',
        orderItem: { title: 'Vintage Tee', salesChannelCode: 'ETSY' },
        vendorProduct: { name: 'DTG Shirt', vendor: { name: 'VN Factory' } },
      },
      0,
    )

    assert.equal(row.id, 'prd-1')
    assert.equal(row.platform, 'ETSY')
    assert.equal(row.title, 'Vintage Tee')
    assert.equal(row.owner, 'VN Factory')
    assert.equal(row.issue, 'PENDING_QC')
  })

  it('maps catalog product type groups for the cost center setup screen', () => {
    const row = mapApiRowForModule(
      'catalog',
      {
        id: 'group-1',
        code: 'TSHIRT',
        name: 'T-Shirt',
        status: 'ACTIVE',
        updatedAt: '2026-07-17T01:00:00.000Z',
      },
      0,
    )

    assert.equal(row.id, 'group-1')
    assert.equal(row.platform, 'Catalog')
    assert.equal(row.title, 'T-Shirt')
    assert.equal(row.owner, 'TSHIRT')
    assert.equal(row.status, 'ACTIVE')
    assert.equal(row.issue, 'Template and listing readiness')
  })
})
