import { apiClient } from '@/shared/api'
import { unwrapResponse } from '@/shared/api/helpers'

export type TeamsOAuthStatus = {
  enabled: boolean
  userLinked: boolean
  grantStatus: 'CONNECTED' | 'REAUTH_REQUIRED' | 'NOT_CONNECTED'
}

const unwrap = unwrapResponse

export const getTeamsOAuthStatus = async (options?: { signal?: AbortSignal } | AbortSignal) => {
  const signal = options instanceof AbortSignal ? options : options?.signal
  return unwrap<TeamsOAuthStatus>(
    await (signal
      ? apiClient.get('/api/integration/teams/oauth/status', { signal })
      : apiClient.get('/api/integration/teams/oauth/status')),
  )
}

export const startTeamsOAuth = async () =>
  unwrap<{ authorizationUrl: string }>(await apiClient.get('/api/integration/teams/oauth/start'))
