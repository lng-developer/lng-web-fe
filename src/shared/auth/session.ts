let accessToken: string | null = null
let permissions: string[] = []
let expirationAnnounced = false
export const SESSION_EXPIRED_EVENT = 'auth:session-expired'
export const getAccessToken = () => accessToken
export const getPermissions = () => permissions
export const setPermissions = (nextPermissions: string[]) => {
  permissions = nextPermissions
}
export const setAccessToken = (token: string | null) => {
  accessToken = token
  if (token) expirationAnnounced = false
  if (!token) permissions = []
}

export const expireSession = () => {
  setAccessToken(null)
  if (expirationAnnounced) return
  expirationAnnounced = true
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}
