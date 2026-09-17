import type { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'

const basePath = '/api/integration/listing-image-sync'
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data
export type ImageJobAction = 'pause' | 'resume' | 'retry'
export type ImageJob = {
  id: string
  shopId: string
  agentId: string
  status: 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS'
  total: number
  processed: number
  updated: number
  unchanged: number
  skipped: number
  failed: number
  createdAt: string
  updatedAt: string
  errorMessage: string | null
}
export type ImageSchedule = {
  id: string
  shopId: string
  agentId: string
  enabled: boolean
  nextRunAt: string
  lastError: string | null
}
export async function listImageSchedules() {
  return unwrap<{ items: ImageSchedule[] }>(await apiClient.get(`${basePath}/schedules`))
}
export async function saveImageSchedule(agentId: string, enabled: boolean) {
  return unwrap<ImageSchedule>(await apiClient.put(`${basePath}/schedules/${agentId}`, { enabled }))
}
export async function listImageJobs(page = 1) {
  return unwrap<{ items: ImageJob[]; total: number; page: number; limit: number }>(
    await apiClient.get(`${basePath}/jobs`, { params: { page, limit: 10 } }),
  )
}
export async function createImageJob(input: { shopId: string; agentId: string }) {
  return unwrap<ImageJob>(await apiClient.post(`${basePath}/jobs`, input))
}
export async function actOnImageJob(jobId: string, action: ImageJobAction) {
  return unwrap<ImageJob>(await apiClient.post(`${basePath}/jobs/${jobId}/${action}`))
}
