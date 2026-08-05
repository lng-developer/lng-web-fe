import { apiClient } from '@/shared/api'

type ApiResponse<T> = { data: T; success: boolean }

export type ScopeInput = {
  name: string
  scopeId: string
  scopeType: 'DEPARTMENT' | 'SHOP' | 'TEAM' | 'VENDOR'
}
export type ScopeUpdateInput = Partial<Pick<ScopeInput, 'name'>> & {
  status?: 'ACTIVE' | 'INACTIVE'
}
export type ScopeList = {
  items: {
    id: string
    name: string
    scopeId: string
    scopeType: ScopeInput['scopeType']
    status: 'ACTIVE' | 'INACTIVE'
  }[]
  total: number
}

function unwrap<T>(response: unknown): T {
  return (response as ApiResponse<T>).data
}

export async function loadScopes(): Promise<ScopeList> {
  return unwrap(await apiClient.get('/api/auth/scopes', { params: { limit: 100 } }))
}

export async function createScope(input: ScopeInput) {
  return unwrap(await apiClient.post('/api/auth/scopes', input))
}

export async function updateScope(scopeId: string, input: ScopeUpdateInput) {
  return unwrap(await apiClient.patch(`/api/auth/scopes/${scopeId}`, input))
}

export async function deactivateScope(scopeId: string) {
  return unwrap(await apiClient.delete(`/api/auth/scopes/${scopeId}`))
}
