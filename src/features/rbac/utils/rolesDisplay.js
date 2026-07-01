export function getDefaultPermissionMeta(role = {}, totalPermissionCount = 0) {
  if (role.isFullAccess) {
    return {
      key: 'rbac.roles.fullAccess',
      count: totalPermissionCount,
    }
  }

  return {
    key: 'rbac.roles.permissionCount',
    count: Number(
      role.defaultPermissionCount ?? role.permissionCount ?? role.permissions?.length ?? 0,
    ),
  }
}

export function getRolePermissionIds(role = {}) {
  if (!role) return []

  if (Array.isArray(role.permissions) && role.permissions.length > 0) {
    return role.permissions.map((permission) =>
      typeof permission === 'string' ? permission : permission.id || permission.permissionId,
    )
  }

  if (Array.isArray(role.permissionDetails)) {
    return role.permissionDetails.map((permission) => permission.id || permission.permissionId)
  }

  return []
}

export function groupPermissionsByModule(permissions = []) {
  const grouped = permissions.reduce((items, permission) => {
    const moduleName = `${permission.module || 'OTHER'} MODULE`
    return {
      ...items,
      [moduleName]: [...(items[moduleName] ?? []), permission],
    }
  }, {})

  return Object.entries(grouped).map(([module, modulePermissions]) => ({
    module,
    permissions: modulePermissions,
  }))
}

export function filterPermissionsForRole(permissions = [], search = '') {
  const keyword = search.trim().toLowerCase()

  if (!keyword) return permissions

  return permissions.filter((permission) =>
    [permission.name, permission.code].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(keyword),
    ),
  )
}
