import { hasAnyPermission } from '../../auth/utils/authz.js'

export const RBAC_PERMISSIONS = Object.freeze({
  READ: 'AUTH:READ',
  WRITE: 'AUTH:WRITE',
})

export function getRbacCapabilities(user) {
  return {
    canRead: hasAnyPermission(user, [RBAC_PERMISSIONS.READ]),
    canWrite: hasAnyPermission(user, [RBAC_PERMISSIONS.WRITE]),
  }
}
