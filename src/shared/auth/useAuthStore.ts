import { create } from 'zustand'

export type SessionAccount = {
  id: string
  email: string
  passwordSetupRequired?: boolean
}

export interface AuthState {
  accessToken: string | null
  roles: string[]
  permissions: string[]
  globalPermissions: string[]
  account: SessionAccount | null
  globalPermissionsHydrated: boolean
  setAuthData: (data: Partial<Omit<AuthState, 'setAuthData' | 'reset'>>) => void
  reset: () => void
}

const initialState: Omit<AuthState, 'setAuthData' | 'reset'> = {
  accessToken: null,
  roles: [],
  permissions: [],
  globalPermissions: [],
  account: null,
  globalPermissionsHydrated: false,
}

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,
  setAuthData: (data) => set((state) => ({ ...state, ...data })),
  reset: () => set(initialState),
}))

export const usePermissions = () => useAuthStore((s) => s.permissions)
export const useRoles = () => useAuthStore((s) => s.roles)
export const useGlobalPermissions = () => useAuthStore((s) => s.globalPermissions)
export const useCurrentAccount = () => useAuthStore((s) => s.account)
export const useAccessToken = () => useAuthStore((s) => s.accessToken)
export const useIsAuthenticated = () => useAuthStore((s) => Boolean(s.accessToken))
