import { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'

export type WorkScoreSourceType = 'DESIGN_SUBMISSION' | 'PRODUCTION_SCALE'
export type WorkScoreStatus = 'ACTIVE' | 'VOIDED'
export type WorkScoreLevel = 'BASIC' | 'STANDARD' | 'HARD' | 'BONUS'
export type WorkScoreAdjustment = {
  type: 'OVERRIDE' | 'VOID' | 'SYSTEM_VOID'
  oldPoints: number
  newPoints: number
  oldScoreLevel: WorkScoreLevel
  newScoreLevel: WorkScoreLevel
  oldStatus: WorkScoreStatus
  newStatus: WorkScoreStatus
  actorId: string | null
  reason: string
  adjustedAt: string
}
export type WorkScoreListItem = {
  id: string
  sourceType: WorkScoreSourceType
  sourceTaskId: string
  sourceUnitId: string
  assetId: string
  assetDownloadUrl: string | null
  shopId: string
  workerId: string
  workerName: string | null
  contextSnapshot: Record<string, unknown> | null
  basePoints: number
  finalPoints: number
  scoreLevel: WorkScoreLevel
  status: WorkScoreStatus
  adjustments: WorkScoreAdjustment[]
  version: number
  scoredAt: string | null
}
export type WorkScoreDetail = WorkScoreListItem
export type WorkScoreList = {
  items: WorkScoreListItem[]
  total: number
  page: number
  limit: number
}
export type WorkScoreSummary = {
  totalPoints: number
  totalFiles: number
  bySourceType: Array<{ _id: WorkScoreSourceType; totalPoints: number; totalFiles: number }>
  byWorker: Array<{
    _id: string
    workerName: string | null
    totalPoints: number
    totalFiles: number
  }>
  byTaskType: Array<{ _id: string | null; totalPoints: number; totalFiles: number }>
  byDifficulty?: Array<{ _id: string | null; totalPoints: number; totalFiles: number }>
}
export type WorkScoreListParams = {
  page?: number
  limit?: number
  search?: string
  sourceType?: WorkScoreSourceType
  shopId?: string
  workerId?: string
  taskType?: string
  scaleDifficultyLevel?: 'NORMAL' | 'HARD' | 'SPECIAL'
  scoreLevel?: WorkScoreLevel
  scoreStatus?: WorkScoreStatus | 'ALL'
  dateFrom?: string
  dateTo?: string
  sortBy?: 'scoredAt' | 'finalPoints' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}
export type WorkScoreRule = {
  id: string
  sourceType: WorkScoreSourceType
  taskType: string | null
  priority: string | null
  scaleDifficultyLevel: 'NORMAL' | 'HARD' | 'SPECIAL' | null
  points: number
  status: 'ACTIVE' | 'INACTIVE'
}
export type WorkScoreRuleInput = Omit<WorkScoreRule, 'id'>
export type WorkScoreRuleFormInput = Omit<
  WorkScoreRuleInput,
  'taskType' | 'priority' | 'scaleDifficultyLevel'
> & {
  taskType?: string | null
  priority?: string | null
  scaleDifficultyLevel?: 'NORMAL' | 'HARD' | 'SPECIAL' | null
}

const basePath = '/api/work-scores'
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data
const compact = <T extends object>(params: T) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  )

export const listWorkScores = async (params: WorkScoreListParams) =>
  unwrap<WorkScoreList>(await apiClient.get(basePath, { params: compact(params) }))
export const getWorkScoreSummary = async (params: WorkScoreListParams) =>
  unwrap<WorkScoreSummary>(await apiClient.get(`${basePath}/summary`, { params: compact(params) }))
export const getWorkScore = async (id: string) =>
  unwrap<WorkScoreDetail>(await apiClient.get(`${basePath}/${id}`))
export const listWorkScoreRules = async () =>
  unwrap<WorkScoreRule[]>(await apiClient.get(`${basePath}/rules`))
export const upsertWorkScoreRule = async (input: WorkScoreRuleInput) =>
  unwrap<WorkScoreRule>(await apiClient.put(`${basePath}/rules`, input))
export const overrideWorkScore = async (
  id: string,
  input: { points: number; scoreLevel?: WorkScoreLevel; reason: string; expectedVersion: number },
) => unwrap<WorkScoreDetail>(await apiClient.patch(`${basePath}/${id}/override`, input))
export const voidWorkScore = async (
  id: string,
  input: { reason: string; expectedVersion: number },
) => unwrap<WorkScoreDetail>(await apiClient.patch(`${basePath}/${id}/void`, input))
