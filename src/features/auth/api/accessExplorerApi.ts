import type { AxiosRequestConfig } from 'axios'

import { apiClient } from '@/shared/api'

export type AccessList<T> = {
  items: T[]
  total: number
}

type ApiResponse<T> = {
  success: boolean
  data: T
}

export type AccessExplorerSnapshot = {
  accounts: AccessList<{ id: string; email: string; status?: string; roles?: string[] }>
  account: {
    account: { id: string; email: string; status?: string; roles?: string[] }
    access?: { customPermissionIds?: string[]; roleIds?: string[] }
  }
  assignments: AccessList<{
    id: string
    accountId: string
    customPermissionIds?: string[]
    roleId?: string
    scopeType?: string
    scopeId?: string
  }>
  roles: AccessList<{ id: string; code: string; name?: string; permissions?: string[] }>
  permissions: AccessList<{ id: string; code: string; name?: string }>
  scopes: AccessList<{ id: string; scopeId?: string; name: string; scopeType?: string }>
  scopedRolePermissions: AccessList<{
    id: string
    roleId?: string
    scopeType?: string
    scopeId?: string
    permissionIds?: string[]
  }>
}

export async function loadAccessAccounts() {
  return get<AccessList<AccessExplorerSnapshot['accounts']['items'][number]>>(
    '/api/auth/accounts',
    {
      params: { limit: 100 },
    },
  )
}

async function get<T>(url: string, config?: AxiosRequestConfig) {
  const response = config ? await apiClient.get<T>(url, config) : await apiClient.get<T>(url)
  return (response as unknown as ApiResponse<T>).data
}

export async function loadAccessExplorer(accountId?: string): Promise<AccessExplorerSnapshot> {
  const accounts = await get<AccessList<AccessExplorerSnapshot['accounts']['items'][number]>>(
    '/api/auth/accounts',
    { params: { limit: 50 } },
  )
  const selectedAccountId = accountId ?? accounts.items[0]?.id

  if (!selectedAccountId) {
    return {
      accounts,
      account: { account: { id: '', email: '' } },
      assignments: { items: [], total: 0 },
      roles: { items: [], total: 0 },
      permissions: { items: [], total: 0 },
      scopes: { items: [], total: 0 },
      scopedRolePermissions: { items: [], total: 0 },
    }
  }

  const [account, assignments, roles, permissions, scopes, scopedRolePermissions] =
    await Promise.all([
      get<AccessExplorerSnapshot['account']>(`/api/auth/accounts/${selectedAccountId}`),
      get<AccessList<AccessExplorerSnapshot['assignments']['items'][number]>>(
        '/api/auth/access-assignments',
        {
          params: { accountId: selectedAccountId, limit: 100 },
        },
      ),
      get<AccessList<AccessExplorerSnapshot['roles']['items'][number]>>('/api/auth/roles', {
        params: { limit: 100 },
      }),
      get<AccessList<AccessExplorerSnapshot['permissions']['items'][number]>>(
        '/api/auth/permissions',
        {
          params: { limit: 100 },
        },
      ),
      get<AccessList<AccessExplorerSnapshot['scopes']['items'][number]>>('/api/auth/scopes', {
        params: { limit: 100 },
      }),
      get<AccessList<AccessExplorerSnapshot['scopedRolePermissions']['items'][number]>>(
        '/api/auth/scoped-role-permissions',
        {
          params: { limit: 100 },
        },
      ),
    ])

  return { accounts, account, assignments, roles, permissions, scopes, scopedRolePermissions }
}
