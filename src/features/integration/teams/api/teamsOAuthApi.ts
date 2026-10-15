import { apiClient, unwrap } from '@/shared/api/client'

export type TeamsOAuthStatus = {
  enabled: boolean
  userLinked: boolean
  grantStatus: 'CONNECTED' | 'REAUTH_REQUIRED' | 'NOT_CONNECTED'
}

export const getTeamsOAuthStatus = async () =>
  unwrap<TeamsOAuthStatus>(await apiClient.get('/api/integration/teams/oauth/status'))

export const startTeamsOAuth = async () =>
  unwrap<{ authorizationUrl: string }>(await apiClient.get('/api/integration/teams/oauth/start'))
