import { apiClient } from '@/shared/api'

type ApiResponse<T> = { data: T; success: boolean }

export type ExtensionTokenEnvironment = 'development' | 'production'

export type ExtensionToken = {
  id: string
  name: string
  shopId: string
  environment: ExtensionTokenEnvironment
  tokenHint: string
  createdAt?: string
  lastUsedAt?: string | null
  expiresAt?: string | null
  revokedAt?: string | null
}

export type ExtensionTokenInput = {
  name: string
  shopId: string
  environment: ExtensionTokenEnvironment
  expiresAt?: string | null
}

function unwrap<T>(response: unknown): T {
  return (response as ApiResponse<T>).data
}

export async function listExtensionTokens(
  params: Pick<ExtensionTokenInput, 'shopId' | 'environment'>,
) {
  return unwrap<ExtensionToken[]>(await apiClient.get('/api/auth/extension-tokens', { params }))
}

export async function createExtensionToken(input: ExtensionTokenInput) {
  return unwrap<{ token: string; extensionToken: ExtensionToken }>(
    await apiClient.post('/api/auth/extension-tokens', input),
  )
}

export async function revokeExtensionToken(tokenId: string) {
  return unwrap<ExtensionToken>(await apiClient.delete(`/api/auth/extension-tokens/${tokenId}`))
}
