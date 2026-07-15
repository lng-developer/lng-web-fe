function collectPermissionCodes(value, target) {
  if (!value) {
    return
  }

  if (typeof value === 'string') {
    target.add(value)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectPermissionCodes(item, target))
    return
  }

  if (typeof value === 'object') {
    if (typeof value.code === 'string') {
      target.add(value.code)
    }

    collectPermissionCodes(value.permissions, target)
    collectPermissionCodes(value.customPermissions, target)
    collectPermissionCodes(value.role, target)
  }
}

export function getUserPermissionCodes(user) {
  const codes = new Set()

  collectPermissionCodes(user?.permissions, codes)
  collectPermissionCodes(user?.roles, codes)
  collectPermissionCodes(user?.scopes, codes)
  collectPermissionCodes(user?.accessAssignments, codes)
  collectPermissionCodes(user?.assignments, codes)

  return Array.from(codes)
}

export function hasRequiredPermissions(user, requiredPermissions = []) {
  if (!requiredPermissions.length) {
    return true
  }

  const permissionCodes = new Set(getUserPermissionCodes(user))

  return requiredPermissions.every((permission) => permissionCodes.has(permission))
}
