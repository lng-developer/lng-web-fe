import { apiClient } from '@/shared/api'
import { setAccessToken, setPermissions } from '@/shared/auth/session'
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
  setPermissions(effectivePermissions(session))
  return session
}

export async function logout() {
  try {
    await apiClient.post('/api/auth/logout')
  } finally {
    setAccessToken(null)
  }
}

export async function restoreSession() {
  try {
    const response = await apiClient.post<ApiResponse<AuthSession>>('/api/auth/refresh')
    const session = (response as unknown as ApiResponse<AuthSession>).data
    setAccessToken(session.accessToken)
    setPermissions(effectivePermissions(session))
    return session
  } catch (error) {
    setAccessToken(null)
    throw error
  }
}

export async function getCurrentAccount() {
  const response = await apiClient.get<ApiResponse<CurrentAccount>>('/api/auth/me')
  const account = (response as unknown as ApiResponse<CurrentAccount>).data
  setPermissions(effectivePermissions(account))
  return account
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const response = await apiClient.post<ApiResponse<AuthSession['account']>>(
    '/api/auth/me/change-password',
    { currentPassword, newPassword },
  )
  return (response as unknown as ApiResponse<AuthSession['account']>).data
}
