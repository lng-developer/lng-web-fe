import { apiClient, ApiError } from '@/shared/api'
import {
  getAccessToken,
  hasRefreshSession,
  setAccessToken,
  setAccount,
  setGlobalPermissions,
  setHasRefreshSession,
  setPermissions,
  setRoles,
} from '@/shared/auth/session'
type ApiResponse<T> = { success: boolean; data: T }
export type ScopedAccess = {
  assignmentId: string
  scopeType: string
  scopeId: string | null
  resourceId: string | null
  roles: string[]
  permissions: string[]
}
export type AuthSession = {
  accessToken: string
  tokenType: 'Bearer'
  account: { id: string; email: string; mustChangePassword: boolean }
  roles: string[]
  permissions: string[]
  scopes?: ScopedAccess[]
}
export type CurrentAccount = Omit<AuthSession, 'accessToken' | 'tokenType'> & {
  scopes: ScopedAccess[]
  profileSetupRequired: boolean
}
const effectivePermissions = (session: Pick<AuthSession, 'permissions' | 'scopes'>) => [
  ...new Set([
    ...session.permissions,
    ...(session.scopes ?? []).flatMap((scope) => scope.permissions),
  ]),
]
export async function login(identifier: string, password: string) {
  const response = await apiClient.post<ApiResponse<AuthSession>>('/api/auth/login', {
    identifier,
    password,
  })
  const session = (response as unknown as ApiResponse<AuthSession>).data
  setAccessToken(session.accessToken)
  setAccount(session.account)
  setHasRefreshSession(true)
  setRoles(session.roles)
  setPermissions(effectivePermissions(session))
  setGlobalPermissions(session.permissions)
  return session
}

export async function logout() {
  try {
    await apiClient.post('/api/auth/logout')
  } finally {
    setAccessToken(null)
    setHasRefreshSession(false)
  }
}

export async function restoreSession() {
  const accessToken = getAccessToken()
  if (accessToken) {
    try {
      const account = await getCurrentAccount()
      return {
        accessToken,
        tokenType: 'Bearer',
        account: account.account,
        roles: account.roles,
        permissions: account.permissions,
        scopes: account.scopes,
      }
    } catch (fallbackError) {
      if (fallbackError instanceof ApiError && fallbackError.status === 401) {
        setAccessToken(null)
        setHasRefreshSession(false)
      }
      throw fallbackError
    }
  }

  if (!hasRefreshSession()) throw new ApiError('Session not found', { status: 401 })

  try {
    const response = await apiClient.post<ApiResponse<AuthSession>>('/api/auth/refresh')
    const session = (response as unknown as ApiResponse<AuthSession>).data
    setAccessToken(session.accessToken)
    setAccount(session.account)
    setHasRefreshSession(true)
    setRoles(session.roles)
    setPermissions(effectivePermissions(session))
    setGlobalPermissions(session.permissions)
    return session
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 401)) {
      setAccessToken(null)
      setHasRefreshSession(false)
    }
    throw error
  }
}

export async function getCurrentAccount() {
  const response = await apiClient.get<ApiResponse<CurrentAccount>>('/api/auth/me')
  const account = (response as unknown as ApiResponse<CurrentAccount>).data
  setAccount(account.account)
  setRoles(account.roles)
  setPermissions(effectivePermissions(account))
  setGlobalPermissions(account.permissions)
  return account
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const response = await apiClient.post<ApiResponse<AuthSession['account']>>(
    '/api/auth/me/change-password',
    { currentPassword, newPassword },
  )
  return (response as unknown as ApiResponse<AuthSession['account']>).data
}
