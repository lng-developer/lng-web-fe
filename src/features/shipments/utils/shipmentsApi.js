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

export function buildShipmentListQuery(query = {}) {
  return cleanQuery({
    id: query.id,
    externalOrderId: query.externalOrderId,
    vendorExternalOrderId: query.vendorExternalOrderId,
    trackingNumber: query.trackingNumber,
    status: query.status && query.status !== 'ALL' ? upperValue(query.status) : undefined,
    carrier: query.carrier,
    shopId: query.shopId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    page: query.page,
    limit: query.limit,
  })
}

export function buildWebhookLogQuery(query = {}) {
  return cleanQuery({
    provider: query.provider ? upperValue(query.provider) : undefined,
    outcome: query.outcome ? upperValue(query.outcome) : undefined,
    vendorSubmissionId: query.vendorSubmissionId,
    orderItemId: query.orderItemId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    page: query.page,
    limit: query.limit,
  })
}

export function buildUpdateShipmentTrackingPayload(payload = {}) {
  return cleanObject({
    carrier: trimValue(payload.carrier),
    trackingNumber: trimValue(payload.trackingNumber),
    trackingUrl: trimValue(payload.trackingUrl),
    note: trimValue(payload.note),
  })
}

export function buildUpdateShipmentStatusPayload(payload = {}) {
  return cleanObject({
    status: upperValue(payload.status),
    note: trimValue(payload.note),
  })
}

export function buildVendorTrackingRecheckPayload(payload = {}) {
  return cleanObject({
    provider: upperValue(payload.provider),
    externalOrderId: trimValue(payload.externalOrderId),
    vendorSubmissionId: trimValue(payload.vendorSubmissionId),
    dateFrom: trimValue(payload.dateFrom),
    dateTo: trimValue(payload.dateTo),
  })
}

export function buildSubmittedTrackingRecheckPayload(payload = {}) {
  return cleanObject({
    provider: upperValue(payload.provider),
    shopId: trimValue(payload.shopId),
    limit: payload.limit
      ? Math.min(Math.max(Number(payload.limit) || DEFAULT_LIMIT, 1), 100)
      : undefined,
  })
}

export function mapShipmentResponse(shipment = {}) {
  return {
    id: shipment.id,
    orderId: display(shipment.externalOrderId || shipment.orderId),
    vendorOrderId: display(shipment.vendorExternalOrderId),
    status: shipment.status || 'UNKNOWN',
    provider: display(shipment.provider),
    carrier: display(shipment.carrier),
    trackingNumber: display(shipment.trackingNumber),
    trackingUrl: shipment.trackingUrl || null,
    updatedAt: shipment.updatedAt || shipment.createdAt || null,
    raw: shipment,
  }
}

export function mapWebhookLogResponse(log = {}) {
  return {
    id: log.id,
    provider: display(log.provider),
    outcome: display(log.outcome),
    trackingNumber: display(log.trackingNumber),
    carrier: display(log.carrier),
    message: display(log.message),
    createdAt: log.createdAt || null,
    raw: log,
  }
}

export function mapShipmentsResponse(response = {}) {
  return {
    items: (response.items || []).map(mapShipmentResponse),
    pagination: normalizePagination(response.pagination),
  }
}

export function mapWebhookLogsResponse(response = {}) {
  return {
    items: (response.items || []).map(mapWebhookLogResponse),
    pagination: normalizePagination(response.pagination),
  }
}
