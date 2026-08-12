let accessToken: string | null = null
let roles: string[] = []
let permissions: string[] = []
let globalPermissions: string[] = []
let globalPermissionsHydrated = false
let expirationAnnounced = false
let refreshSessionAvailable = false
const refreshSessionFlag = 'lng.refreshSession'
export const SESSION_EXPIRED_EVENT = 'auth:session-expired'
export const getAccessToken = () => accessToken
export const getRoles = () => roles
export const getPermissions = () => permissions
export const getGlobalPermissions = () => globalPermissions
export const hasHydratedGlobalPermissions = () => globalPermissionsHydrated
export const hasRefreshSession = () => {
  if (typeof window === 'undefined') return refreshSessionAvailable
  return window.localStorage.getItem(refreshSessionFlag) === '1'
}
export const setHasRefreshSession = (value: boolean) => {
  refreshSessionAvailable = value
  if (typeof window === 'undefined') return
  if (value) window.localStorage.setItem(refreshSessionFlag, '1')
  else window.localStorage.removeItem(refreshSessionFlag)
}
export const setRoles = (nextRoles: string[]) => {
  roles = nextRoles
}
export const setPermissions = (nextPermissions: string[]) => {
  permissions = nextPermissions
}
export const setGlobalPermissions = (nextPermissions: string[]) => {
  globalPermissions = nextPermissions
  globalPermissionsHydrated = true
}
export const setAccessToken = (token: string | null) => {
  accessToken = token
  if (token) expirationAnnounced = false
  if (!token) {
    roles = []
    permissions = []
    globalPermissions = []
    globalPermissionsHydrated = false
  }
}

export const expireSession = () => {
  setAccessToken(null)
  setHasRefreshSession(false)
  if (expirationAnnounced) return
  expirationAnnounced = true
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}
