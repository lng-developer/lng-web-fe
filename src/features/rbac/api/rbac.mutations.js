import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildAccessAssignmentPayload,
  buildAccessAssignmentUpdatePayload,
  buildAccountAccessPayload,
  buildAccountCreatePayload,
  buildPermissionPayload,
  buildRolePayload,
  buildScopedRolePermissionPayload,
  buildScopePayload,
  unwrapApiData,
} from '../utils/rbacApi'
import { rbacKeys } from './rbac.keys'

function useRbacMutation(mutationFn) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rbacKeys.all }),
  })
}

export function useCreateAccountMutation() {
  return useRbacMutation((values) =>
    apiClient.post(ENDPOINTS.RBAC.ACCOUNTS, buildAccountCreatePayload(values)).then(unwrapApiData),
  )
}

export function useUpdateAccountStatusMutation() {
  return useRbacMutation(({ accountId, status }) =>
    apiClient.patch(ENDPOINTS.RBAC.ACCOUNT_STATUS(accountId), { status }).then(unwrapApiData),
  )
}

export function useUpdateAccountEmailMutation() {
  return useRbacMutation(({ accountId, email }) =>
    apiClient.patch(ENDPOINTS.RBAC.ACCOUNT_EMAIL(accountId), { email }).then(unwrapApiData),
  )
}

export function useResetAccountPasswordMutation() {
  return useRbacMutation(({ accountId, password }) =>
    apiClient.patch(ENDPOINTS.RBAC.ACCOUNT_PASSWORD(accountId), { password }).then(unwrapApiData),
  )
}

export function useRevokeAccountSessionsMutation() {
  return useRbacMutation((accountId) =>
    apiClient.post(ENDPOINTS.RBAC.ACCOUNT_REVOKE_SESSIONS(accountId)).then(unwrapApiData),
  )
}

export function useArchiveAccountMutation() {
  return useRbacMutation((accountId) =>
    apiClient.delete(ENDPOINTS.RBAC.ACCOUNT(accountId)).then(unwrapApiData),
  )
}

export function useUpdateAccountAccessMutation() {
  return useRbacMutation(({ accountId, values }) =>
    apiClient
      .patch(ENDPOINTS.RBAC.ACCOUNT_ACCESS(accountId), buildAccountAccessPayload(values))
      .then(unwrapApiData),
  )
}

export function useCreateRoleMutation() {
  return useRbacMutation((values) =>
    apiClient.post(ENDPOINTS.RBAC.ROLES, buildRolePayload(values)).then(unwrapApiData),
  )
}

export function useUpdateRoleMutation() {
  return useRbacMutation(({ roleId, values }) =>
    apiClient.patch(ENDPOINTS.RBAC.ROLE(roleId), buildRolePayload(values)).then(unwrapApiData),
  )
}

export function useDeleteRoleMutation() {
  return useRbacMutation((roleId) => apiClient.delete(ENDPOINTS.RBAC.ROLE(roleId)))
}

export function useCreatePermissionMutation() {
  return useRbacMutation((values) =>
    apiClient.post(ENDPOINTS.RBAC.PERMISSIONS, buildPermissionPayload(values)).then(unwrapApiData),
  )
}

export function useUpdatePermissionMutation() {
  return useRbacMutation(({ permissionId, values }) =>
    apiClient
      .patch(ENDPOINTS.RBAC.PERMISSION(permissionId), buildPermissionPayload(values))
      .then(unwrapApiData),
  )
}

export function useDeletePermissionMutation() {
  return useRbacMutation((permissionId) =>
    apiClient.delete(ENDPOINTS.RBAC.PERMISSION(permissionId)),
  )
}

export function useCreateScopeMutation() {
  return useRbacMutation((values) =>
    apiClient.post(ENDPOINTS.RBAC.SCOPES, buildScopePayload(values)).then(unwrapApiData),
  )
}

export function useUpdateScopeMutation() {
  return useRbacMutation(({ scopeRegistryId, values }) =>
    apiClient.patch(ENDPOINTS.RBAC.SCOPE(scopeRegistryId), values).then(unwrapApiData),
  )
}

export function useDeactivateScopeMutation() {
  return useRbacMutation((scopeRegistryId) =>
    apiClient.delete(ENDPOINTS.RBAC.SCOPE(scopeRegistryId)).then(unwrapApiData),
  )
}

export function useCreateAccessAssignmentMutation() {
  return useRbacMutation((values) =>
    apiClient
      .post(ENDPOINTS.RBAC.ACCESS_ASSIGNMENTS, buildAccessAssignmentPayload(values))
      .then(unwrapApiData),
  )
}

export function useUpdateAccessAssignmentMutation() {
  return useRbacMutation(({ assignmentId, values }) =>
    apiClient
      .patch(
        ENDPOINTS.RBAC.ACCESS_ASSIGNMENT(assignmentId),
        buildAccessAssignmentUpdatePayload(values),
      )
      .then(unwrapApiData),
  )
}

export function useDeactivateAccessAssignmentMutation() {
  return useRbacMutation((assignmentId) =>
    apiClient.delete(ENDPOINTS.RBAC.ACCESS_ASSIGNMENT(assignmentId)).then(unwrapApiData),
  )
}

export function useSetScopedRolePermissionsMutation() {
  return useRbacMutation((values) =>
    apiClient
      .put(ENDPOINTS.RBAC.SCOPED_ROLE_PERMISSIONS, buildScopedRolePermissionPayload(values))
      .then(unwrapApiData),
  )
}
