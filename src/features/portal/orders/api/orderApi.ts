import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }
export type OrderWorkbenchParams = {
  page: number
  limit: number
  tab?: string
  search?: string
  shopId?: string
  employeeCode?: string
  addressValidationStatus?: string
  salesChannelCode?: string
  dateFrom?: string
  dateTo?: string
}
export type OrderWorkflow = {
  stage: string
  owner: string
  blockers: Array<{ code: string }>
  nextActions: string[]
}
export type ShippingAddress = {
  name?: string | null
  company?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  addressLine3?: string | null
  addressType?: string | null
  city?: string | null
  stateOrProvince?: string | null
  stateOrProvinceCode?: string | null
  postalCode?: string | null
  country?: string | null
  countryCode?: string | null
  phoneMasked?: string | null
}
export type ShippingService = { name?: string | null; level?: string | null }
export type OrderBuyer = {
  name?: string | null
  emailMasked?: string | null
  phoneMasked?: string | null
  externalBuyerId?: string | null
}
export type OrderTimelineEvent = {
  id: string
  orderId: string
  orderItemId: string | null
  eventType: string
  message: string | null
  fromStatus: string | null
  toStatus: string | null
  source: string | null
  actor: { displayName: string | null; employeeCode: string | null } | null
  createdAt: string | null
}
export type OrderCase = {
  id: string
  orderId: string
  orderItemId: string | null
  caseType: 'REFUND' | 'RETURN' | 'REPLACEMENT' | 'ADDRESS' | 'CUSTOMIZATION' | 'SHIPMENT' | 'OTHER'
  status: 'OPEN' | 'RESOLVED' | 'CANCELLED'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string | null
  resolutionNote?: string | null
  cancelReason?: string | null
  comments?: Array<{ body: string | null; createdBy: string | null; createdAt: string | null }>
}
export type OrderCaseInput = Pick<OrderCase, 'caseType' | 'severity' | 'title'> & {
  orderId: string
  orderItemId?: string
  description?: string
}
export type OrderWorkbenchItem = {
  item: {
    id: string
    sku: string | null
    asin: string | null
    title: string | null
    quantity: number
    status: string | null
    csNote: string | null
  }
  seller: { employeeCode: string | null; name: string | null } | null
  listing: {
    title: string | null
  } | null
  customization: {
    status: string | null
    needsReview: boolean
    customizationUrl?: string | null
    sourceCustomizationUrl?: string | null
    downloadedZip?: { status?: string | null; sourceUrlRedacted?: string | null } | null
    previewImageUrl?: string | null
    extractedImages?: Array<{ secureUrl: string | null; filename: string | null }>
    inputs: Array<{
      type: string
      label: string | null
      value?: string | null
      secureUrl?: string | null
    }>
  } | null
  mapping: {
    status: string | null
    listingVariant?: {
      id: string
      productTypeGroup?: { id?: string | null; code?: string | null; name?: string | null } | null
      internalTemplate?: { id?: string | null; code?: string | null; name?: string | null } | null
      psdReadiness?: { status?: string | null } | null
      psdTemplate?: { downloadUrl?: string | null } | null
    } | null
    vendor?: { id?: string | null; name: string | null } | null
    vendorProduct?: { id?: string | null; name: string | null } | null
    vendorCostCenter?: {
      id?: string | null
      code: string | null
      size: string | null
      color: string | null
    } | null
  } | null
  pricing: { customerPaidAmount: number; baseCostAmount: number | null; currency: string | null }
  production: { status: string | null; scaleStatus: string | null; qcStatus: string | null } | null
  tracking: { trackingNumber?: string | null; status?: string | null } | null
  workflow: OrderWorkflow
}
export type OrderWorkbenchRow = {
  order: {
    id: string
    externalOrderId: string
    createdAt: string | null
    orderedAt: string | null
    status: string | null
    buyer: OrderBuyer
    shop: { id: string; name: string | null } | null
    shippingService: ShippingService
    shippingAddress: ShippingAddress
    addressValidationStatus: string | null
    pricing: { customerPaidAmount: number; baseCostAmount: number | null; currency: string | null }
    handlingLabel: string | null
    caseStatus: string | null
    assignedStaffIds: string[]
  }
  items: OrderWorkbenchItem[]
}
export type OrderWorkbenchResult = {
  items: OrderWorkbenchRow[]
  pagination: { total: number; page: number; limit: number }
}
export type OrderSummary = { tabCounts: Record<string, number> }

const compact = (params: OrderWorkbenchParams) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null))
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export async function listOrderWorkbench(params: OrderWorkbenchParams) {
  return unwrap<OrderWorkbenchResult>(
    await apiClient.get('/api/orders/workbench', { params: compact(params) }),
  )
}

