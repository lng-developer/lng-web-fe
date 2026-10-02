import type { CurrentAccount } from '@/features/auth/api/authApi'

import {
  getGlobalPermissions,
  getPermissions,
  getRoles,
  hasHydratedGlobalPermissions,
} from './session'

const superAdminRoles = new Set(['SUPER_ADMIN'])

export function hasAnyPermission(required: readonly string[], { globalOnly = false } = {}) {
  const globalPermissions = getGlobalPermissions()
  const permissions =
    globalOnly && hasHydratedGlobalPermissions() ? globalPermissions : getPermissions()
  const roles = getRoles().map((role) => role.toUpperCase())
  if (roles.some((role) => superAdminRoles.has(role))) return true
  return required.some((permission) => permissions.includes(permission))
}

export function canUseScopedPermission(
  account: Pick<CurrentAccount, 'permissions' | 'scopes' | 'roles'> | undefined,
  permission: string,
  scope?: { scopeType: string; scopeId?: string | null },
) {
  if (!account) return false
  if (account.roles?.some((role) => superAdminRoles.has(role.toUpperCase()))) return true
  if (account.permissions.includes(permission)) return true
  if (!scope?.scopeId) return false
  return account.scopes.some(
    (grantedScope) =>
      grantedScope.scopeType.toLowerCase() === scope.scopeType.toLowerCase() &&
      String(grantedScope.scopeId) === String(scope.scopeId) &&
      grantedScope.permissions.includes(permission),
  )
}

export function hasScopedPermission(
  account: Pick<CurrentAccount, 'scopes'> | undefined,
  permission: string,
  scopeType: string,
) {
  if (!account) return false
  return account.scopes.some(
    (scope) =>
      scope.scopeType.toLowerCase() === scopeType.toLowerCase() &&
      scope.permissions.includes(permission),
  )
}
