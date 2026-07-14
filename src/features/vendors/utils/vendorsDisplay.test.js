import assert from 'node:assert/strict'
import test from 'node:test'

import {
  filterVendorProducts,
  filterVendors,
  getVendorProductPages,
  paginateVendorProducts,
} from './vendorsDisplay.js'

const vendors = [
  { name: 'Alpha Logistics', fulfillmentType: 'api', status: 'active' },
  { name: 'Beta Supply Co.', fulfillmentType: 'manual', status: 'inactive' },
]

const products = [
  {
    name: 'Premium Wireless Headphones',
    vendorName: 'Alpha Logistics',
    productId: 'PRD-001234',
    vendorCode: 'Alpha',
    productType: 'Electronics',
  },
  {
    name: 'Smart Watch Pro',
    vendorName: 'Beta Supply Co.',
    productId: 'PRD-002891',
    vendorCode: 'Beta',
    productType: 'Accessories',
  },
]

test('filterVendors searches by vendor name and fulfillment metadata', () => {
  assert.deepEqual(
    filterVendors(vendors, 'manual').map((vendor) => vendor.name),
    ['Beta Supply Co.'],
  )
  assert.deepEqual(
    filterVendors(vendors, 'alpha').map((vendor) => vendor.name),
    ['Alpha Logistics'],
  )
})

test('filterVendorProducts combines search with vendor filter', () => {
  assert.deepEqual(
    filterVendorProducts(products, { search: 'prd-001', vendor: 'all' }).map(
      (product) => product.productId,
    ),
    ['PRD-001234'],
  )
  assert.deepEqual(
    filterVendorProducts(products, { search: 'watch', vendor: 'alpha' }).map(
      (product) => product.productId,
    ),
    [],
  )
})

test('getVendorProductPages keeps boundaries and current window visible', () => {
  assert.deepEqual(getVendorProductPages(1, 30), [1, 2, 3, 4, 5, '...', 30])
  assert.deepEqual(getVendorProductPages(4, 30), [1, '...', 3, 4, 5, '...', 30])
  assert.deepEqual(getVendorProductPages(30, 30), [1, '...', 29, 30])
})

test('paginateVendorProducts returns the requested page slice', () => {
  assert.deepEqual(
    paginateVendorProducts([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], 2, 2).map(
      (product) => product.id,
    ),
    [3, 4],
  )
})
