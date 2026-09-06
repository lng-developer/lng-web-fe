import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authKeys } from '@/features/auth/api/authKeys'
import {
  createPermission,
  deletePermission,
  type PermissionInput,
  updatePermission,
} from '@/features/auth/permissions/api/permissionsApi'
import {
  createRole,
  deleteRole,
  loadRoleCatalog,
  type RoleInput,
  updateRole,
} from '@/features/auth/roles/api/rolesApi'
import {
  createScope,
  deactivateScope,
  loadScopes,
  type ScopeInput,
  updateScope,
} from '@/features/auth/scopes/api/scopesApi'

export function useRolesQuery() {
  return useQuery({
    queryKey: authKeys.roles.all(),
    queryFn: loadRoleCatalog,
  })
}

export function useScopesQuery() {
  return useQuery({
    queryKey: authKeys.scopes.all(),
    queryFn: loadScopes,
  })
}

export function useSaveAccessEntityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      kind,
      id,
      values,
    }: {
      kind: 'role' | 'permission' | 'scope'
      id?: string
      values: RoleInput | PermissionInput | ScopeInput
    }) => {
      if (kind === 'role') {
        return id ? updateRole(id, values as RoleInput) : createRole(values as RoleInput)
      }
      if (kind === 'permission') {
        return id
          ? updatePermission(id, values as PermissionInput)
          : createPermission(values as PermissionInput)
      }
      return id
        ? updateScope(id, { name: (values as ScopeInput).name })
        : createScope(values as ScopeInput)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.roles.all() }),
        queryClient.invalidateQueries({ queryKey: authKeys.scopes.all() }),
        queryClient.invalidateQueries({ queryKey: authKeys.roles.catalog() }),
      ])
    },
  })
}

export function useDeleteAccessEntityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ kind, id }: { kind: 'role' | 'permission' | 'scope'; id: string }) => {
      if (kind === 'role') return deleteRole(id)
      if (kind === 'permission') return deletePermission(id)
      return deactivateScope(id)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.roles.all() }),
        queryClient.invalidateQueries({ queryKey: authKeys.scopes.all() }),
        queryClient.invalidateQueries({ queryKey: authKeys.roles.catalog() }),
      ])
    },
  })
}
