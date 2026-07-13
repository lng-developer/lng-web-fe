import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildVendorListQuery,
  mapProductTypeOptions,
  mapVendorProductResponse,
  mapVendorResponse,
  normalizePagination,
} from './vendorsApi.js'

test('buildVendorListQuery sends search as BE q and removes empty values', () => {
  assert.deepEqual(
    buildVendorListQuery({
      page: 2,
      limit: 10,
      search: ' Alpha ',
      status: '',
    }),
    { page: 2, limit: 10, q: 'Alpha' },
  )
})

test('mapVendorResponse normalizes uppercase BE status and fulfillment type for UI', () => {
  assert.deepEqual(
    mapVendorResponse({
      id: 'vendor-1',
      code: 'ALPHA',
      name: 'Alpha Logistics',
      fulfillmentType: 'POD',
      status: 'ACTIVE',
    }),
    {
      id: 'vendor-1',
      code: 'ALPHA',
      name: 'Alpha Logistics',
      fulfillmentType: 'pod',
      status: 'active',
      rawFulfillmentType: 'POD',
      rawStatus: 'ACTIVE',
    },
  )
})

test('mapVendorProductResponse flattens vendor and product type group data', () => {
  assert.deepEqual(
    mapVendorProductResponse({
      id: 'product-1',
      code: 'PRD-001234',
      name: 'Premium Wireless Headphones',
      imageUrl: 'https://example.com/image.jpg',
      vendor: { id: 'vendor-1', code: 'ALPHA', name: 'Alpha Logistics' },
      productTypeGroup: { id: 'group-1', name: 'Electronics' },
      status: 'ACTIVE',
      costCenterCount: 3,
    }),
    {
      id: 'product-1',
      code: 'PRD-001234',
      imageUrl: 'https://example.com/image.jpg',
      name: 'Premium Wireless Headphones',
      productId: 'PRD-001234',
      vendorId: 'vendor-1',
      vendorCode: 'ALPHA',
      vendorName: 'Alpha Logistics',
      productTypeGroupId: 'group-1',
      productType: 'Electronics',
      status: 'active',
      rawStatus: 'ACTIVE',
      costCenterCount: 3,
    },
  )
})

test('mapProductTypeOptions keeps active and inactive groups selectable', () => {
  assert.deepEqual(
    mapProductTypeOptions([
      { id: 'group-1', name: 'Electronics', status: 'ACTIVE' },
      { id: 'group-2', code: 'NO_NAME', status: 'INACTIVE' },
    ]),
    [
      { id: 'group-1', label: 'Electronics', status: 'ACTIVE' },
      { id: 'group-2', label: 'NO_NAME', status: 'INACTIVE' },
    ],
  )
})

test('normalizePagination provides safe defaults', () => {
  assert.deepEqual(normalizePagination(null), { page: 1, limit: 10, total: 0 })
})
