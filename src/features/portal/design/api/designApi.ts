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
  listing: {
    sku: string | null
    asin?: string | null
    title: string | null
    psdStatus: string | null
    productTypeName: string | null
    productImageUrl?: string | null
  } | null
  listingVariantId: string | null
  internalTemplate: { code: string | null; name: string | null } | null
  targetListingId: string | null
  assignedDesignerId: string | null
  assignedDesigner: {
    id: string
    fullName: string | null
    avatarUrl?: string | null
  } | null
  shop: { id: string; name: string | null } | null
  brief: string | null
  expectedOutputs: string[]
  referenceAssetCount: number
  latestSubmission: DesignSubmission | null
  thumbnailAsset?: DesignAsset | null
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
export type DesignAssignee = {
  id: string
  fullName?: string | null
  name?: string | null
  avatarUrl?: string | null
}
export type PsdFileListParams = {
  page: number
  limit: number
  search?: string
  role?: 'REFERENCE' | 'SUBMISSION' | 'APPROVED'
  designerId?: string
  taskStatus?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'createdAt' | 'submittedAt'
  sortOrder?: 'asc' | 'desc'
}
export type PsdFileListItem = {
  rowKey: string
  linkedAt: string | null
  role: string
  asset: (DesignAsset & { createdAt?: string | null }) | null
  task: { id: string; taskType: string; status: string }
  listing: { id: string; code: string | null; title: string | null }
  designer: { id: string | null; name: string | null }
  submission: { id: string | null; version: number | null; submittedAt: string | null }
}
export type DesignSummary = {
  total: number
  unassigned: number
  active: number
  byStatus: Record<string, number>
  byTaskType: Record<string, number>
}
export type CreateDesignTaskInput = {
  listingId: string
  taskType: 'MOCKUP' | 'PNG_ASSET' | 'IDEA' | 'CLONE'
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
export const bulkAssignDesignTasks = async (taskIds: string[], assignedDesignerId: string) =>
  unwrap<{
    assigned: DesignTask[]
    failed: Array<{ taskId: string; code: string; message: string }>
  }>(await apiClient.patch('/api/design/tasks/bulk-assign', { taskIds, assignedDesignerId }))
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
export const listPsdFiles = async (params: PsdFileListParams) =>
  unwrap<{ items: PsdFileListItem[]; total: number; page: number; limit: number }>(
    await apiClient.get('/api/design/psd-files', { params: compact(params) }),
  )
export const createDesignTask = async (input: CreateDesignTaskInput) =>
  unwrap<DesignTask>(await apiClient.post('/api/design/tasks', input))
export const listDesignSubmissions = async (taskId: string) =>
  unwrap<{ items: DesignSubmission[] }>(
    await apiClient.get(`/api/design/tasks/${taskId}/submissions`),
  ).items
export const cancelDesignTask = async (taskId: string, cancelReason: string) =>
  unwrap<DesignTask>(await apiClient.patch(`/api/design/tasks/${taskId}/cancel`, { cancelReason }))
