const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100
const TAB_QUERY_MAP = {
  amazon: { salesChannelCode: 'AMAZON' },
  etsy: { salesChannelCode: 'ETSY' },
  noPsd: { psdStatus: 'MISSING' },
  draft: { qcStatus: 'DRAFT' },
  approved: { qcStatus: 'APPROVED' },
  rejected: { qcStatus: 'REJECTED' },
}

function trimValue(value) {
  return typeof value === 'string' ? value.trim() : value
}

function normalizeUpper(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function normalizeLower(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function optionalText(value) {
  const cleaned = trimValue(value)
  return cleaned === '' || cleaned === null || cleaned === undefined ? undefined : cleaned
}

function optionalNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function optionalBoolean(value) {
  return typeof value === 'boolean' ? value : undefined
}

function cleanObject(payload = {}, options = {}) {
  return Object.entries(payload).reduce((result, [key, rawValue]) => {
    const value = trimValue(rawValue)

    if (value === null && options.preserveNull) {
      return { ...result, [key]: value }
    }

    if (value === '' || value === null || value === undefined) {
      return result
    }

    return { ...result, [key]: value }
  }, {})
}

function parseArrayValue(value, fallback = []) {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return fallback
  const parsed = JSON.parse(value)
  return Array.isArray(parsed) ? parsed : fallback
}

function normalizeStringList(value) {
  if (Array.isArray(value)) return value.map(optionalText).filter(Boolean)
  return String(value || '')
    .split(',')
    .map(optionalText)
    .filter(Boolean)
}

function normalizeRequiredField(field = {}) {
  return cleanObject({
    key: optionalText(field.key),
    label: optionalText(field.label),
    type: optionalText(field.type),
    required: optionalBoolean(field.required),
    source: optionalText(field.source),
    validation: field.validation,
    sortOrder: optionalNumber(field.sortOrder),
  })
}

function normalizeArtworkSlot(slot = {}) {
  return cleanObject({
    key: optionalText(slot.key),
    label: optionalText(slot.label),
    type: optionalText(slot.type),
    required: optionalBoolean(slot.required),
    acceptedFieldKeys: normalizeStringList(slot.acceptedFieldKeys),
    outputRole: optionalText(slot.outputRole),
    sortOrder: optionalNumber(slot.sortOrder),
  })
}

function normalizeDesignAsset(asset = {}) {
  return cleanObject({
    type: optionalText(asset.type),
    mediaAssetId: optionalText(asset.mediaAssetId),
    version: optionalText(asset.version),
    label: optionalText(asset.label),
    status: optionalText(asset.status),
    metadata: asset.metadata,
  })
}

function formatDate(value, locale = 'en') {
  if (!value) return '-'

  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function formatBytes(value) {
  const size = Number(value)
  if (!Number.isFinite(size) || size <= 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function getListingDate(listing = {}) {
  return (
    listing.createdAt ||
    listing.created_at ||
    listing.createdDate ||
    listing.created_date ||
    listing.listedAt ||
    listing.listed_at ||
    listing.importedAt ||
    listing.imported_at ||
    listing.salesStats?.lastSoldAt ||
    listing.updatedAt ||
    listing.updated_at
  )
}

export function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

export function normalizePagination(pagination) {
  return {
    page: Math.max(Number(pagination?.page) || DEFAULT_PAGE, DEFAULT_PAGE),
    limit: Math.max(Number(pagination?.limit) || DEFAULT_LIMIT, 1),
    total: Math.max(Number(pagination?.total) || 0, 0),
  }
}

export function buildListingListQuery(filters = {}) {
  const search = optionalText(filters.search)
  const searchField = filters.searchField === 'sku' ? 'sku' : 'asin'
  const shopId = filters.shopId === 'all' ? '' : filters.shopId
  const tabQuery = TAB_QUERY_MAP[filters.tab] || {}

  return cleanObject({
    page: Math.max(Number(filters.page) || DEFAULT_PAGE, DEFAULT_PAGE),
    limit: Math.min(Math.max(Number(filters.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT),
    shopId,
    salesChannelCode: tabQuery.salesChannelCode || filters.salesChannelCode,
    psdStatus: filters.psdStatus,
    ...(tabQuery.psdStatus ? { psdStatus: tabQuery.psdStatus } : {}),
    qcStatus: filters.qcStatus,
    ...(tabQuery.qcStatus ? { qcStatus: tabQuery.qcStatus } : {}),
    status: filters.status,
    productTypeGroupId: filters.productTypeGroupId,
    costCenterStatus: filters.costCenterStatus,
    sort: filters.sort,
    [searchField]: search ? normalizeUpper(search) : undefined,
  })
}

export function buildCatalogSetupQuery(filters = {}, options = {}) {
  const search = optionalText(filters.search)
  const searchParam = options.searchParam || 'search'

  return cleanObject({
    page: Math.max(Number(filters.page) || DEFAULT_PAGE, DEFAULT_PAGE),
    limit: Math.min(Math.max(Number(filters.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT),
    [searchParam]: search,
    status: filters.status === 'all' ? undefined : filters.status,
    productTypeGroupId:
      filters.productTypeGroupId === 'all' ? undefined : filters.productTypeGroupId,
  })
}

export function mapListingStats(summary = {}) {
  const totalAsin = Number(summary.totalListingCount) || 0
  const noPsd = Number(summary.noPsdCount) || 0
  const explicitPsdAvailable = Number(summary.psdAvailableCount)

  return {
    totalAsin,
    anonymousAsin: Number(summary.anonymousAsinCount) || 0,
    psdAvailable: Number.isFinite(explicitPsdAvailable)
      ? explicitPsdAvailable
      : Math.max(totalAsin - noPsd, 0),
    amazon: Number(summary.amazonListingCount) || 0,
    etsy: Number(summary.etsyListingCount) || 0,
    noPsd,
    draft: Number(summary.draftCount) || 0,
    approved: Number(summary.approvedCount) || 0,
    rejected: Number(summary.rejectedCount) || 0,
  }
}

export function mapListingResponse(listing = {}, options = {}) {
  const productTypeGroup = listing.productTypeGroup || {}
  const internalTemplate = listing.internalTemplate || {}
  const salesStats = listing.salesStats || {}
  const shopName = listing.shop?.name || options.shopNameById?.get(listing.shopId) || 'Unknown shop'
  const asinProductId = listing.asin || listing.etsyListingId || listing.sku || listing.id || '-'
  const psdTemplateAsset = listing.psdTemplateAsset || null
  const psdTemplateAssetId = psdTemplateAsset?.assetId || listing.psdTemplateAssetId || ''
  const previewAsset = listing.previewAsset || null
  const rawPsdStatus = listing.psdStatus || ''
  const orderCount = Number(salesStats.orderCount) || 0
  const quantitySold = Number(salesStats.quantitySold) || 0

  return {
    id: listing.id,
    asinProductId,
    sku: listing.sku || '',
    title: listing.title || '',
    previewUrl: previewAsset?.previewUrl || previewAsset?.secureUrl || '',
    date: formatDate(getListingDate(listing), options.locale),
    total: 1,
    style: productTypeGroup.name || productTypeGroup.code || '-',
    designProduct: internalTemplate.name || internalTemplate.code || '',
    productTypeStatus: productTypeGroup.status || '',
    templateStatus: internalTemplate.id ? 'available' : 'missing',
    variant: '',
    psdId: psdTemplateAssetId || listing.sku || '-',
    psdTemplateAssetId,
    psdTemplateAsset,
    psdTemplateLabel:
      psdTemplateAsset?.originalFilename || (psdTemplateAssetId ? 'PSD file ready' : ''),
    psdTemplateSize: formatBytes(psdTemplateAsset?.size),
    psdStatus: rawPsdStatus === 'PRESENT' ? 'available' : 'missing',
    costStatus: normalizeLower(listing.costCenterStatus || 'unknown'),
    store: shopName,
    seller: `${listing.salesChannelCode || '-'} / ${listing.marketplaceCode || '-'}`,
    channelLabel: `${listing.salesChannelCode || '-'} / ${listing.marketplaceCode || '-'}`,
    salesLabel: `${orderCount} orders / ${quantitySold} qty`,
    lastSoldAt: formatDate(salesStats.lastSoldAt, options.locale),
    asinType:
      normalizeLower(listing.qcStatus) === 'approved'
        ? 'normal'
        : normalizeLower(listing.qcStatus || 'unknown'),
    shopId: listing.shopId || '',
    productTypeGroupId: productTypeGroup.id || '',
    internalTemplateId: internalTemplate.id || '',
    rawStatus: listing.status || '',
    rawQcStatus: listing.qcStatus || '',
    rawPsdStatus,
    raw: listing,
  }
}

export function mapPaginatedListingResponse(response = {}, options = {}) {
  return {
    items: (response?.items || []).map((item) => mapListingResponse(item, options)),
    pagination: normalizePagination(response?.pagination),
  }
}

export function mapShopOptions(shops = []) {
  return shops.map((shop) => ({
    id: shop.id,
    label: shop.name || shop.id,
  }))
}

export function mapProductTypeOptions(groups = []) {
  return groups.map((group) => ({
    id: group.id,
    label: group.name || group.code || group.id,
  }))
}

export function mapProductTypeGroupResponse(group = {}) {
  return {
    id: group.id,
    code: group.code || '',
    name: group.name || group.code || '',
    sortOrder: Number(group.sortOrder) || 0,
    status: group.status || 'INACTIVE',
    isActive: group.status === 'ACTIVE',
    raw: group,
  }
}

export function mapPaginatedProductTypeGroupResponse(response = {}) {
  return {
    items: (response?.items || []).map(mapProductTypeGroupResponse),
    pagination: normalizePagination(response?.pagination),
  }
}

export function mapInternalTemplateResponse(template = {}) {
  const productTypeGroup = template.productTypeGroup || {}
  const requiredFields = Array.isArray(template.requiredFields) ? template.requiredFields : []
  const artworkSlots = Array.isArray(template.artworkSlots) ? template.artworkSlots : []
  const designAssets = Array.isArray(template.designAssets) ? template.designAssets : []

  return {
    id: template.id,
    code: template.code || '',
    name: template.name || template.code || '',
    description: template.description || '',
    productType: productTypeGroup.name || productTypeGroup.code || '',
    productTypeGroupId: template.productTypeGroupId || productTypeGroup.id || '',
    requiredFields,
    artworkSlots,
    designAssets,
    requiredFieldCount: Number(template.requiredFieldsCount ?? requiredFields.length) || 0,
    artworkSlotCount: Number(template.artworkSlotsCount ?? artworkSlots.length) || 0,
    designAssetCount: Number(template.designAssetsCount ?? designAssets.length) || 0,
    status: template.status || 'INACTIVE',
    isActive: template.status === 'ACTIVE',
    raw: template,
  }
}

export function mapPaginatedInternalTemplateResponse(response = {}) {
  return {
    items: (response?.items || []).map(mapInternalTemplateResponse),
    pagination: normalizePagination(response?.pagination),
  }
}

export function buildListingFormPayload(values = {}, options = {}) {
  const isUpdate = options.mode === 'update'

  return cleanObject(
    {
      shopId: isUpdate ? undefined : values.shopId,
      salesChannelCode: isUpdate ? undefined : normalizeUpper(values.salesChannelCode),
      marketplaceCode: isUpdate ? undefined : normalizeUpper(values.marketplaceCode),
      sku: isUpdate ? undefined : normalizeUpper(values.sku),
      asin: normalizeUpper(values.asin),
      etsyListingId: values.etsyListingId,
      title: values.title,
      productTypeGroupId: values.productTypeGroupId,
      internalTemplateId: isUpdate && !values.internalTemplateId ? null : values.internalTemplateId,
      baseCostAmount: optionalNumber(values.baseCostAmount),
      currency: normalizeUpper(values.currency),
      costCenterStatus: values.costCenterStatus,
      status: values.status,
      psdStatus: values.psdStatus,
    },
    { preserveNull: isUpdate },
  )
}

export function buildProductTypeGroupPayload(values = {}, options = {}) {
  const isUpdate = options.mode === 'update'

  return cleanObject({
    code: isUpdate ? undefined : normalizeUpper(values.code),
    name: values.name,
    sortOrder: optionalNumber(values.sortOrder),
    status: values.status,
  })
}

export function buildInternalTemplatePayload(values = {}, options = {}) {
  const isUpdate = options.mode === 'update'
  const requiredFields = parseArrayValue(values.requiredFieldsText, values.requiredFields || [])
  const artworkSlots = parseArrayValue(values.artworkSlotsText, values.artworkSlots || [])
  const designAssets = parseArrayValue(values.designAssetsText, values.designAssets || [])

  return cleanObject({
    code: isUpdate ? undefined : normalizeUpper(values.code),
    name: values.name,
    description: values.description,
    productTypeGroupId: values.productTypeGroupId,
    requiredFields: requiredFields.map(normalizeRequiredField).filter((field) => field.key),
    artworkSlots: artworkSlots.map(normalizeArtworkSlot).filter((slot) => slot.key),
    designAssets: designAssets
      .map(normalizeDesignAsset)
      .filter((asset) => asset.type && asset.mediaAssetId),
    status: values.status,
  })
}
