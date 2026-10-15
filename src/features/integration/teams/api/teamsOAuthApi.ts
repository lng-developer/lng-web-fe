import { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'

export type TeamsOAuthStatus = {
  enabled: boolean
  userLinked: boolean
  grantStatus: 'CONNECTED' | 'REAUTH_REQUIRED' | 'NOT_CONNECTED'
}

const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export const getTeamsOAuthStatus = async () =>
  unwrap<TeamsOAuthStatus>(await apiClient.get('/api/integration/teams/oauth/status'))

export const startTeamsOAuth = async () =>
  unwrap<{ authorizationUrl: string }>(await apiClient.get('/api/integration/teams/oauth/start'))
