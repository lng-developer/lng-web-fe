import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }

const unwrap = <T>(response: ApiResponse<T>) => response.data
const compact = <T extends Record<string, unknown>>(params: T) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  )

export type CustomerLifecycle = 'NEW' | 'RETURNING' | 'VIP' | 'AT_RISK' | 'ISSUE_PRONE'
export type CustomerCareStatus = 'NONE' | 'NEEDS_FOLLOW_UP' | 'IN_PROGRESS' | 'RESOLVED'

export type CustomerListParams = {
  page: number
  limit: number
  search?: string
  lifecycle?: CustomerLifecycle
  careStatus?: CustomerCareStatus
  sort?: string
}

export type Customer = {
  id: string
  name: string | null
  emailMasked: string | null
  phoneMasked: string | null
  lifecycle: CustomerLifecycle
  careStatus: CustomerCareStatus
  orderCount: number
  totalRevenueAmount: number
  averageOrderValue: number
  currency: string
  firstOrderAt: string | null
  lastOrderAt: string | null
  countries: string[]
  shops: Array<{ shopId: string | null; name: string | null }>
  riskFlags: Array<{ code: string; count: number; lastSeenAt: string | null }>
  latestEvents?: CustomerEvent[]
  latestNotes?: CustomerNote[]
}

export type CustomerEvent = {
  id: string
  eventType: string
  message: string | null
  occurredAt: string | null
  metadata?: Record<string, unknown>
}

export type CustomerNote = {
  id: string
  body: string
  type: string
  createdBy: string | null
  createdAt: string | null
}

export type CustomerSummary = {
  total: number
  newCount: number
  returningCount: number
  vipCount: number
  atRiskCount: number
  issueProneCount: number
  needsFollowUpCount: number
  totalRevenueAmount: number
  averageOrderValue: number
}

export type CustomerListResponse = {
  items: Customer[]
  page: number
  limit: number
  total: number
}

export async function listCustomers(params: CustomerListParams) {
  return unwrap<CustomerListResponse>(
    await apiClient.get('/api/customers', { params: compact(params) }),
  )
}

export async function getCustomerSummary(params: Partial<CustomerListParams> = {}) {
  return unwrap<CustomerSummary>(
    await apiClient.get('/api/customers/summary', { params: compact(params) }),
  )
}

export async function getCustomer(customerId: string) {
  return unwrap<Customer>(await apiClient.get(`/api/customers/${customerId}`))
}

export async function getCustomerTimeline(customerId: string) {
  return unwrap<{ events: CustomerEvent[]; notes: CustomerNote[] }>(
    await apiClient.get(`/api/customers/${customerId}/timeline`, { params: { limit: 40 } }),
  )
}

export async function updateCustomerCareStatus(
  customerId: string,
  careStatus: CustomerCareStatus,
  note?: string,
) {
  return unwrap<Customer>(
    await apiClient.patch(`/api/customers/${customerId}/care-status`, { careStatus, note }),
  )
}

export async function addCustomerNote(customerId: string, body: string) {
  const data = unwrap<{ note: CustomerNote }>(
    await apiClient.post(`/api/customers/${customerId}/notes`, { body }),
  )
  return data.note
}
