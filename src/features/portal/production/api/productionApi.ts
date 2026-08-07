import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export type ProductionStatus =
  | 'BLOCKED'
  | 'NEED_SCALE'
  | 'QC_PENDING'
  | 'QC_REJECTED'
  | 'READY_TO_SEND_VENDOR'
  | 'SENT_TO_VENDOR'
  | 'CANCELLED'
export type QcStatus = 'NOT_READY' | 'PENDING' | 'PASSED' | 'REJECTED'
export type CsStatus = 'UNASSIGNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE'
export type FileCheck = {
  id: string
  slotKey: string
  slotLabel: string | null
  sourceType?: string | null
  required: boolean
  outputRequired?: boolean
  inputAssetDownloadUrl: string | null
  inputImageName?: string | null
  outputAssetDownloadUrl: string | null
  outputStatus: string
  qcStatus: QcStatus
  note: string | null
}
export type ProductionUser = { id: string; fullName: string | null; employeeCode: string | null }
export type ProductionScaleContext = {
  use?: {
    psdTemplate?: { assetDownloadUrl?: string | null; status?: string | null }
    listing?: { psdStatus?: string | null; previewAssetDownloadUrl?: string | null }
  }
}
export type ProductionCustomization = {
  customerInputs?: Record<string, unknown> | null
}
export type ProductionTask = {
  id: string
  status: ProductionStatus
  productionStatus?: ProductionStatus
  qcStatus: QcStatus
  blockers: string[]
  assignedDesignUserId: string | null
  assignedDesigner?: ProductionUser
  csAssigneeId?: string | null
  csStatus?: CsStatus
  csNote?: string | null
  designNote: string | null
  productImageUrl?: string | null
  readyAt: string | null
  updatedAt: string
  orderItem?: {
    externalOrderId?: string | null
    asin?: string | null
    sku?: string | null
    title?: string | null
  }
  order?: { id?: string | null }
  shop?: { id?: string | null; name?: string | null }
  shopId?: string | null
  shopName?: string | null
  createdAt?: string
  fileChecks?: FileCheck[]
  qcPreviewFileChecks?: FileCheck[]
  vendorSubmission?: { id: string; status: string; failureReason?: string | null }
  scaleContext?: ProductionScaleContext
  customization?: ProductionCustomization | null
  vendorProduct?: {
    id?: string | null
    code?: string | null
    name?: string | null
    vendor?: string | { name?: string | null } | null
  } | null
  vendorCostCenter?: {
    id?: string | null
    code?: string | null
    name?: string | null
    standardSize?: string | null
    standardColor?: string | null
  } | null
  fulfillQty?: number | null
}
export type ProductionList = { items: ProductionTask[]; total: number; page: number; limit: number }
export type ProductionSummary = Record<string, number>
export type ProductionParams = {
  page: number
  limit: number
  view?: 'SCALE' | 'QC'
  search?: string
  status?: ProductionStatus
  qcStatus?: QcStatus
}
export type FileDecision = { fileCheckId: string; decision: 'PASSED' | 'REJECTED'; note?: string }
export type ManualScaledOutput = {
  file: File
  slotKey: string
  slotLabel?: string
}
export type ProductionAssignee = {
  id: string
  fullName: string | null
  employeeCode: string | null
}

const basePath = '/api/production'

export const listProductionTasks = async (params: ProductionParams) => {
  const result = unwrap<ProductionList>(await apiClient.get(`${basePath}/tasks`, { params }))
  return {
    ...result,
    items: result.items.map((task) => ({
      ...task,
      status: task.status ?? task.productionStatus!,
      shop: task.shop ?? (task.shopName ? { id: task.shopId, name: task.shopName } : undefined),
      updatedAt: task.updatedAt ?? task.createdAt!,
      qcPreviewFileChecks: task.qcPreviewFileChecks?.map((check) => ({
        ...check,
        required: check.required ?? Boolean(check.outputRequired),
      })),
    })),
  }
}
export const summarizeProductionTasks = async (
  params: Omit<ProductionParams, 'page' | 'limit'>,
) => {
  const result = unwrap<ProductionSummary>(
    await apiClient.get(`${basePath}/tasks/summary`, { params }),
  )
  return { ...result, ready: result.ready ?? result.readyToSendVendor ?? 0 } as ProductionSummary
}
export const getProductionTask = async (id: string) =>
  unwrap<ProductionTask>(await apiClient.get(`${basePath}/tasks/${id}`))
