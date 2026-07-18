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

function display(value, fallback = '-') {
  return value === undefined || value === null || value === '' ? fallback : String(value)
}

export function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

export function buildVendorSubmissionListQuery(query = {}) {
  return cleanQuery({
    id: query.id,
    externalOrderId: query.externalOrderId,
    vendorExternalOrderId: query.vendorExternalOrderId,
    status: query.status && query.status !== 'ALL' ? upperValue(query.status) : undefined,
    shopId: query.shopId,
    vendorId: query.vendorId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    page: query.page,
    limit: query.limit,
  })
}

export function buildCreateVendorSubmissionQuery(query = {}) {
  return cleanQuery({
    shopId: query.shopId,
    limit: query.limit,
  })
}

export function buildSubmitToVendorPayload(payload = {}) {
  return cleanObject({
    provider: upperValue(payload.provider),
    dryRun: payload.dryRun,
  })
}

export function buildMarkFailedVendorSubmissionPayload(payload = {}) {
  return cleanObject({ failureReason: trimValue(payload.failureReason) })
}

export function buildCancelVendorSubmissionPayload(payload = {}) {
  return cleanObject({ cancelReason: trimValue(payload.cancelReason) })
}

export function buildRetryVendorSubmissionPayload(payload = {}) {
  return cleanObject({ reason: trimValue(payload.reason) })
}

export function mapVendorSubmissionResponse(submission = {}) {
  return {
    id: submission.id,
    productionTaskId: submission.productionTaskId || null,
    orderId: display(submission.externalOrderId || submission.orderId),
    status: submission.status || 'UNKNOWN',
    vendor: display(submission.vendorName),
    vendorProduct: display(submission.vendorProductName),
    costCenter: display(submission.costCenterCode),
    provider: display(submission.provider),
    vendorOrderId: display(submission.vendorExternalOrderId),
    updatedAt: submission.updatedAt || submission.createdAt || null,
    raw: submission,
  }
}

export function mapVendorSubmissionDetail(submission = {}) {
  return {
    ...mapVendorSubmissionResponse(submission),
    payloadSnapshot: submission.payloadSnapshot || {},
    submittedResponse: submission.submittedResponse || null,
    statusHistory: submission.statusHistory || [],
  }
}

export function mapVendorSubmissionsResponse(response = {}) {
  return {
    items: (response.items || []).map(mapVendorSubmissionResponse),
    pagination: normalizePagination(response.pagination),
  }
}
