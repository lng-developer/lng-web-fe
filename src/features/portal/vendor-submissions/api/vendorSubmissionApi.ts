import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }
export type VendorSubmissionStatus =
  | 'READY'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'FAILED'
  | 'NEEDS_REVIEW'
  | 'CANCELLED'
export type VendorSubmission = {
  id: string
  productionTaskId: string
  shopId: string
  status: VendorSubmissionStatus
  provider: string | null
  externalOrderId: string | null
  vendorExternalOrderId: string | null
  listingTitle: string | null
  sku: string | null
  vendorName: string | null
  vendorProductName: string | null
  costCenterCode: string | null
  submitClaimedAt: string | null
  submitAttemptCount: number
  submittedAt: string | null
  failedAt: string | null
  failureReason: string | null
  statusHistory?: Array<{
    status: VendorSubmissionStatus
    reason: string | null
    at: string | null
  }>
}
export type VendorSubmissionList = {
  items: VendorSubmission[]
  pagination: { total: number; page: number; limit: number }
}
export type VendorSubmissionParams = {
  page: number
  limit: number
  status?: VendorSubmissionStatus
  externalOrderId?: string
  dateFrom?: string
  dateTo?: string
}

const basePath = '/api/vendor-submissions'
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export async function listVendorSubmissions(params: VendorSubmissionParams) {
  return unwrap<VendorSubmissionList>(await apiClient.get(basePath, { params }))
}

export async function getVendorSubmission(id: string) {
  return unwrap<VendorSubmission>(await apiClient.get(`${basePath}/${id}`))
}

export async function submitVendorSubmission(id: string) {
  return unwrap<VendorSubmission>(
    await apiClient.post(`${basePath}/${id}/submit-to-vendor`, { dryRun: false }),
  )
}

export async function retryVendorSubmission(id: string, reason: string) {
  return unwrap<VendorSubmission>(await apiClient.post(`${basePath}/${id}/retry`, { reason }))
}

export async function reconcileVendorSubmission(
  id: string,
  input:
    | { outcome: 'REMOTE_FOUND'; vendorExternalOrderId: string; reason?: string }
    | { outcome: 'REMOTE_NOT_FOUND'; reason?: string },
) {
  return unwrap<VendorSubmission>(await apiClient.post(`${basePath}/${id}/reconcile`, input))
}
