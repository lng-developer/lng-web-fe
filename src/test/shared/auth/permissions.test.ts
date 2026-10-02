import { afterEach, describe, expect, it } from 'vitest'

import { hasAnyPermission } from '@/shared/auth/permissions'
import { setGlobalPermissions, setPermissions, setRoles } from '@/shared/auth/session'

describe('hasAnyPermission', () => {
  afterEach(() => {
    setRoles([])
    setPermissions([])
    setGlobalPermissions([])
  })

  it('does not treat ADMIN as a bypass role', () => {
    setRoles(['ADMIN'])

    expect(hasAnyPermission(['AUTH:WRITE'], { globalOnly: true })).toBe(false)
  })

  it('does not treat a legacy super-admin label as a bypass role', () => {
    setRoles(['SUPER ADMIN'])

    expect(hasAnyPermission(['AUTH:WRITE'], { globalOnly: true })).toBe(false)
  })

  it('treats SUPER_ADMIN as a bypass role', () => {
    setRoles(['SUPER_ADMIN'])

    expect(hasAnyPermission(['AUTH:WRITE'], { globalOnly: true })).toBe(true)
  })
})
