import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCatalogSetupQuery,
  buildInternalTemplatePayload,
  buildListingFormPayload,
  buildListingListQuery,
  buildProductTypeGroupPayload,
  mapInternalTemplateResponse,
  mapListingResponse,
  mapListingStats,
  mapProductTypeGroupResponse,
  mapProductTypeOptions,
  mapShopOptions,
  normalizePagination,
} from './listingsApi.js'

test('buildListingListQuery maps a single search field to the backend search query', () => {
  assert.deepEqual(
    buildListingListQuery({
      page: 2,
      limit: 10,
      search: ' b0abc ',
      shopId: 'all',
      seller: 'all',
    }),
    { page: 2, limit: 10, search: 'b0abc' },
  )
})

test('buildListingListQuery maps operational filters and sales sort', () => {
  assert.deepEqual(
    buildListingListQuery({
      productTypeGroupId: 'group-1',
      psdStatus: 'MISSING',
      costCenterStatus: 'PRESENT',
      qcStatus: 'APPROVED',
      status: 'ACTIVE',
      sort: 'orderCountDesc',
    }),
    {
      page: 1,
      limit: 10,
      productTypeGroupId: 'group-1',
      psdStatus: 'MISSING',
      costCenterStatus: 'PRESENT',
      qcStatus: 'APPROVED',
      status: 'ACTIVE',
      sort: 'orderCountDesc',
    },
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
        shop: { id: 'shop-1', name: 'Acc1' },
        productTypeGroup: { id: 'group-1', name: 'Sweatshirt' },
        previewAsset: {
          assetId: 'preview-1',
          previewUrl: 'https://image.test/preview.jpg',
        },
        psdTemplateAssetId: 'asset-1',
        psdTemplateAsset: {
          assetId: 'asset-1',
          originalFilename: 'approved-template.psd',
          size: 2048,
          downloadUrl: '/api/media/assets/asset-1/download',
        },
        psdStatus: 'PRESENT',
        costCenterStatus: 'MISSING',
        qcStatus: 'APPROVED',
        status: 'ACTIVE',
        createdAt: '2026-06-26T00:00:00.000Z',
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'AMAZON_US',
        salesStats: {
          orderCount: 1,
          quantitySold: 2,
          lastSoldAt: '2026-07-15T00:00:00.000Z',
        },
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
      previewUrl: 'https://image.test/preview.jpg',
      date: 'Jun 26, 2026',
      total: 1,
      style: 'Sweatshirt',
      designProduct: '',
      productTypeStatus: '',
      templateStatus: 'missing',
      variant: '',
      psdId: 'asset-1',
      psdTemplateAssetId: 'asset-1',
      psdTemplateAsset: {
        assetId: 'asset-1',
        originalFilename: 'approved-template.psd',
        size: 2048,
        downloadUrl: '/api/media/assets/asset-1/download',
      },
      psdTemplateLabel: 'approved-template.psd',
      psdTemplateSize: '2 KB',
      psdStatus: 'available',
      costStatus: 'missing',
      store: 'Acc1',
      seller: '-',
      channelLabel: 'AMAZON / AMAZON_US',
      salesLabel: '1 orders / 2 qty',
      lastSoldAt: 'Jul 15, 2026',
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
        shop: { id: 'shop-1', name: 'Acc1' },
        previewAsset: {
          assetId: 'preview-1',
          previewUrl: 'https://image.test/preview.jpg',
        },
        productTypeGroup: { id: 'group-1', name: 'Sweatshirt' },
        psdTemplateAssetId: 'asset-1',
        psdTemplateAsset: {
          assetId: 'asset-1',
          originalFilename: 'approved-template.psd',
          size: 2048,
          downloadUrl: '/api/media/assets/asset-1/download',
        },
        psdStatus: 'PRESENT',
        costCenterStatus: 'MISSING',
        qcStatus: 'APPROVED',
        status: 'ACTIVE',
        createdAt: '2026-06-26T00:00:00.000Z',
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'AMAZON_US',
        salesStats: {
          orderCount: 1,
          quantitySold: 2,
          lastSoldAt: '2026-07-15T00:00:00.000Z',
        },
      },
    },
  )
})

test('mapListingResponse never uses shop id as the ownership label', () => {
  assert.equal(
    mapListingResponse({
      id: 'listing-1',
      shopId: '6881aba9c1bbdfc541b5cd4d',
      sku: 'SKU-01',
    }).store,
    'Unknown shop',
  )
})

