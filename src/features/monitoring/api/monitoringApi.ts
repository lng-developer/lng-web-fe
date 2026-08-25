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
  realtime?: {
    status: 'ok' | 'disabled'
    connectedClients: number
    authenticatedUsers: number
    rooms: number
    connections: number
    disconnections: number
    authFailures: number
    eventFailures: number
    lastErrorAt: string | null
    lastErrorMessage: string | null
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

export type SystemLogProcess = 'lng-web-be' | 'lng-web-be-import-workers' | 'lng-web-be-dev-tunnel'
export type SystemLogStream = 'out' | 'error'

export type SystemLogs = {
  process: SystemLogProcess
  stream: SystemLogStream
  lines: number
  filename: string
  content: string[]
  availableProcesses: Array<{ key: SystemLogProcess; label: string }>
  availableStreams: SystemLogStream[]
}

export type MongoIndexUsageSnapshot = {
  capturedOn: string
  capturedAt: string
  database: string
  totals: {
    dataBytes: number
    storageBytes: number
    indexBytes: number
    collections: number
    indexes: number
  }
  collections: Array<{
    name: string
    documentCount: number
    dataBytes: number
    storageBytes: number
    indexBytes: number
    indexCount: number
    usageAvailable: boolean
    indexes: Array<{
      name: string
      key: Record<string, number | string>
      operations: number | null
    }>
    findings: Array<{
      indexName: string
      classification: string
      coveredBy: string | null
      reason: string
    }>
  }>
}

export async function getSystemHealth() {
  const response = await apiClient.get<ApiResponse<SystemHealth>>('/api/system/health')
  return (response as unknown as ApiResponse<SystemHealth>).data
}

export async function getSystemLogs(params: {
  process: SystemLogProcess
  stream: SystemLogStream
  lines: number
}) {
  const response = await apiClient.get<ApiResponse<SystemLogs>>('/api/system/logs', { params })
  return (response as unknown as ApiResponse<SystemLogs>).data
}

export async function getMongoIndexUsageSnapshots(limit = 30) {
  const response = await apiClient.get<ApiResponse<MongoIndexUsageSnapshot[]>>(
    '/api/audit/mongo-index-usage-snapshots',
    { params: { limit } },
  )
  return (response as unknown as ApiResponse<MongoIndexUsageSnapshot[]>).data
}
