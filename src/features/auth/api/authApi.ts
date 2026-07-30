import { apiClient } from '@/shared/api'
import { setAccessToken } from '@/shared/auth/session'
type ApiResponse<T> = { success: boolean; data: T }
export type AuthSession = {
  accessToken: string
  tokenType: 'Bearer'
  account: { id: string; email: string; mustChangePassword: boolean }
  roles: string[]
  permissions: string[]
}
export async function login(identifier: string, password: string) {
  const response = await apiClient.post<ApiResponse<AuthSession>>('/api/auth/login', {
    identifier,
    password,
  })
  const session = (response as unknown as ApiResponse<AuthSession>).data
  setAccessToken(session.accessToken)
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
    return session
  } catch (error) {
    setAccessToken(null)
    throw error
  }
}
