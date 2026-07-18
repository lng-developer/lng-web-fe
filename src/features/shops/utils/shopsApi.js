const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20

function trimValue(value) {
  return typeof value === 'string' ? value.trim() : value
}

function upperValue(value) {
  const trimmed = trimValue(value)
  return trimmed ? String(trimmed).toUpperCase() : trimmed
}

function cleanObject(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  )
}

function cleanQuery(query = {}) {
  return Object.entries(query).reduce((params, [key, rawValue]) => {
    const value = trimValue(rawValue)
    if (value === '' || value === null || value === undefined) return params
    if (key === 'page') return { ...params, page: Math.max(Number(value) || DEFAULT_PAGE, 1) }
    if (key === 'limit')
      return { ...params, limit: Math.min(Math.max(Number(value) || DEFAULT_LIMIT, 1), 100) }
    return { ...params, [key]: value }
  }, {})
}

function normalizePagination(pagination = {}) {
  return {
    page: Math.max(Number(pagination.page) || DEFAULT_PAGE, 1),
    limit: Math.max(Number(pagination.limit) || DEFAULT_LIMIT, 1),
    total: Math.max(Number(pagination.total) || 0, 0),
  }
}

export function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

export function buildShopListQuery(query = {}) {
  return cleanQuery({
    id: query.id,
    search: query.search,
    status: query.status && query.status !== 'all' ? upperValue(query.status) : undefined,
    page: query.page,
    limit: query.limit,
  })
}

export function buildCreateShopPayload(payload = {}) {
  return cleanObject({
    name: trimValue(payload.name),
    currency: upperValue(payload.currency),
  })
}

export function buildUpdateShopStatusPayload(payload = {}) {
  return cleanObject({ status: upperValue(payload.status) })
}

export function mapShopResponse(shop = {}) {
  return {
    id: shop.id,
    name: shop.name || '',
    currency: shop.currency || '',
    status: shop.status || 'UNKNOWN',
    updatedAt: shop.updatedAt || shop.createdAt || null,
    raw: shop,
  }
}

export function mapShopsResponse(response = {}) {
  return {
    items: (response.items || []).map(mapShopResponse),
    pagination: normalizePagination(response.pagination),
  }
}