export async function getOrderSummary(params: OrderWorkbenchParams) {
  return unwrap<OrderSummary>(
    await apiClient.get('/api/orders/summary', { params: compact(params) }),
  )
}

export async function updateShippingAddress(orderId: string, input: ShippingAddress) {
  return unwrap(await apiClient.patch(`/api/orders/${orderId}/shipping-address`, input))
}

export async function updateOrderBuyer(orderId: string, input: OrderBuyer) {
  return unwrap(await apiClient.patch(`/api/orders/${orderId}/buyer`, input))
}

const timelineParams = { page: 1, limit: 50 }

export async function listOrderTimeline(orderId: string) {
  return unwrap<{
    items: OrderTimelineEvent[]
    pagination: { total: number; page: number; limit: number }
  }>(await apiClient.get(`/api/orders/${orderId}/timeline`, { params: timelineParams }))
}

export async function listOrderItemTimeline(orderItemId: string) {
  return unwrap<{
    items: OrderTimelineEvent[]
    pagination: { total: number; page: number; limit: number }
  }>(await apiClient.get(`/api/orders/items/${orderItemId}/timeline`, { params: timelineParams }))
}

export async function updateShippingService(orderId: string, input: ShippingService) {
  return unwrap(await apiClient.patch(`/api/orders/${orderId}/shipping-service`, input))
}

export async function validateShippingAddress(orderId: string) {
  return unwrap(await apiClient.post(`/api/orders/${orderId}/validate-address`))
}

export async function updateOrderItemCsNote(orderItemId: string, csNote: string) {
  return unwrap(await apiClient.patch(`/api/orders/items/${orderItemId}/cs-note`, { csNote }))
}

export async function recheckOrderItem(orderItemId: string) {
  return unwrap(await apiClient.post(`/api/orders/items/${orderItemId}/recheck`))
}

export async function retryCustomizationAssets(orderItemId: string) {
  await unwrap(
    await apiClient.post(`/api/customizations/order-items/${orderItemId}/download-assets`, {
      retryFailed: true,
    }),
  )
  await unwrap(
    await apiClient.post(`/api/customizations/order-items/${orderItemId}/inspect-zip`, {}),
  )
  return unwrap(
    await apiClient.post(`/api/customizations/order-items/${orderItemId}/extract-zip-images`, {}),
  )
}

export async function markOrderItemFulfillmentReady(orderItemId: string) {
  return unwrap(await apiClient.post(`/api/orders/items/${orderItemId}/mark-fulfillment-ready`))
}

export async function cancelOrderItem(orderItemId: string, reason: string) {
  return unwrap(await apiClient.post(`/api/orders/items/${orderItemId}/cancel`, { reason }))
}

export async function createOrderItemReplacement(
  orderItemId: string,
  input: { reason?: string; quantity?: number },
) {
  return unwrap(await apiClient.post(`/api/orders/items/${orderItemId}/replacement`, input))
}

export async function createOrderReplacement(
  orderId: string,
  input: { reason?: string; items: Array<{ orderItemId: string; quantity: number }> },
) {
  return unwrap(await apiClient.post(`/api/orders/${orderId}/replacement`, input))
}

export async function listOrderCases(orderId: string) {
  return unwrap<{ items: OrderCase[]; pagination: { total: number; page: number; limit: number } }>(
    await apiClient.get('/api/orders/cases', { params: { orderId, page: 1, limit: 10 } }),
  )
}

export async function getOrderCase(caseId: string) {
  return unwrap<OrderCase>(await apiClient.get(`/api/orders/cases/${caseId}`))
}

export async function addOrderCaseComment(caseId: string, body: string) {
  return unwrap<OrderCase>(await apiClient.post(`/api/orders/cases/${caseId}/comments`, { body }))
}

export async function createOrderCase(input: OrderCaseInput) {
  return unwrap<OrderCase>(await apiClient.post('/api/orders/cases', input))
}

export async function updateOrderCase(
  caseId: string,
  input: Partial<Pick<OrderCase, 'caseType' | 'severity' | 'title' | 'description'>>,
) {
  return unwrap<OrderCase>(await apiClient.patch(`/api/orders/cases/${caseId}`, input))
}

export async function resolveOrderCase(caseId: string, resolutionNote: string) {
  return unwrap<OrderCase>(
    await apiClient.post(`/api/orders/cases/${caseId}/resolve`, { resolutionNote }),
  )
}

export async function cancelOrderCase(caseId: string, cancelReason: string) {
  return unwrap<OrderCase>(
    await apiClient.post(`/api/orders/cases/${caseId}/cancel`, { cancelReason }),
  )
}
