import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }
export type ShipmentStatus =
  | 'TRACKING_PENDING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'EXCEPTION'
  | 'RETURNED'
  | 'CANCELLED'
export type Shipment = {
  id: string
  vendorSubmissionId: string
  orderId: string
  orderItemId: string
  shopId: string
  provider: string | null
  externalOrderId: string | null
  vendorExternalOrderId: string | null
  carrier: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  status: ShipmentStatus
  shippedAt: string | null
  deliveredAt: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}
export type ShipmentParams = {
  page: number
  limit: number
  status?: ShipmentStatus
  externalOrderId?: string
  trackingNumber?: string
  dateFrom?: string
  dateTo?: string
}
export type ShipmentList = {
  items: Shipment[]
  pagination: { total: number; page: number; limit: number }
}
export type ShipmentSummary = {
  total: number
  trackingPending: number
  shipped: number
  delivered: number
  exception: number
  cancelled: number
}
export type WebhookLog = {
  id: string
  provider: string
  outcome: 'SUCCESS' | 'ERROR' | 'SKIPPED'
  httpStatus: number | null
  message: string
  vendorSubmissionId: string | null
  orderItemId: string | null
  carrier: string | null
  vendorStatus: string | null
  payloadHash: string | null
  createdAt: string
}
export type ShipmentTrackingInput = {
  carrier: string
  trackingNumber: string
  trackingUrl?: string | null
  note?: string | null
}
export type ShipmentStatusInput = {
  status: Extract<ShipmentStatus, 'DELIVERED' | 'EXCEPTION' | 'RETURNED' | 'CANCELLED'>
  note?: string | null
}

const basePath = '/api/shipments'
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export const listShipments = async (params: ShipmentParams) =>
  unwrap<ShipmentList>(await apiClient.get(basePath, { params }))
export const summarizeShipments = async (params: Omit<ShipmentParams, 'page' | 'limit'>) =>
  unwrap<ShipmentSummary>(await apiClient.get(`${basePath}/summary`, { params }))
export const getShipment = async (id: string) =>
  unwrap<Shipment>(await apiClient.get(`${basePath}/${id}`))
export const listWebhookLogs = async (params: {
  page: number
  limit: number
  vendorSubmissionId?: string
}) =>
  unwrap<{ items: WebhookLog[]; pagination: ShipmentList['pagination'] }>(
    await apiClient.get(`${basePath}/vendor-webhooks/logs`, { params }),
  )
export const recheckShipment = async (id: string) =>
  unwrap<Shipment>(await apiClient.post(`${basePath}/${id}/recheck`))
export const updateShipmentTracking = async (id: string, input: ShipmentTrackingInput) =>
  unwrap<Shipment>(await apiClient.patch(`${basePath}/${id}/tracking`, input))
export const updateShipmentStatus = async (id: string, input: ShipmentStatusInput) =>
  unwrap<Shipment>(await apiClient.patch(`${basePath}/${id}/status`, input))
export const recheckVendorTracking = async (input: {
  vendorSubmissionId: string
  provider?: string
  externalOrderId?: string
  dateFrom?: string
  dateTo?: string
}) => unwrap<unknown>(await apiClient.post(`${basePath}/vendor-tracking/recheck`, input))
export const recheckSubmittedShipments = async (input: {
  provider?: string
  shopId?: string
  limit?: number
}) => unwrap<unknown>(await apiClient.post(`${basePath}/vendor-tracking/recheck-submitted`, input))
