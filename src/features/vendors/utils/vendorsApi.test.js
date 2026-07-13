import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildVendorCostCenterPayload,
  buildVendorListQuery,
  buildVendorPayload,
  buildVendorProductPayload,
  mapProductTypeOptions,
  mapVendorCostCenterResponse,
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
      providerKey: '',
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
      externalProductId: '',
      productUrl: '',
      designTemplateUrl: '',
      minProductionDays: '',
      maxProductionDays: '',
      baseCostAmount: '',
      currency: '',
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

test('mapVendorCostCenterResponse normalizes BE pricing rows for the drawer table', () => {
  assert.deepEqual(
    mapVendorCostCenterResponse({
      id: 'cost-1',
      code: 'ZIPLVN000000AA01',
      name: 'S / ZIPLVN000000AA01',
      sku: 'ZIPLVN-S',
      vendorSize: 'S',
      vendorColor: 'Black',
      baseCostAmount: 1205,
      currency: 'USD',
      domesticShipping: { economyAmount: 599, additionalAmount: 299 },
      status: 'ACTIVE',
    }),
    {
      id: 'cost-1',
      code: 'ZIPLVN000000AA01',
      name: 'S / ZIPLVN000000AA01',
      sku: 'ZIPLVN-S',
      lngCode: '',
      vendorSize: 'S',
      vendorColor: 'Black',
      standardSize: '',
      standardColor: '',
      baseCostAmount: 1205,
      currency: 'USD',
      domesticShipping: { economyAmount: 599, additionalAmount: 299 },
      internationalShipping: {},
      priorityShipping: {},
      importTaxAmount: undefined,
      status: 'active',
      rawStatus: 'ACTIVE',
    },
  )
})

test('buildVendorProductPayload removes empty optional fields and uppercases currency', () => {
  assert.deepEqual(
    buildVendorProductPayload({
      vendorId: 'vendor-1',
      productTypeGroupId: 'group-1',
      code: ' prd-001 ',
      name: ' Product ',
      externalProductId: '',
      baseCostAmount: '',
      currency: 'usd',
      status: 'ACTIVE',
    }),
    {
      vendorId: 'vendor-1',
      productTypeGroupId: 'group-1',
      code: 'PRD-001',
      name: 'Product',
      currency: 'USD',
      status: 'ACTIVE',
    },
  )
})

test('buildVendorPayload can clear optional provider key on update', () => {
  assert.deepEqual(
    buildVendorPayload(
      {
        code: 'alpha',
        name: 'Alpha Logistics',
        providerKey: '',
        fulfillmentType: 'POD',
        status: 'ACTIVE',
      },
      { mode: 'update' },
    ),
    {
      code: 'ALPHA',
      name: 'Alpha Logistics',
      providerKey: null,
      fulfillmentType: 'POD',
      status: 'ACTIVE',
    },
  )
})

test('buildVendorProductPayload can clear nullable optional fields on update', () => {
  assert.deepEqual(
    buildVendorProductPayload(
      {
        vendorId: 'vendor-1',
        productTypeGroupId: 'group-1',
        code: 'PRD-001',
        name: 'Product',
        externalProductId: '',
        imageUrl: '',
        productUrl: '',
        designTemplateUrl: '',
        minProductionDays: '',
        maxProductionDays: '',
        currency: 'USD',
        status: 'ACTIVE',
      },
      { mode: 'update' },
    ),
    {
      vendorId: 'vendor-1',
      productTypeGroupId: 'group-1',
      code: 'PRD-001',
      name: 'Product',
      externalProductId: null,
      imageUrl: null,
      productUrl: null,
      designTemplateUrl: null,
      minProductionDays: null,
      maxProductionDays: null,
      currency: 'USD',
      status: 'ACTIVE',
    },
  )
})

test('buildVendorCostCenterPayload nests shipping amount fields for BE validator', () => {
  assert.deepEqual(
    buildVendorCostCenterPayload({
      code: ' cc-1 ',
      name: ' Cost Center ',
      sku: '',
      baseCostAmount: '1205',
      currency: 'usd',
      domesticEconomyAmount: '599',
      domesticAdditionalAmount: '',
      status: 'ACTIVE',
    }),
    {
      code: 'CC-1',
      name: 'Cost Center',
      baseCostAmount: 1205,
      currency: 'USD',
      domesticShipping: { economyAmount: 599 },
      status: 'ACTIVE',
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
