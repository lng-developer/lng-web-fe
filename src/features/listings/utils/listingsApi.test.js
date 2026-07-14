import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildListingFormPayload,
  buildListingListQuery,
  mapListingResponse,
  mapListingStats,
  mapProductTypeOptions,
  mapShopOptions,
  normalizePagination,
} from './listingsApi.js'

test('buildListingListQuery maps UI search to asin by default and removes empty values', () => {
  assert.deepEqual(
    buildListingListQuery({
      page: 2,
      limit: 10,
      search: ' b0abc ',
      shopId: 'all',
      seller: 'all',
    }),
    { page: 2, limit: 10, asin: 'B0ABC' },
  )
})

test('buildListingListQuery can search SKU when selected explicitly', () => {
  assert.deepEqual(
    buildListingListQuery({
      page: 1,
      limit: 20,
      search: ' sku-01 ',
      searchField: 'sku',
      shopId: 'shop-1',
    }),
    { page: 1, limit: 20, sku: 'SKU-01', shopId: 'shop-1' },
  )
})

test('buildListingListQuery maps supported BE-backed tabs to query params', () => {
  assert.deepEqual(buildListingListQuery({ tab: 'amazon' }), {
    page: 1,
    limit: 10,
    salesChannelCode: 'AMAZON',
  })
  assert.deepEqual(buildListingListQuery({ tab: 'noPsd' }), {
    page: 1,
    limit: 10,
    psdStatus: 'MISSING',
  })
  assert.deepEqual(buildListingListQuery({ tab: 'approved' }), {
    page: 1,
    limit: 10,
    qcStatus: 'APPROVED',
  })
})

test('mapListingStats derives psd available from total minus no PSD when BE does not provide it', () => {
  assert.deepEqual(
    mapListingStats({
      totalListingCount: 5,
      amazonListingCount: 3,
      etsyListingCount: 2,
      noPsdCount: 1,
      draftCount: 2,
      approvedCount: 2,
      rejectedCount: 1,
    }),
    {
      totalAsin: 5,
      anonymousAsin: 0,
      psdAvailable: 4,
      amazon: 3,
      etsy: 2,
      noPsd: 1,
      draft: 2,
      approved: 2,
      rejected: 1,
    },
  )
})

test('mapListingResponse flattens catalog listing response for the table', () => {
  assert.deepEqual(
    mapListingResponse(
      {
        id: 'listing-1',
        shopId: 'shop-1',
        asin: 'B0ABC',
        sku: 'SKU-01',
        title: 'Personalized Shirt',
        productTypeGroup: { id: 'group-1', name: 'Sweatshirt' },
        psdTemplateAssetId: 'asset-1',
        psdStatus: 'PRESENT',
        qcStatus: 'APPROVED',
        status: 'ACTIVE',
        createdAt: '2026-06-26T00:00:00.000Z',
      },
      {
        locale: 'en',
        shopNameById: new Map([['shop-1', 'Acc1']]),
      },
    ),
    {
      id: 'listing-1',
      asinProductId: 'B0ABC',
      sku: 'SKU-01',
      title: 'Personalized Shirt',
      date: 'Jun 26, 2026',
      total: 1,
      style: 'Sweatshirt',
      designProduct: '',
      variant: '',
      psdId: 'asset-1',
      psdTemplateAssetId: 'asset-1',
      psdStatus: 'available',
      store: 'Acc1',
      seller: '',
      asinType: 'normal',
      shopId: 'shop-1',
      productTypeGroupId: 'group-1',
      internalTemplateId: '',
      rawStatus: 'ACTIVE',
      rawQcStatus: 'APPROVED',
      rawPsdStatus: 'PRESENT',
      raw: {
        id: 'listing-1',
        shopId: 'shop-1',
        asin: 'B0ABC',
        sku: 'SKU-01',
        title: 'Personalized Shirt',
        productTypeGroup: { id: 'group-1', name: 'Sweatshirt' },
        psdTemplateAssetId: 'asset-1',
        psdStatus: 'PRESENT',
        qcStatus: 'APPROVED',
        status: 'ACTIVE',
        createdAt: '2026-06-26T00:00:00.000Z',
      },
    },
  )
})

test('buildListingFormPayload creates BE-compatible payload and omits empty optional fields', () => {
  assert.deepEqual(
    buildListingFormPayload({
      shopId: 'shop-1',
      salesChannelCode: 'amazon',
      marketplaceCode: ' us ',
      sku: ' sku-01 ',
      asin: ' b0abc ',
      title: ' Shirt ',
      productTypeGroupId: 'group-1',
      internalTemplateId: '',
      status: 'ACTIVE',
      psdStatus: 'MISSING',
      costCenterStatus: 'PRESENT',
      baseCostAmount: '1200',
      currency: 'usd',
    }),
    {
      shopId: 'shop-1',
      salesChannelCode: 'AMAZON',
      marketplaceCode: 'US',
      sku: 'SKU-01',
      asin: 'B0ABC',
      title: 'Shirt',
      productTypeGroupId: 'group-1',
      status: 'ACTIVE',
      psdStatus: 'MISSING',
      costCenterStatus: 'PRESENT',
      baseCostAmount: 1200,
      currency: 'USD',
    },
  )
})

test('buildListingFormPayload update never sends immutable fields', () => {
  assert.deepEqual(
    buildListingFormPayload(
      {
        shopId: 'shop-1',
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'US',
        sku: 'SKU-01',
        asin: 'B0ABC',
        title: 'Updated Shirt',
        productTypeGroupId: 'group-1',
        internalTemplateId: '',
        costCenterStatus: 'MISSING',
        psdStatus: 'PRESENT',
        status: 'ACTIVE',
      },
      { mode: 'update' },
    ),
    {
      asin: 'B0ABC',
      title: 'Updated Shirt',
      productTypeGroupId: 'group-1',
      internalTemplateId: null,
      costCenterStatus: 'MISSING',
      psdStatus: 'PRESENT',
      status: 'ACTIVE',
    },
  )
})

test('map option helpers expose shop and product type labels', () => {
  assert.deepEqual(mapShopOptions([{ id: 'shop-1', name: 'Acc1' }]), [
    { id: 'shop-1', label: 'Acc1' },
  ])
  assert.deepEqual(mapProductTypeOptions([{ id: 'group-1', name: 'Sweatshirt' }]), [
    { id: 'group-1', label: 'Sweatshirt' },
  ])
})

test('normalizePagination provides safe defaults', () => {
  assert.deepEqual(normalizePagination(null), { page: 1, limit: 10, total: 0 })
})