test('mapListingResponse prefers backend seller display name when available', () => {
  assert.equal(
    mapListingResponse({
      id: 'listing-1',
      sku: 'SKU-01',
      seller: { name: 'Nguyen Minh Duc' },
      salesChannelCode: 'AMAZON',
      marketplaceCode: 'AMAZON_US',
    }).seller,
    'Nguyen Minh Duc',
  )

  assert.equal(
    mapListingResponse({
      id: 'listing-2',
      sku: 'SKU-02',
      sellerDisplayName: 'Vuong Van Oai',
    }).seller,
    'Vuong Van Oai',
  )

  assert.equal(
    mapListingResponse({
      id: 'listing-3',
      sku: 'SKU-03',
      seller: 'Chu Quang Hao',
    }).seller,
    'Chu Quang Hao',
  )

  assert.equal(
    mapListingResponse({
      id: 'listing-4',
      sku: 'J2508-TS2S-280226-2017',
      seller: { employeeCode: 'J2508', name: null },
    }).seller,
    'J2508',
  )
})

test('mapListingResponse maps variant only from backend variant fields', () => {
  assert.equal(
    mapListingResponse({
      id: 'listing-1',
      sku: 'SKU-01',
      variantName: 'Black / XL',
    }).variant,
    'Black / XL',
  )

  assert.equal(
    mapListingResponse({
      id: 'listing-2',
      sku: 'SKU-02',
      selectedVariant: { sku: 'BLACK-XL' },
    }).variant,
    'BLACK-XL',
  )

  assert.equal(
    mapListingResponse({
      id: 'listing-3',
      sku: 'SKU-03',
      templateVariant: { name: 'Default mockup' },
    }).variant,
    'Default mockup',
  )
})

