function cleanArray(values = []) {
  return Array.isArray(values) ? values.filter(Boolean) : []
}

function unique(values = []) {
  return [...new Set(cleanArray(values))]
}

export function getOverrideRoleCode(role = {}) {
  return String(role.code || role.roleCode || role.role || '')
    .trim()
    .toUpperCase()
}

export function getOverrideRoleName(role = {}) {
  return role.name || role.roleName || getOverrideRoleCode(role) || '—'
}

export function filterOverrideRoles(roles = [], roleFilter = '') {
  const filter = String(roleFilter || '')
    .trim()
    .toUpperCase()
  if (!filter) return roles

  return roles.filter((role) => getOverrideRoleCode(role) === filter)
}

export function getPermissionIdsFromRole(role = {}) {
  return cleanArray(role.permissions ?? role.permissionIds ?? []).map((permission) =>
    typeof permission === 'string' ? permission : permission?.id,
  )
}

export function getScopeOptionLabel(scope = {}) {
  return (
    scope.name ||
    scope.scopeName ||
    scope.resource?.name ||
    scope.scope?.name ||
    scope.scopeId ||
    '—'
  )
}

export function getScopedRuleScopeLabel(rule = {}) {
  return `${String(rule.scopeType || '').toUpperCase()} '${getScopeOptionLabel(rule.scope || rule)}'`
}

export function buildScopedOverrideSections({ roles = [], permissions = [], rules = [] } = {}) {
  return roles.map((role) => {
    const defaultPermissionIds = getPermissionIdsFromRole(role)
    const roleRules = rules.filter((rule) => rule.roleId === role.id)

    return {
      role,
      roleId: role.id,
      roleCode: getOverrideRoleCode(role),
      roleName: getOverrideRoleName(role),
      defaultPermissionIds,
      defaultPermissions: permissions.filter((permission) =>
        defaultPermissionIds.includes(permission.id),
      ),
      overrideGroups: roleRules.map((rule) => ({
        ...rule,
        scopeLabel: getScopedRuleScopeLabel(rule),
        permissions:
          rule.permissionDetails?.length > 0
            ? rule.permissionDetails
            : permissions.filter((permission) =>
                (rule.permissionIds ?? []).includes(permission.id),
              ),
      })),
    }
  })
}

export function getAvailableOverridePermissions({ permissions = [] } = {}) {
  return permissions
}

export function buildScopedRulePayload({ role, scope, permissionIds = [] }) {
  return {
    roleId: role?.id || role?.roleId,
    scopeType: scope?.scopeType,
    scopeId: scope?.scopeId || scope?.resourceId || scope?.id,
    permissionIds: unique(permissionIds),
  }
}
