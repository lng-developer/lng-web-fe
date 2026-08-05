import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }

export type ImportSource = 'AMAZON_EXTENSION_REPORT' | 'MANUAL_EXCEL'
export type ImportJobStatus =
  | 'PENDING'
  | 'PARSING'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'PARTIAL_FAILED'
  | 'FAILED'
  | 'CANCELLED'
export type ImportIssueStatus = 'OPEN' | 'RESOLVED' | 'IGNORED'
export type ImportIssueSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
export type ImportRecordStatus = 'PENDING' | 'NORMALIZED' | 'IMPORTED' | 'FAILED' | 'SKIPPED'
export type PostImportStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED'
export type ImportUploadSource = 'AMAZON_ORDER_REPORT' | 'ETSY_SOLD_ORDER_ITEMS'

export type Pagination = { total: number; page: number; limit: number }
export type Paginated<T> = { items: T[]; pagination: Pagination }
export type PageParams = { page?: number; limit?: number }

export type ImportJobSummary = {
  rawRecords?: Record<string, number>
  postImport?: Record<string, number>
  orderItems?: Record<string, number>
  plans?: Record<string, number>
  productionTasks?: Record<string, number>
}

export type ImportJob = {
  id: string
  source: ImportSource
  sourceType: 'EXTENSION_REPORT' | 'FILE'
  shopId: string | null
  shopConnectionId: string | null
  salesChannelCode: string
  marketplaceCode: string
  externalAccountId: string | null
  sourceFileId: string | null
  status: ImportJobStatus
  totalRecords: number
  parsedCount: number
  importedCount: number
  skippedCount: number
  failedCount: number
  startedAt: string | null
  finishedAt: string | null
  triggeredBy: string | null
  errorCode: string | null
  errorMessage: string | null
  summary: ImportJobSummary | null
  createdAt: string
  updatedAt: string
}

export type ImportIssue = {
  id: string
  importJobId: string
  shopId: string | null
  rawRecordId: string | null
  source: ImportSource
  externalOrderId: string | null
  externalItemId: string | null
  rowNumber: number | null
  issueType: string
  severity: ImportIssueSeverity
  status: ImportIssueStatus
  errorCode: string | null
  errorMessage: string | null
  details: Record<string, unknown>
  resolvedBy: string | null
  resolvedAt: string | null
  resolutionNote: string | null
  createdAt: string
  updatedAt: string
}

export type ImportRawRecord = {
  id: string
  importJobId: string
  source: ImportSource
  rowNumber: number
  externalOrderId: string | null
  externalItemId: string | null
  asin: string | null
  sku: string | null
  normalizeStatus: ImportRecordStatus
  importStatus: ImportRecordStatus
  postImportStatus: PostImportStatus
  postImportAttempts: number
  postImportQueuedAt: string | null
  postImportStartedAt: string | null
  postImportFinishedAt: string | null
  postImportErrorCode: string | null
  postImportErrorMessage: string | null
  orderId: string | null
  orderItemId: string | null
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export type ImportJobListParams = PageParams & {
  shopId?: string
  source?: ImportSource
  status?: ImportJobStatus
  dateFrom?: string
  dateTo?: string
}

export type IssueListParams = PageParams & {
  importJobId?: string
  shopId?: string
  source?: ImportSource
  status?: ImportIssueStatus
  issueType?: string
  severity?: ImportIssueSeverity
  externalOrderId?: string
  externalItemId?: string
}

export type RawRecordListParams = PageParams & {
  importStatus?: ImportRecordStatus
  normalizeStatus?: ImportRecordStatus
  postImportStatus?: PostImportStatus
}

export type ImportUploadInput = {
  file: File
  shopId: string
  marketplaceCode: string
  shopConnectionId?: string
  externalAccountId?: string
}

export type ImportUploadResult = {
  jobId: string
  status: ImportJobStatus
  totalRecords: number
  importedCount: number
  skippedCount: number
  failedCount: number
  issuesCount: number
  postImportQueuedCount: number
}

export type IssueUpdateInput = {
  status: 'RESOLVED' | 'IGNORED'
  note: string
}

export type RetryImportResult = {
  jobId: string
  status: ImportJobStatus
  replayedRawRecords: number
  requeuedPostImportJobs: number
  skippedCompletedRecords: number
}

const basePath = '/api/integration/external-order-imports'
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export async function listImportJobs(params: ImportJobListParams = {}) {
  return unwrap<Paginated<ImportJob>>(await apiClient.get(basePath, { params }))
}

function toUploadForm(input: ImportUploadInput) {
  const form = new FormData()
  form.append('file', input.file)
  form.append('shopId', input.shopId)
  form.append('marketplaceCode', input.marketplaceCode)
  if (input.shopConnectionId) form.append('shopConnectionId', input.shopConnectionId)
  if (input.externalAccountId) form.append('externalAccountId', input.externalAccountId)
  return form
}

export async function uploadManualExcel(input: ImportUploadInput) {
  return unwrap<ImportUploadResult>(
    await apiClient.post(`${basePath}/manual-excel`, toUploadForm(input)),
  )
}

export async function uploadEtsySoldItems(input: ImportUploadInput) {
  return unwrap<ImportUploadResult>(
    await apiClient.post(`${basePath}/etsy-sold-order-items`, toUploadForm(input)),
  )
}

export async function getImportJob(jobId: string) {
  return unwrap<ImportJob>(await apiClient.get(`${basePath}/${jobId}`))
}

export async function listJobIssues(jobId: string, params: PageParams = {}) {
  return unwrap<Paginated<ImportIssue>>(
    await apiClient.get(`${basePath}/${jobId}/issues`, { params }),
  )
}

export async function listJobRawRecords(jobId: string, params: RawRecordListParams = {}) {
  return unwrap<Paginated<ImportRawRecord>>(
    await apiClient.get(`${basePath}/${jobId}/raw-records`, { params }),
  )
}

export async function listIssues(params: IssueListParams = {}) {
  return unwrap<Paginated<ImportIssue>>(await apiClient.get(`${basePath}/issues`, { params }))
}

export async function retryImportJob(jobId: string) {
  return unwrap<RetryImportResult>(await apiClient.post(`${basePath}/${jobId}/retry`))
}

export async function updateIssueStatus(issueId: string, input: IssueUpdateInput) {
  return unwrap<ImportIssue>(await apiClient.patch(`${basePath}/issues/${issueId}`, input))
}
