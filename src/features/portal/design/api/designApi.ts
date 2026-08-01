import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }
export type DesignAsset = {
  id: string
  originalFilename: string | null
  mimeType: string | null
  size: number | null
  downloadUrl: string | null
}
export type DesignSubmission = {
  id: string
  version: number
  status: string
  assets: DesignAsset[]
  submittedAt: string | null
  note: string | null
  rejectReason: string | null
  approvedAssetId: string | null
}
export type DesignTask = {
  id: string
  taskType: string
  status: string
  priority: string
  listing: { sku: string | null; title: string | null; psdStatus: string | null } | null
  internalTemplate: { code: string | null; name: string | null } | null
  targetListingId: string | null
  assignedDesignerId: string | null
  assignedDesigner: { id: string; fullName: string | null } | null
  shop: { id: string; name: string | null } | null
  brief: string | null
  expectedOutputs: string[]
  referenceAssetCount: number
  latestSubmission: DesignSubmission | null
  submissions?: DesignSubmission[]
  rejectReason?: string | null
  createdAt: string
  updatedAt: string
}
export type DesignListParams = {
  page: number
  limit: number
  search?: string
  status?: string
  taskType?: string
  priority?: string
}
export type DesignAssignee = { id: string; fullName?: string | null; name?: string | null }
export type DesignSummary = {
  total: number
  unassigned: number
  active: number
  byStatus: Record<string, number>
  byTaskType: Record<string, number>
}
export type PsdCandidate = {
  id: string
  sku: string
  title: string
  shop?: { id: string; name: string } | null
}
export type PsdCandidateParams = {
  page: number
  limit: number
  search?: string
  shopId?: string
  salesChannelCode?: string
  marketplaceCode?: string
  productTypeGroupId?: string
}
export type BulkPsdTaskResult = {
  checked: number
  created: number
  existing: number
  skipped: number
  items: Array<{ listingId: string; status: string; message?: string }>
}
export type CreateDesignTaskInput = {
  listingId: string
  taskType: 'PSD_TEMPLATE' | 'MOCKUP' | 'PNG_ASSET' | 'IDEA' | 'CLONE'
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  brief?: string
  note?: string
  referenceAssetIds?: string[]
  expectedOutputs?: Array<'PSD_TEMPLATE' | 'MOCKUP' | 'PNG_ASSET' | 'IDEA'>
  sourceListingId?: string
  sourceInternalTemplateId?: string
}
const compact = (params: object) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null))
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export const listDesignTasks = async (params: DesignListParams) =>
  unwrap<{ items: DesignTask[]; pagination: { total: number; page: number; limit: number } }>(
    await apiClient.get('/api/design/tasks', { params: compact(params) }),
  )
export const getDesignTask = async (id: string) =>
  unwrap<DesignTask>(await apiClient.get(`/api/design/tasks/${id}`))
export const listDesignAssignees = async () =>
  unwrap<{ items: DesignAssignee[] }>(await apiClient.get('/api/design/assignees', { params: {} }))
    .items
export const assignDesignTask = async (id: string, assignedDesignerId: string) =>
  unwrap<DesignTask>(
    await apiClient.patch(`/api/design/tasks/${id}/assign`, { assignedDesignerId }),
  )
export const startDesignTask = async (id: string) =>
  unwrap<DesignTask>(await apiClient.patch(`/api/design/tasks/${id}/start`, {}))
export const uploadDesignAsset = async (file: File) => {
  const body = new FormData()
  body.append('file', file)
  return unwrap<DesignAsset>(await apiClient.post('/api/design/assets', body))
}
export const submitDesignTask = async (id: string, submittedAssetIds: string[], note?: string) =>
  unwrap<DesignTask>(
    await apiClient.patch(`/api/design/tasks/${id}/submit`, { submittedAssetIds, note }),
  )
export const approveDesignTask = async (id: string, approvedAssetId: string) =>
  unwrap<DesignTask>(await apiClient.patch(`/api/design/tasks/${id}/approve`, { approvedAssetId }))
export const rejectDesignTask = async (id: string, rejectReason: string) =>
  unwrap<DesignTask>(await apiClient.patch(`/api/design/tasks/${id}/reject`, { rejectReason }))
export const getDesignSummary = async (params: Omit<DesignListParams, 'page' | 'limit'>) =>
  unwrap<DesignSummary>(
    await apiClient.get('/api/design/tasks/summary', { params: compact(params) }),
  )
export const getDesignWorkload = async (params: Omit<DesignListParams, 'page' | 'limit'>) =>
  unwrap<{
    totals: { unassignedCount: number; activeCount: number }
    byDesigner: Array<{ assignedDesignerId: string; totalActive: number }>
  }>(await apiClient.get('/api/design/tasks/workload', { params: compact(params) }))
export const listPsdCandidates = async (params: PsdCandidateParams) =>
  unwrap<{ items: PsdCandidate[]; pagination: { total: number; page: number; limit: number } }>(
    await apiClient.get('/api/design/tasks/psd-template/candidates', { params: compact(params) }),
  )
export const createPsdTaskFromListing = async (listingId: string, note?: string) =>
  unwrap<DesignTask>(
    await apiClient.post(`/api/design/tasks/from-listings/${listingId}/psd-template`, {
      ...(note ? { note } : {}),
    }),
  )
export const createDesignTask = async (input: CreateDesignTaskInput) =>
  unwrap<DesignTask>(await apiClient.post('/api/design/tasks', input))
export const bulkCreatePsdTasks = async (input: { listingIds: string[]; note?: string }) =>
  unwrap<BulkPsdTaskResult>(
    await apiClient.post('/api/design/tasks/bulk-create-psd-from-listings', input),
  )
export const listDesignSubmissions = async (taskId: string) =>
  unwrap<{ items: DesignSubmission[] }>(
    await apiClient.get(`/api/design/tasks/${taskId}/submissions`),
  ).items
export const cancelDesignTask = async (taskId: string, cancelReason: string) =>
  unwrap<DesignTask>(await apiClient.patch(`/api/design/tasks/${taskId}/cancel`, { cancelReason }))