test('mapListingResponse reads backend timestamp variants and sales activity for the date column', () => {
  const listing = mapListingResponse(
    {
      id: 'listing-1',
      sku: 'SKU-01',
      salesStats: { lastSoldAt: '2026-06-26T00:00:00.000Z' },
    },
    { locale: 'en' },
  )

  assert.equal(listing.date, 'Jun 26, 2026')
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

test('mapProductTypeGroupResponse exposes readable product type fields', () => {
  assert.deepEqual(
    mapProductTypeGroupResponse({
      id: 'group-1',
      code: 'TSHIRT',
      name: 'T-Shirt',
      sortOrder: 20,
      status: 'ACTIVE',
    }),
    {
      id: 'group-1',
      code: 'TSHIRT',
      name: 'T-Shirt',
      sortOrder: 20,
      status: 'ACTIVE',
      isActive: true,
      raw: {
        id: 'group-1',
        code: 'TSHIRT',
        name: 'T-Shirt',
        sortOrder: 20,
        status: 'ACTIVE',
      },
    },
  )
})

test('buildCatalogSetupQuery keeps catalog setup search params backend-compatible', () => {
  assert.deepEqual(
    buildCatalogSetupQuery({
      page: 2,
      limit: 20,
      search: ' shirt ',
      status: 'ACTIVE',
      productTypeGroupId: 'group-1',
    }),
    { page: 2, limit: 20, search: 'shirt', status: 'ACTIVE', productTypeGroupId: 'group-1' },
  )

  assert.deepEqual(buildCatalogSetupQuery({ search: ' main ' }, { searchParam: 'q' }), {
    page: 1,
    limit: 10,
    q: 'main',
  })
})

test('buildProductTypeGroupPayload creates and updates business fields only', () => {
  assert.deepEqual(
    buildProductTypeGroupPayload({
      code: ' tshirt ',
      name: ' T-Shirt ',
      sortOrder: '20',
      status: 'ACTIVE',
    }),
    { code: 'TSHIRT', name: 'T-Shirt', sortOrder: 20, status: 'ACTIVE' },
  )

  assert.deepEqual(
    buildProductTypeGroupPayload(
      {
        code: 'TSHIRT',
        name: 'Updated Shirt',
        sortOrder: '',
        status: 'INACTIVE',
      },
      { mode: 'update' },
    ),
    { name: 'Updated Shirt', status: 'INACTIVE' },
  )
})

test('mapInternalTemplateResponse exposes readable template fields', () => {
  assert.deepEqual(
    mapInternalTemplateResponse({
      id: 'template-1',
      code: 'TSHIRT_MAIN',
      name: 'T-Shirt Main',
      description: 'Customer shirt inputs',
      productTypeGroupId: 'group-1',
      productTypeGroup: { id: 'group-1', name: 'T-Shirt' },
      requiredFields: [{ key: 'customName' }],
      artworkSlots: [{ key: 'frontText' }, { key: 'backText' }],
      designAssets: [{ assetId: 'asset-1' }],
      status: 'ACTIVE',
    }),
    {
      id: 'template-1',
      code: 'TSHIRT_MAIN',
      name: 'T-Shirt Main',
      description: 'Customer shirt inputs',
      productType: 'T-Shirt',
      productTypeGroupId: 'group-1',
      requiredFields: [{ key: 'customName' }],
      artworkSlots: [{ key: 'frontText' }, { key: 'backText' }],
      designAssets: [{ assetId: 'asset-1' }],
      requiredFieldCount: 1,
      artworkSlotCount: 2,
      designAssetCount: 1,
      status: 'ACTIVE',
      isActive: true,
      raw: {
        id: 'template-1',
        code: 'TSHIRT_MAIN',
        name: 'T-Shirt Main',
        description: 'Customer shirt inputs',
        productTypeGroupId: 'group-1',
        productTypeGroup: { id: 'group-1', name: 'T-Shirt' },
        requiredFields: [{ key: 'customName' }],
        artworkSlots: [{ key: 'frontText' }, { key: 'backText' }],
        designAssets: [{ assetId: 'asset-1' }],
        status: 'ACTIVE',
      },
    },
  )
})

test('buildInternalTemplatePayload includes internal template field arrays', () => {
  assert.deepEqual(
    buildInternalTemplatePayload({
      code: ' tshirt_main ',
      name: ' T-Shirt Main ',
      description: ' Customer shirt inputs ',
      productTypeGroupId: 'group-1',
      requiredFields: [
        {
          key: ' customName ',
          label: ' Custom Name ',
          type: 'TEXT',
          required: true,
          source: 'CUSTOMER_INPUT',
          sortOrder: '1',
        },
      ],
      artworkSlots: [
        {
          key: 'frontText',
          label: 'Front Text',
          type: 'TEXT',
          required: true,
          acceptedFieldKeys: ' customName, ignoredMissing ',
          outputRole: 'FRONT',
          sortOrder: '2',
        },
      ],
      designAssets: [
        {
          type: 'PSD_TEMPLATE',
          mediaAssetId: '660000000000000000000901',
          version: ' v1 ',
          label: ' Main PSD ',
          status: 'ACTIVE',
        },
      ],
      status: 'ACTIVE',
    }),
    {
      code: 'TSHIRT_MAIN',
      name: 'T-Shirt Main',
      description: 'Customer shirt inputs',
      productTypeGroupId: 'group-1',
      status: 'ACTIVE',
      requiredFields: [
        {
          key: 'customName',
          label: 'Custom Name',
          type: 'TEXT',
          required: true,
          source: 'CUSTOMER_INPUT',
          sortOrder: 1,
        },
      ],
      artworkSlots: [
        {
          key: 'frontText',
          label: 'Front Text',
          type: 'TEXT',
          required: true,
          acceptedFieldKeys: ['customName', 'ignoredMissing'],
          outputRole: 'FRONT',
          sortOrder: 2,
        },
      ],
      designAssets: [
        {
          type: 'PSD_TEMPLATE',
          mediaAssetId: '660000000000000000000901',
          version: 'v1',
          label: 'Main PSD',
          status: 'ACTIVE',
        },
      ],
    },
  )

  assert.deepEqual(
    buildInternalTemplatePayload(
      {
        code: 'TSHIRT_MAIN',
        name: 'Updated Template',
        description: '',
        productTypeGroupId: 'group-1',
        requiredFields: [{ key: 'customName', type: 'TEXT' }],
        artworkSlots: [],
        designAssets: [],
        status: 'INACTIVE',
      },
      { mode: 'update' },
    ),
    {
      name: 'Updated Template',
      productTypeGroupId: 'group-1',
      requiredFields: [{ key: 'customName', type: 'TEXT' }],
      artworkSlots: [],
      designAssets: [],
      status: 'INACTIVE',
    },
  )
})
