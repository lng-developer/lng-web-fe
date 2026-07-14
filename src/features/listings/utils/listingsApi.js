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
    [searchField]: search ? normalizeUpper(search) : undefined,
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
  const shopName =
    options.shopNameById?.get(listing.shopId) || listing.shop?.name || listing.shopId || '-'
  const asinProductId = listing.asin || listing.etsyListingId || listing.sku || listing.id || '-'
  const psdTemplateAssetId = listing.psdTemplateAssetId || ''
  const rawPsdStatus = listing.psdStatus || ''

  return {
    id: listing.id,
    asinProductId,
    sku: listing.sku || '',
    title: listing.title || '',
    date: formatDate(listing.createdAt || listing.updatedAt, options.locale),
    total: 1,
    style: productTypeGroup.name || productTypeGroup.code || '-',
    designProduct: listing.internalTemplate?.name || listing.internalTemplate?.code || '',
    variant: '',
    psdId: psdTemplateAssetId || listing.sku || '-',
    psdTemplateAssetId,
    psdStatus: rawPsdStatus === 'PRESENT' ? 'available' : 'missing',
    store: shopName,
    seller: '',
    asinType:
      normalizeLower(listing.qcStatus) === 'approved'
        ? 'normal'
        : normalizeLower(listing.qcStatus || 'unknown'),
    shopId: listing.shopId || '',
    productTypeGroupId: productTypeGroup.id || '',
    internalTemplateId: listing.internalTemplate?.id || '',
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
