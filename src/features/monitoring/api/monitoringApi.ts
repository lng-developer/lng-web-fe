import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }

export type ModuleHealth = {
  key: string
  name: string
  endpoint: string
  status: 'ok' | 'degraded' | 'error'
}

export type SystemHealth = {
  status: 'ok' | 'degraded' | 'error'
  generatedAt: string
  uptimeSeconds: number
  nodeVersion: string
  memory: {
    heapUsedMb: number
    heapTotalMb: number
    rssMb: number
  }
  infrastructure: {
    mongo: 'CONNECTED' | 'DISCONNECTED'
    redis: 'CONNECTED' | 'DISCONNECTED' | 'DISABLED'
    metrics: 'ENABLED' | 'DISABLED'
  }
  modules: ModuleHealth[]
  workers: Array<{
    key: string
    name: string
    process: 'embedded-api' | 'pm2-separate'
    queueName: string | null
    script?: string
    status: 'running' | 'disabled' | 'external'
  }>
  queues: Array<{
    key: string
    name: string
    queueName: string
    worker: string
    status: 'ok' | 'degraded' | 'error' | 'disabled'
    counts: {
      waiting: number
      active: number
      delayed: number
      completed: number
      failed: number
      paused: number
    }
    error?: string
  }>
}

export async function getSystemHealth() {
  const response = await apiClient.get<ApiResponse<SystemHealth>>('/api/system/health')
  return (response as unknown as ApiResponse<SystemHealth>).data
}
