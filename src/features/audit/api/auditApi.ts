import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }

export type AuditEvent = {
  id: string
  actorType: string
  actorAccountId: string | null
  actorSnapshot: Record<string, unknown>
  actorLabel: string | null
  actorEmail: string | null
  actorEmployeeCode: string | null
  action: string
  entityType: string
  entityId: string
  entityLabel: string | null
  scopeType: string | null
  scopeId: string | null
  scopeLabel: string | null
  outcome: 'SUCCEEDED' | 'FAILED'
  source: 'HTTP' | 'WORKER' | 'SYSTEM' | 'IMPORT'
  requestId: string | null
  ipAddress: string | null
  userAgent: string | null
  changes: Record<string, unknown> | null
  metadata: Record<string, unknown>
  createdAt: string
}

export type AuditFilters = {
  action?: string
  entityType?: string
  entityId?: string
  outcome?: AuditEvent['outcome']
  source?: AuditEvent['source']
  dateFrom?: string
  dateTo?: string
}

export type AuditPage = { items: AuditEvent[]; nextCursor: string | null }

export async function listAuditEvents(filters: AuditFilters, cursor?: string): Promise<AuditPage> {
  const response = (await apiClient.get('/api/audit/events', {
    params: { ...filters, cursor, limit: 50 },
  })) as ApiResponse<AuditPage>
  return response.data
}
