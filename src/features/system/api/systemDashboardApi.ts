import { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'

export type SystemDashboard = {
  accounts?: { total: number; active: number }
  health?: { status: string; infrastructure: { mongo: string; redis: string } }
  recentAudit?: { items: Array<{ id: string; action: string; actorLabel?: string | null; createdAt: string }> }
}

export async function getSystemDashboard() {
  const response = await apiClient.get<ApiResponse<SystemDashboard>>('/api/system/dashboard')
  return (response as unknown as ApiResponse<SystemDashboard>).data
}
