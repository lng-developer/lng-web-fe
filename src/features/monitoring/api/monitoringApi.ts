import { apiClient } from '@/shared/api'

export type ModuleHealth = {
  module: string
  status: 'ok' | 'degraded' | 'error'
  latencyMs?: number
  timestamp: string
  details?: Record<string, unknown>
}

export type SystemMetrics = {
  uptimeSeconds: number
  nodeVersion: string
  memoryHeapUsedMb: number
  memoryHeapTotalMb: number
  mongoStatus: 'CONNECTED' | 'DISCONNECTED'
  redisStatus: 'CONNECTED' | 'DISCONNECTED'
  activeModulesCount: number
  totalModulesCount: number
}

export const MODULES_LIST = [
  { key: 'auth', name: 'Auth & RBAC Engine', endpoint: '/api/auth/health' },
  { key: 'shop', name: 'Shop Aggregate Root', endpoint: '/api/shops/health' },
  { key: 'catalog', name: 'Catalog & Metadata', endpoint: '/api/catalog/health' },
  { key: 'vendor', name: 'Vendor Master & SLA', endpoint: '/api/vendors/health' },
  { key: 'order', name: 'Order & Items Lifecycle', endpoint: '/api/orders/health' },
  { key: 'customization', name: 'Customization Handoff', endpoint: '/api/customization/health' },
  { key: 'mapping', name: '5-Stage Mapping Engine', endpoint: '/api/mapping/health' },
  { key: 'production', name: 'Production Workflow & QC', endpoint: '/api/production/health' },
  { key: 'shipment', name: 'FBM Shipment & Carrier', endpoint: '/api/shipments/health' },
  { key: 'finance', name: 'Finance & Reconciliation', endpoint: '/api/finance/health' },
  { key: 'report', name: 'Read Models & Analytics', endpoint: '/api/reports/health' },
  { key: 'workScore', name: 'Work Score Evaluation', endpoint: '/api/work-scores/health' },
  { key: 'media', name: 'Media Assets & Artwork', endpoint: '/api/media/health' },
  { key: 'audit', name: 'Immutable Audit Evidence', endpoint: '/api/audit/health' },
] as const

export async function checkModuleHealth(
  endpoint: string,
  moduleName: string,
): Promise<ModuleHealth> {
  const start = performance.now()
  try {
    const res = await apiClient.get<unknown>(endpoint)
    const end = performance.now()
    const latencyMs = Math.round(end - start)
    return {
      module: moduleName,
      status: 'ok',
      latencyMs,
      timestamp: new Date().toISOString(),
      details: typeof res === 'object' && res ? (res as unknown as Record<string, unknown>) : {},
    }
  } catch (error) {
    const end = performance.now()
    return {
      module: moduleName,
      status: 'error',
      latencyMs: Math.round(end - start),
      timestamp: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : 'Module unreachable' },
    }
  }
}
