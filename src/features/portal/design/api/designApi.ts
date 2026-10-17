import { ApiResponse } from '@/server/type'
import { apiClient, uploadApiClient } from '@/shared/api'
import { uploadMultipartAsset } from '@/shared/media'

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
export const ASIN_TYPE_OPTIONS = [
  { label: 'Custom Image', value: 'Custom Image' },
  { label: 'Outline', value: 'Outline' },
  { label: 'Normal', value: 'Normal' },
  { label: 'First Sale', value: 'First Sale' },
  { label: 'POD Lovers', value: 'POD Lovers' },
  { label: 'Style', value: 'Style' },
  { label: 'Tool', value: 'Tool' },
  { label: 'Auto Fulfill', value: 'Auto Fulfill' },
  { label: 'Other', value: 'Other' },
] as const

export type DesignTaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type DesignTask = {
  id: string
  taskType: string
  status: string
  priority: DesignTaskPriority
  listing: {
    sku: string | null
    salesChannelCode?: 'AMAZON' | 'ETSY' | string | null
    asin?: string | null
    etsyListingId?: string | null
    title: string | null
    psdStatus: string | null
    productTypeName: string | null
    productImageUrl?: string | null
    asinType?: string | null
    asin_type?: string | null
  } | null
  listingVariantId: string | null
  targetScope?: 'LISTING' | 'LISTING_VARIANT'
  orderContext?: {
    orderId: string | null
    orderItemId: string | null
    requestedByAccountId: string | null
    requestNote: string | null
  } | null
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
  title?: string | null
  description?: string | null
  referenceLink?: string | null
  productType?: string | null
  image?: string | null
  imageUrl?: string | null
  seller?: { id: string; fullName: string | null } | null
  asinType?: string | null
  asin_type?: string | null
  createdBy?: { id: string; fullName?: string | null; full_name?: string | null } | null
  createdAt: string
  updatedAt: string
}
export type DesignListParams = {
  page: number
  limit: number
  search?: string
  salesChannelCode?: 'AMAZON' | 'ETSY'
  status?: string
  taskType?: string
  priority?: DesignTaskPriority
  shopId?: string
  sellerId?: string
  dateFrom?: string
  dateTo?: string
  unassigned?: boolean
  asinType?: string
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
  listingId?: string
  taskType: 'MOCKUP' | 'PNG_ASSET' | 'IDEA' | 'CLONE' | 'PSD_TEMPLATE'
  priority?: DesignTaskPriority
  title?: string
  description?: string
  referenceLink?: string
  productType?: string
  image?: string
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
export const exportDesignTasksCsv = (params: DesignListParams) =>
  apiClient.get('/api/design/tasks/export.csv', {
    params: compact({ ...params, page: 1, limit: 5000 }),
    responseType: 'blob',
  })
export const getDesignTask = async (id: string) =>
  unwrap<DesignTask>(await apiClient.get(`/api/design/tasks/${id}`))
export const listDesignAssignees = async () =>
  unwrap<{ items: DesignAssignee[] }>(await apiClient.get('/api/design/assignees', { params: {} }))
    .items
export const assignDesignTask = async (id: string, assignedDesignerId: string) =>
  unwrap<DesignTask>(
    await apiClient.patch(`/api/design/tasks/${id}/assign`, { assignedDesignerId }),
  )
export const updateDesignTaskPriority = async (id: string, priority: DesignTaskPriority) =>
  unwrap<DesignTask>(await apiClient.patch(`/api/design/tasks/${id}/priority`, { priority }))
export const bulkAssignDesignTasks = async (taskIds: string[], assignedDesignerId: string) =>
  unwrap<{
    assigned: DesignTask[]
    failed: Array<{ taskId: string; code: string; message: string }>
  }>(await apiClient.patch('/api/design/tasks/bulk-assign', { taskIds, assignedDesignerId }))
export const startDesignTask = async (id: string) =>
  unwrap<DesignTask>(await apiClient.patch(`/api/design/tasks/${id}/start`, {}))
export const uploadDesignAsset = async (
  file: File,
  options?: { onProgress?: (percent: number) => void; signal?: AbortSignal },
): Promise<DesignAsset> => {
  const extension = file.name ? file.name.split('.').pop()?.toLowerCase() : ''
  if (extension === 'psd' || extension === 'zip') {
    const asset = await uploadMultipartAsset(file, {
      assetPurpose: 'PSD_TEMPLATE',
      onProgress: options?.onProgress,
      signal: options?.signal,
    })
    return {
      id: asset.id,
      originalFilename: file.name || null,
      mimeType: file.type || 'image/vnd.adobe.photoshop',
      size: file.size || null,
      downloadUrl: `/api/media/assets/${asset.id}/download`,
    }
  }
  const body = new FormData()
  body.append('file', file)
  return unwrap<DesignAsset>(await uploadApiClient.post('/api/design/assets', body))
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
export const updateDesignTask = async (id: string, input: Partial<CreateDesignTaskInput>) =>
  unwrap<DesignTask>(await apiClient.patch(`/api/design/tasks/${id}`, input))
export const deleteDesignTask = async (id: string) =>
  unwrap<{ success: boolean }>(await apiClient.delete(`/api/design/tasks/${id}`))
export const listDesignSubmissions = async (taskId: string) =>
  unwrap<{ items: DesignSubmission[] }>(
    await apiClient.get(`/api/design/tasks/${taskId}/submissions`),
  ).items
export const cancelDesignTask = async (taskId: string, cancelReason: string) =>
  unwrap<DesignTask>(await apiClient.patch(`/api/design/tasks/${taskId}/cancel`, { cancelReason }))

export type DesignScoreLevel = 'STANDARD' | 'HARD'
export type DesignScoreStatus = 'ACTIVE' | 'VOIDED'
export type DesignSubmissionScore = {
  id: string
  taskId: string
  submissionId: string
  assetId: string
  designerId: string
  designerName: string | null
  designerTeam: string | null
  designerDepartment: string | null
  shopId: string | null
  shopName: string | null
  taskType: string
  priority: DesignTaskPriority
  basePoints: number
  finalPoints: number
  scoreLevel: DesignScoreLevel
  status: DesignScoreStatus
  scoredAt: string | null
  approvedAsset: { id: string; originalFilename: string | null; downloadUrl: string | null } | null
  overrideReason: string | null
  voidReason: string | null
  version: number
}
export type DesignScoreListParams = {
  page: number
  limit: number
  search?: string
  designerId?: string
  scoreLevel?: DesignScoreLevel
  scoreStatus?: DesignScoreStatus | 'ALL'
  dateFrom?: string
  dateTo?: string
  sortBy?: 'scoredAt' | 'finalPoints' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}
export type DesignScoreSummary = {
  total: number
  totalPoints: number
  totalFiles: number
  byTaskType: Array<{ _id: string | null; totalPoints: number; totalFiles: number }>
  byDesigner: Array<{
    _id: string
    designerName: string | null
    totalPoints: number
    totalFiles: number
  }>
}

export const listDesignScores = async (params: DesignScoreListParams) =>
  unwrap<{ items: DesignSubmissionScore[]; total: number; page: number; limit: number }>(
    await apiClient.get('/api/design/submission-scores', { params: compact(params) }),
  )
export const getDesignScoreSummary = async (
  params: Omit<DesignScoreListParams, 'page' | 'limit' | 'sortBy' | 'sortOrder'>,
) =>
  unwrap<DesignScoreSummary>(
    await apiClient.get('/api/design/score-summary', { params: compact(params) }),
  )
export const overrideDesignScore = async (
  scoreId: string,
  input: { points: number; scoreLevel?: DesignScoreLevel; overrideReason: string },
) =>
  unwrap<DesignSubmissionScore>(
    await apiClient.patch(`/api/design/submission-scores/${scoreId}/override`, input),
  )
export const voidDesignScore = async (
  taskId: string,
  submissionId: string,
  assetId: string,
  voidReason: string,
) =>
  unwrap<DesignSubmissionScore>(
    await apiClient.patch(
      `/api/design/tasks/${taskId}/submissions/${submissionId}/assets/${assetId}/score/void`,
      { voidReason },
    ),
  )
