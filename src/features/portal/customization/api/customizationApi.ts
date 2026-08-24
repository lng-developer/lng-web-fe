import { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'

const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export type CustomizationStatus = 'PENDING' | 'NEEDS_REVIEW' | 'FAILED' | 'PARSED'
export type CustomizationRow = {
  id: string
  status: CustomizationStatus
  source: string
  errorCode: string | null
  errorMessage: string | null
  retryCount: number
  createdAt: string
  order: { externalOrderId: string | null }
  item: { externalItemId: string | null; sku: string | null; title: string | null }
  customer: { name: string | null; email: string | null }
  shop: { name: string | null }
  inputs: {
    texts?: Array<{ label?: string; value?: string }>
    options?: Array<{ label?: string; value?: string }>
    images?: Array<{ label?: string; value?: string }>
  } | null
  assets: {
    total: number
    downloaded: number
    failed: number
    extracted: number
    zipInspectionStatus: string | null
  }
}
export type CustomizationParams = {
  page?: number
  limit?: number
  q?: string
  status?: CustomizationStatus
  source?: string
  errorCode?: string
  blockedOnly?: boolean
  dateFrom?: string
  dateTo?: string
}
export type CustomizationPage = {
  items: CustomizationRow[]
  pagination: { total: number; page: number; limit: number }
}
export type CustomizationSummary = {
  pending: number
  needsReview: number
  failed: number
  oldestBlockedAt: string | null
}

const clean = (params: CustomizationParams) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  )

export async function listCustomizations(params: CustomizationParams) {
  return unwrap<CustomizationPage>(
    await apiClient.get('/api/customizations', {
      params: clean({ ...params, q: params.q?.trim() }),
    }),
  )
}
export async function getCustomizationSummary(params: CustomizationParams) {
  return unwrap<CustomizationSummary>(
    await apiClient.get('/api/customizations/summary', { params: clean(params) }),
  )
}
export async function retryCustomization(id: string) {
  return unwrap(await apiClient.post(`/api/customizations/${id}/retry`))
}
export async function confirmCustomization(id: string) {
  return unwrap(await apiClient.patch(`/api/customizations/${id}/parsed`, {}))
}
export async function failCustomization(id: string, errorMessage: string) {
  return unwrap(
    await apiClient.patch(`/api/customizations/${id}/failed`, {
      errorCode: 'MANUAL_REVIEW_FAILED',
      errorMessage,
    }),
  )
}
