let accessToken: string | null = null
let roles: string[] = []
let permissions: string[] = []
let globalPermissions: string[] = []
let expirationAnnounced = false
export const SESSION_EXPIRED_EVENT = 'auth:session-expired'
export const getAccessToken = () => accessToken
export const getRoles = () => roles
export const getPermissions = () => permissions
export const getGlobalPermissions = () => globalPermissions
export const setRoles = (nextRoles: string[]) => {
  roles = nextRoles
}
export const setPermissions = (nextPermissions: string[]) => {
  permissions = nextPermissions
}
export const setGlobalPermissions = (nextPermissions: string[]) => {
  globalPermissions = nextPermissions
}
export const setAccessToken = (token: string | null) => {
  accessToken = token
  if (token) expirationAnnounced = false
  if (!token) {
    roles = []
    permissions = []
    globalPermissions = []
  }
}

export const expireSession = () => {
  setAccessToken(null)
  if (expirationAnnounced) return
  expirationAnnounced = true
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}
