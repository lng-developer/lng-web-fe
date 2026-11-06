import { type SessionAccount, useAuthStore } from './useAuthStore'

export type { SessionAccount }

let accessToken: string | null = null
let roles: string[] = []
let permissions: string[] = []
let globalPermissions: string[] = []
let account: SessionAccount | null = null
let globalPermissionsHydrated = false
let expirationAnnounced = false
let refreshSessionAvailable = false
const refreshSessionFlag = 'lng.refreshSession'
export const SESSION_EXPIRED_EVENT = 'auth:session-expired'

useAuthStore.subscribe((state) => {
  accessToken = state.accessToken
  roles = state.roles
  permissions = state.permissions
  globalPermissions = state.globalPermissions
  account = state.account
  globalPermissionsHydrated = state.globalPermissionsHydrated
})

export const getAccessToken = () => accessToken
export const getRoles = () => roles
export const getPermissions = () => permissions
export const getGlobalPermissions = () => globalPermissions
export const getAccount = () => account
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
  useAuthStore.getState().setAuthData({ roles: nextRoles })
}
export const setPermissions = (nextPermissions: string[]) => {
  permissions = nextPermissions
  useAuthStore.getState().setAuthData({ permissions: nextPermissions })
}
export const setGlobalPermissions = (nextPermissions: string[]) => {
  globalPermissions = nextPermissions
  globalPermissionsHydrated = true
  useAuthStore.getState().setAuthData({
    globalPermissions: nextPermissions,
    globalPermissionsHydrated: true,
  })
}
export const setAccount = (nextAccount: SessionAccount | null) => {
  account = nextAccount
  useAuthStore.getState().setAuthData({ account: nextAccount })
}
export const setAccessToken = (token: string | null) => {
  accessToken = token
  if (token) {
    expirationAnnounced = false
    useAuthStore.getState().setAuthData({ accessToken: token })
  } else {
    roles = []
    permissions = []
    globalPermissions = []
    account = null
    globalPermissionsHydrated = false
    useAuthStore.getState().reset()
  }
}

export const expireSession = () => {
  setAccessToken(null)
  setHasRefreshSession(false)
  useAuthStore.getState().reset()
  if (expirationAnnounced) return
  expirationAnnounced = true
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  }
}
