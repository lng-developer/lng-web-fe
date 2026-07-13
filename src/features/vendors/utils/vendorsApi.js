const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10

function trimValue(value) {
  return typeof value === 'string' ? value.trim() : value
}

function normalizeLower(value) {
  return String(value ?? '').toLowerCase()
}

function cleanQuery(query = {}) {
  return Object.entries(query).reduce((params, [key, rawValue]) => {
    const value = trimValue(rawValue)

    if (value === '' || value === null || value === undefined) {
      return params
    }

    if (key === 'page') {
      return { ...params, page: Math.max(Number(value) || DEFAULT_PAGE, DEFAULT_PAGE) }
    }

    if (key === 'limit') {
      return { ...params, limit: Math.min(Math.max(Number(value) || DEFAULT_LIMIT, 1), 100) }
    }

    return { ...params, [key]: value }
  }, {})
}

export function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

export function buildVendorListQuery(query = {}) {
  const { search, ...rest } = query

  return cleanQuery({
    ...rest,
    q: search,
  })
}

export function normalizePagination(pagination) {
  return {
    page: Math.max(Number(pagination?.page) || DEFAULT_PAGE, DEFAULT_PAGE),
    limit: Math.max(Number(pagination?.limit) || DEFAULT_LIMIT, 1),
    total: Math.max(Number(pagination?.total) || 0, 0),
  }
}

export function mapVendorResponse(vendor = {}) {
  const rawFulfillmentType = vendor.fulfillmentType || ''
  const rawStatus = vendor.status || ''

  return {
    id: vendor.id,
    code: vendor.code,
    name: vendor.name || vendor.code || '',
    fulfillmentType: normalizeLower(rawFulfillmentType),
    status: normalizeLower(rawStatus),
    rawFulfillmentType,
    rawStatus,
  }
}

export function mapVendorProductResponse(product = {}) {
  const vendor = product.vendor || {}
  const productTypeGroup = product.productTypeGroup || {}
  const rawStatus = product.status || ''

  return {
    id: product.id,
    code: product.code,
    imageUrl: product.imageUrl || null,
    name: product.name || product.code || '',
    productId: product.code || product.externalProductId || product.id || '',
    vendorId: vendor.id || null,
    vendorCode: vendor.code || '',
    vendorName: vendor.name || vendor.code || '',
    productTypeGroupId: productTypeGroup.id || null,
    productType: productTypeGroup.name || productTypeGroup.code || '',
    status: normalizeLower(rawStatus),
    rawStatus,
    costCenterCount: Number(product.costCenterCount) || 0,
  }
}

export function mapProductTypeOptions(groups = []) {
  return groups.map((group) => ({
    id: group.id,
    label: group.name || group.code || group.id,
    status: group.status,
  }))
}

export function mapPaginatedResponse(response, mapper) {
  return {
    items: (response?.items || []).map(mapper),
    pagination: normalizePagination(response?.pagination),
  }
}
