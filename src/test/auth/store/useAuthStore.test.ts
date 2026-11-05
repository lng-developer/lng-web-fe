// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useHasAnyPermission } from '@/shared/auth/permissions'
import {
  expireSession,
  getAccessToken,
  getAccount,
  getGlobalPermissions,
  getPermissions,
  getRoles,
  hasHydratedGlobalPermissions,
  setAccessToken,
  setAccount,
  setGlobalPermissions,
  setPermissions,
  setRoles,
} from '@/shared/auth/session'
import {
  useAccessToken,
  useAuthStore,
  useCurrentAccount,
  useGlobalPermissions,
  useIsAuthenticated,
  usePermissions,
  useRoles,
} from '@/shared/auth/useAuthStore'

describe('useAuthStore & reactive session', () => {
  beforeEach(() => {
    act(() => {
      expireSession()
    })
  })

  it('has initial default state', () => {
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.roles).toEqual([])
    expect(state.permissions).toEqual([])
    expect(state.globalPermissions).toEqual([])
    expect(state.account).toBeNull()
    expect(state.globalPermissionsHydrated).toBe(false)

    expect(getAccessToken()).toBeNull()
    expect(getRoles()).toEqual([])
    expect(getPermissions()).toEqual([])
    expect(getGlobalPermissions()).toEqual([])
    expect(getAccount()).toBeNull()
    expect(hasHydratedGlobalPermissions()).toBe(false)
  })

  it('updates useAuthStore state when session setters are called', () => {
    act(() => {
      setAccessToken('token-123')
      setRoles(['STAFF'])
      setPermissions(['ORDERS:READ', 'ORDERS:WRITE'])
      setGlobalPermissions(['GLOBAL:ADMIN'])
      setAccount({ id: 'acc-1', email: 'user@test.com' })
    })

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('token-123')
    expect(state.roles).toEqual(['STAFF'])
    expect(state.permissions).toEqual(['ORDERS:READ', 'ORDERS:WRITE'])
    expect(state.globalPermissions).toEqual(['GLOBAL:ADMIN'])
    expect(state.globalPermissionsHydrated).toBe(true)
    expect(state.account).toEqual({ id: 'acc-1', email: 'user@test.com' })

    // Also check session getters
    expect(getAccessToken()).toBe('token-123')
    expect(getRoles()).toEqual(['STAFF'])
    expect(getPermissions()).toEqual(['ORDERS:READ', 'ORDERS:WRITE'])
    expect(getGlobalPermissions()).toEqual(['GLOBAL:ADMIN'])
    expect(hasHydratedGlobalPermissions()).toBe(true)
    expect(getAccount()).toEqual({ id: 'acc-1', email: 'user@test.com' })
  })

  it('syncs back to session getters when store setAuthData is called directly', () => {
    act(() => {
      useAuthStore.getState().setAuthData({
        accessToken: 'direct-token',
        roles: ['MANAGER'],
        permissions: ['HR_EMPLOYEES:READ'],
      })
    })

    expect(getAccessToken()).toBe('direct-token')
    expect(getRoles()).toEqual(['MANAGER'])
    expect(getPermissions()).toEqual(['HR_EMPLOYEES:READ'])
  })

  it('resets state on expireSession()', () => {
    act(() => {
      setAccessToken('token-xyz')
      setRoles(['STAFF'])
      setPermissions(['AUDIT:READ'])
      setAccount({ id: 'acc-2', email: 'admin@test.com' })
    })

    expect(useAuthStore.getState().accessToken).toBe('token-xyz')

    act(() => {
      expireSession()
    })

    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.roles).toEqual([])
    expect(state.permissions).toEqual([])
    expect(state.account).toBeNull()
    expect(getAccessToken()).toBeNull()
    expect(getRoles()).toEqual([])
    expect(getPermissions()).toEqual([])
    expect(getAccount()).toBeNull()
  })

  it('resets state when setAccessToken(null) is called', () => {
    act(() => {
      setAccessToken('token-xyz')
      setPermissions(['AUDIT:READ'])
    })

    expect(useAuthStore.getState().permissions).toEqual(['AUDIT:READ'])

    act(() => {
      setAccessToken(null)
    })

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().permissions).toEqual([])
  })

  it('provides reactive hooks for store state', () => {
    const { result: permissionsHook } = renderHook(() => usePermissions())
    const { result: rolesHook } = renderHook(() => useRoles())
    const { result: globalPermissionsHook } = renderHook(() => useGlobalPermissions())
    const { result: accountHook } = renderHook(() => useCurrentAccount())
    const { result: tokenHook } = renderHook(() => useAccessToken())
    const { result: isAuthHook } = renderHook(() => useIsAuthenticated())

    expect(permissionsHook.current).toEqual([])
    expect(rolesHook.current).toEqual([])
    expect(globalPermissionsHook.current).toEqual([])
    expect(accountHook.current).toBeNull()
    expect(tokenHook.current).toBeNull()
    expect(isAuthHook.current).toBe(false)

    act(() => {
      setAccessToken('reactive-token')
      setRoles(['OPERATOR'])
      setPermissions(['SHIPMENT:READ'])
      setGlobalPermissions(['ALL'])
      setAccount({ id: 'acc-3', email: 'op@test.com' })
    })

    expect(permissionsHook.current).toEqual(['SHIPMENT:READ'])
    expect(rolesHook.current).toEqual(['OPERATOR'])
    expect(globalPermissionsHook.current).toEqual(['ALL'])
    expect(accountHook.current).toEqual({ id: 'acc-3', email: 'op@test.com' })
    expect(tokenHook.current).toBe('reactive-token')
    expect(isAuthHook.current).toBe(true)
  })

  describe('useHasAnyPermission', () => {
    it('returns false when required permissions are not held', () => {
      const { result } = renderHook(() => useHasAnyPermission(['AUDIT:READ']))
      expect(result.current).toBe(false)
    })

    it('reacts when permissions are granted', () => {
      const { result } = renderHook(() => useHasAnyPermission(['AUDIT:READ']))
      expect(result.current).toBe(false)

      act(() => {
        setPermissions(['AUDIT:READ'])
      })

      expect(result.current).toBe(true)
    })

    it('returns true when user has SUPER_ADMIN role (case-insensitive)', () => {
      const { result } = renderHook(() => useHasAnyPermission(['RANDOM:UNKNOWN']))
      expect(result.current).toBe(false)

      act(() => {
        setRoles(['super_admin'])
      })

      expect(result.current).toBe(true)
    })

    it('respects globalOnly flag when global permissions are hydrated', () => {
      act(() => {
        setPermissions(['PORTAL:READ'])
        setGlobalPermissions(['GLOBAL:VIEW'])
      })

      const { result: localResult } = renderHook(() =>
        useHasAnyPermission(['PORTAL:READ'], { globalOnly: true }),
      )
      const { result: globalResult } = renderHook(() =>
        useHasAnyPermission(['GLOBAL:VIEW'], { globalOnly: true }),
      )

      expect(localResult.current).toBe(false)
      expect(globalResult.current).toBe(true)
    })
  })
})