export const claimProductionTask = async (id: string) =>
  unwrap<ProductionTask>(await apiClient.patch(`${basePath}/tasks/${id}/claim`))
export const listScaleAssignees = async (params: { search?: string; limit?: number } = {}) =>
  unwrap<{ items: ProductionAssignee[] }>(
    await apiClient.get(`${basePath}/tasks/scale-assignees`, { params }),
  )
export const listCsAssignees = async (params: { search?: string; limit?: number } = {}) =>
  unwrap<{ items: ProductionAssignee[] }>(
    await apiClient.get(`${basePath}/tasks/cs-assignees`, { params }),
  )
export const assignProductionTask = async (
  id: string,
  assignedDesignUserId: string,
  designNote?: string,
) =>
  unwrap<ProductionTask>(
    await apiClient.patch(`${basePath}/tasks/${id}/assign`, { assignedDesignUserId, designNote }),
  )
export const assignCsTask = async (id: string, csAssigneeId: string | null, csNote?: string) =>
  unwrap<ProductionTask>(
    await apiClient.patch(`${basePath}/tasks/${id}/assign-cs`, { csAssigneeId, csNote }),
  )
export const updateProductionCsNote = async (id: string, csNote: string) =>
  unwrap<ProductionTask>(await apiClient.patch(`${basePath}/tasks/${id}/cs-note`, { csNote }))
export const updateProductionCsStatus = async (id: string, csStatus: CsStatus) =>
  unwrap<ProductionTask>(await apiClient.patch(`${basePath}/tasks/${id}/cs-status`, { csStatus }))
export const exportProductionQcTasks = (
  params: Omit<ProductionParams, 'page' | 'limit' | 'view'>,
) => apiClient.get(`${basePath}/tasks/qc/export`, { params, responseType: 'blob' })
export const bulkAssignProductionTasks = async (taskIds: string[], assignedDesignUserId: string) =>
  unwrap<unknown>(
    await apiClient.patch(`${basePath}/tasks/bulk-assign`, { taskIds, assignedDesignUserId }),
  )
export const recheckPsdBlockedTasks = async (input: { shopId?: string; limit?: number } = {}) =>
  unwrap<unknown>(await apiClient.post(`${basePath}/tasks/recheck-psd-blocked`, input))
export const updateDesignNote = async (id: string, designNote: string) =>
  unwrap<ProductionTask>(
    await apiClient.patch(`${basePath}/tasks/${id}/design-note`, { designNote }),
  )
export const submitProductionQc = async (id: string, fileDecisions: FileDecision[]) =>
  unwrap<ProductionTask>(await apiClient.patch(`${basePath}/tasks/${id}/qc`, { fileDecisions }))
export async function uploadScaledOutput(id: string, fileCheckId: string, file: File) {
  const body = new FormData()
  body.append('file', file)
  return unwrap<ProductionTask>(
    await apiClient.post(
      `${basePath}/tasks/${id}/file-checks/${fileCheckId}/scaled-output-file`,
      body,
    ),
  )
}

export async function uploadManualScaledOutput(id: string, input: ManualScaledOutput) {
  const body = new FormData()
  body.append('slotKey', input.slotKey)
  if (input.slotLabel) body.append('slotLabel', input.slotLabel)
  body.append('file', input.file)
  return unwrap<ProductionTask>(
    await apiClient.post(`${basePath}/tasks/${id}/file-checks/manual/scaled-output-file`, body),
  )
}
