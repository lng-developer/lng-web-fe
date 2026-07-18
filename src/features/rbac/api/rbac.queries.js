import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { buildCleanQuery, unwrapApiData } from '../utils/rbacApi'
import { rbacKeys } from './rbac.keys'

function get(path, query) {
  return apiClient.get(path, { params: buildCleanQuery(query) }).then(unwrapApiData)
}

export function useAccountsQuery(query = {}) {
  const params = buildCleanQuery(query)

  return useQuery({
    queryKey: rbacKeys.accounts(params),
    queryFn: () => get(ENDPOINTS.RBAC.ACCOUNTS, params),
    placeholderData: keepPreviousData,
  })
}

export function useAccountQuery(accountId, options = {}) {
  return useQuery({
    queryKey: rbacKeys.account(accountId),
    queryFn: () => get(ENDPOINTS.RBAC.ACCOUNT(accountId)),
    enabled: Boolean(accountId),
    ...options,
  })
}

export function useRolesQuery(query = {}) {
  const params = buildCleanQuery({ limit: 100, ...query })

  return useQuery({
    queryKey: rbacKeys.roles(params),
    queryFn: () => get(ENDPOINTS.RBAC.ROLES, params),
    placeholderData: keepPreviousData,
  })
}

export function useRoleQuery(roleId, options = {}) {
  return useQuery({
    queryKey: rbacKeys.role(roleId),
    queryFn: () => get(ENDPOINTS.RBAC.ROLE(roleId)),
    enabled: Boolean(roleId),
    ...options,
  })
}

export function usePermissionsQuery(query = {}) {
  const params = buildCleanQuery({ limit: 100, ...query })

  return useQuery({
    queryKey: rbacKeys.permissions(params),
    queryFn: () => get(ENDPOINTS.RBAC.PERMISSIONS, params),
    placeholderData: keepPreviousData,
  })
}

export function usePermissionQuery(permissionId, options = {}) {
  return useQuery({
    queryKey: rbacKeys.permission(permissionId),
    queryFn: () => get(ENDPOINTS.RBAC.PERMISSION(permissionId)),
    enabled: Boolean(permissionId),
    ...options,
  })
}

export function useScopesQuery(query = {}) {
  const params = buildCleanQuery({ limit: 100, ...query })

  return useQuery({
    queryKey: rbacKeys.scopes(params),
    queryFn: () => get(ENDPOINTS.RBAC.SCOPES, params),
    placeholderData: keepPreviousData,
  })
}

export function useAccessAssignmentsQuery(query = {}) {
  const params = buildCleanQuery({ limit: 100, ...query })

  return useQuery({
    queryKey: rbacKeys.accessAssignments(params),
    queryFn: () => get(ENDPOINTS.RBAC.ACCESS_ASSIGNMENTS, params),
    placeholderData: keepPreviousData,
  })
}

export function useScopedRolePermissionsQuery(query = {}) {
  const params = buildCleanQuery({ limit: 100, ...query })

  return useQuery({
    queryKey: rbacKeys.scopedRolePermissions(params),
    queryFn: () => get(ENDPOINTS.RBAC.SCOPED_ROLE_PERMISSIONS, params),
    placeholderData: keepPreviousData,
  })
}

export function useDepartmentsQuery(query = {}) {
  const params = buildCleanQuery({ limit: 100, ...query })

  return useQuery({
    queryKey: rbacKeys.departments(params),
    queryFn: () => get(ENDPOINTS.ORGANIZATION.DEPARTMENTS, params),
  })
}

export function useTeamsQuery(query = {}) {
  const params = buildCleanQuery({ limit: 100, ...query })

  return useQuery({
    queryKey: rbacKeys.teams(params),
    queryFn: () => get(ENDPOINTS.ORGANIZATION.TEAMS, params),
  })
}

export function useMemberCandidatesQuery(query = {}) {
  const params = buildCleanQuery({ limit: 50, ...query })

  return useQuery({
    queryKey: rbacKeys.memberCandidates(params),
    queryFn: () => get(ENDPOINTS.ORGANIZATION.MEMBER_CANDIDATES, params),
  })
}
