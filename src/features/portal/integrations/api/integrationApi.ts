import { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'

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
export type ExtensionCommandStatus = 'QUEUED' | 'CLAIMED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
export type ExtensionAgent = {
  listingImageSync?: boolean
  id: string
  shopId: string
  clientId: string
  label: string
  version: string | null
  apiBaseUrl: string | null
  lastSeenAt: string
  lastReconnectedAt?: string | null
}
export type ExtensionManagementAgent = ExtensionAgent & {
  status: 'ONLINE' | 'OFFLINE'
  token: {
    id: string
    name: string
    tokenHint: string
    environment: string
    lastUsedAt: string | null
    expiresAt: string | null
    revokedAt: string | null
  } | null
}
export type ExtensionCommand = {
  id: string
  type: ExtensionCommandType
  status: ExtensionCommandStatus
  shopId: string
  agentId: string
  dateFrom?: string | null
  dateTo?: string | null
  importJobId: string | null
  attemptCount: number
  errorMessage: string | null
  createdAt: string
  claimedAt?: string | null
  startedAt?: string | null
  completedAt: string | null
}
export type ExtensionCommandType =
  | 'SYNC_LISTING_IMAGES'
  | 'IMPORT_NEW_ORDERS'
  | 'IMPORT_ADS_SPEND'
  | 'IMPORT_TRANSACTIONS'
  | 'IMPORT_SETTLEMENTS'
  | 'TEST_CONNECTION'
export type ExtensionImportDays = 1 | 2 | 7 | 15 | 30
export type ExtensionOrderSchedule = {
  id: string
  shopId: string
  agentId: string
  enabled: boolean
  intervalMinutes: 60 | 120 | 180 | 240
  nextRunAt: string
  lastQueuedAt: string | null
  lastError: string | null
}
export type ExtensionFinanceScheduleSource = 'TRANSACTIONS' | 'SETTLEMENTS'
export type ExtensionFinanceSchedule = {
  id: string
  shopId: string
  agentId: string
  source: ExtensionFinanceScheduleSource
  enabled: boolean
  intervalMinutes: 1440
  nextRunAt: string
  lastQueuedAt: string | null
  lastCompletedAt: string | null
  lastSuccessfulDate: string | null
  lastError: string | null
}

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

export type ImportJobProgressPhase = {
  total: number
  pending?: number
  queued?: number
  processing?: number
  completed: number
  imported?: number
  failed: number
  skipped: number
  percentage: number
}

export type ImportJobProgress = {
  job: ImportJob
  phases: {
    parse: ImportJobProgressPhase
    import: ImportJobProgressPhase
    postImport: ImportJobProgressPhase
  }
  issues: {
    total: number
    open: number
    resolved: number
    ignored: number
  }
  percentage: number
  isTerminal: boolean
  updatedAt: string
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

export type RetryPostImportResult = {
  requestedCount: number
  eligibleCount: number
  queuedCount: number
  items: Array<{
    rawRecordId: string
    queued: boolean
    errorCode?: string
    errorMessage?: string
  }>
}

const basePath = '/api/integration/external-order-imports'
const extensionCommandPath = '/api/integration/extension-commands'
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

export async function getImportJobProgress(jobId: string) {
  return unwrap<ImportJobProgress>(await apiClient.get(`${basePath}/${jobId}/progress`))
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

export async function retryPostImportRawRecords(jobId: string, rawRecordIds: string[]) {
  return unwrap<RetryPostImportResult>(
    await apiClient.post(`${basePath}/${jobId}/raw-records/retry-post-import`, { rawRecordIds }),
  )
}

export async function updateIssueStatus(issueId: string, input: IssueUpdateInput) {
  return unwrap<ImportIssue>(await apiClient.patch(`${basePath}/issues/${issueId}`, input))
}

export async function listExtensionAgents() {
  return unwrap<{ items: ExtensionAgent[] }>(await apiClient.get(`${extensionCommandPath}/agents`))
}
export async function listExtensionManagementAgents() {
  return unwrap<{ items: ExtensionManagementAgent[] }>(
    await apiClient.get(`${extensionCommandPath}/management-agents`),
  )
}
export async function listExtensionCommands(params: PageParams = {}) {
  return unwrap<Paginated<ExtensionCommand>>(
    await apiClient.get(`${extensionCommandPath}/commands`, { params }),
  )
}
export async function createExtensionCommand(input: {
  type: ExtensionCommandType
  shopId: string
  agentId: string
  numDays?: ExtensionImportDays
  dateFrom?: string
  dateTo?: string
}) {
  return unwrap<ExtensionCommand>(await apiClient.post(`${extensionCommandPath}/commands`, input))
}
export async function listExtensionOrderSchedules() {
  return unwrap<{ items: ExtensionOrderSchedule[] }>(
    await apiClient.get(`${extensionCommandPath}/order-schedules`),
  )
}
export async function upsertExtensionOrderSchedule(
  agentId: string,
  input: Pick<ExtensionOrderSchedule, 'enabled' | 'intervalMinutes'>,
) {
  return unwrap<ExtensionOrderSchedule>(
    await apiClient.put(`${extensionCommandPath}/order-schedules/${agentId}`, input),
  )
}
export async function listExtensionFinanceSchedules() {
  return unwrap<{ items: ExtensionFinanceSchedule[] }>(
    await apiClient.get(`${extensionCommandPath}/finance-schedules`),
  )
}
export async function upsertExtensionFinanceSchedule(
  agentId: string,
  source: ExtensionFinanceScheduleSource,
  input: Pick<ExtensionFinanceSchedule, 'enabled'>,
) {
  return unwrap<ExtensionFinanceSchedule>(
    await apiClient.put(`${extensionCommandPath}/finance-schedules/${agentId}/${source}`, input),
  )
}
export async function requestExtensionFinanceScheduleNow(
  agentId: string,
  source: ExtensionFinanceScheduleSource,
) {
  return unwrap<ExtensionFinanceSchedule>(
    await apiClient.post(
      `${extensionCommandPath}/finance-schedules/${agentId}/${source}/request-now`,
    ),
  )
}
