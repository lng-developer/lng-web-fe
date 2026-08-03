import { describe, expect, it } from 'vitest'

import {
  getAvailableCores,
  getContextNavigation,
  getCoreForPath,
  getDefaultWorkspacePath,
  getNavigationGroupForItem,
} from '@/app/layout/appNavigation'
import type { CurrentAccount } from '@/features/auth/api/authApi'

const account = (permissions: string[], scopedPermissions: string[] = []): CurrentAccount => ({
  account: { id: 'account-1', email: 'user@lng.co', mustChangePassword: false },
  roles: [],
  permissions,
  scopes: scopedPermissions.length
    ? [
        {
          assignmentId: 'assignment-1',
          scopeType: 'team',
          scopeId: 'team-1',
          resourceId: 'team-1',
          roles: [],
          permissions: scopedPermissions,
        },
      ]
    : [],
  profileSetupRequired: false,
})

describe('app navigation', () => {
  it('shows only cores backed by permitted routes', () => {
    expect(getAvailableCores(account(['SHOPS:READ'])).map(({ key }) => key)).toEqual(['portal'])
    expect(getAvailableCores(account(['HR_ATTENDANCE:WRITE'])).map(({ key }) => key)).toEqual([
      'hr',
    ])
    expect(getAvailableCores(account(['AUTH:READ'])).map(({ key }) => key)).toEqual(['system'])
    expect(getAvailableCores(account(['AUDIT:READ'])).map(({ key }) => key)).toEqual(['system'])
    expect(
      getAvailableCores(account(['HR_ATTENDANCE:WRITE', 'AUTH:READ'])).map(({ key }) => key),
    ).toEqual(['hr', 'system'])
  })

  it('shows the audit log only to audit readers', () => {
    expect(getContextNavigation('system', account(['AUDIT:READ']))[0]?.items).toEqual([
      { key: 'audit-log', path: '/auth/audit-log', labelKey: 'shell.navigation.auditLog' },
    ])
    expect(getContextNavigation('system', account(['AUTH:READ']))[0]?.items).not.toContainEqual(
      expect.objectContaining({ key: 'audit-log' }),
    )
  })

  it('maps nested organization and account routes to their owning core', () => {
    expect(getCoreForPath('/portal/shops')).toBe('portal')
    expect(getCoreForPath('/organization')).toBe('hr')
    expect(getCoreForPath('/auth/accounts/account-1')).toBe('system')
    expect(getCoreForPath('/auth/access-control')).toBe('system')
  })

  it('shows Shop configuration only when the caller can read Shops', () => {
    expect(getContextNavigation('portal', account(['SHOPS:READ']))).toMatchObject([
      { key: 'configuration', items: [{ key: 'shops', path: '/portal/shops' }] },
    ])
    expect(getAvailableCores(account([])).map(({ key }) => key)).not.toContain('portal')
  })

  it('shows Vendor configuration only when the caller can read Vendors', () => {
    expect(getContextNavigation('portal', account(['VENDORS:READ']))).toMatchObject([
      { key: 'configuration', items: [{ key: 'vendors', path: '/portal/vendors' }] },
    ])
    expect(getContextNavigation('portal', account(['SHOPS:READ']))[0]?.items).not.toContainEqual(
      expect.objectContaining({ key: 'vendors' }),
    )
  })

  it('does not expose global-only Vendor navigation from scoped permissions', () => {
    expect(getContextNavigation('portal', account([], ['VENDORS:READ']))).toEqual([])
    expect(getAvailableCores(account([], ['VENDORS:WRITE'])).map(({ key }) => key)).not.toContain(
      'portal',
    )
  })

  it('exposes Media only from global MEDIA:READ', () => {
    expect(getContextNavigation('portal', account(['MEDIA:READ']))[0]?.items).toContainEqual({
      key: 'media',
      path: '/portal/media',
      labelKey: 'shell.navigation.media',
    })
    expect(getContextNavigation('portal', account([], ['MEDIA:READ']))).toEqual([])
  })

  it('keeps Shops before Vendors when both configuration permissions are granted', () => {
    expect(
      getContextNavigation('portal', account(['SHOPS:READ', 'VENDORS:READ']))[0]?.items,
    ).toEqual([
      { key: 'shops', path: '/portal/shops', labelKey: 'shell.navigation.shops' },
      { key: 'vendors', path: '/portal/vendors', labelKey: 'shell.navigation.vendors' },
    ])
  })

  it('shows Catalog for global or scoped readers and writers', () => {
    for (const permission of ['CATALOG:READ', 'CATALOG:WRITE']) {
      expect(getContextNavigation('portal', account([permission]))[0]?.items).toContainEqual({
        key: 'catalog',
        path: '/portal/catalog',
        labelKey: 'shell.navigation.catalog',
      })
      expect(getContextNavigation('portal', account([], [permission]))[0]?.items).toContainEqual({
        key: 'catalog',
        path: '/portal/catalog',
        labelKey: 'shell.navigation.catalog',
      })
    }
  })

  it('groups external order imports under Portal Operations for order readers and writers', () => {
    for (const permission of ['ORDERS:READ', 'ORDERS:WRITE']) {
      expect(getContextNavigation('portal', account([permission]))).toEqual([
        {
          key: 'operations',
          labelKey: 'shell.groups.portalOperations',
          items: [
            {
              key: 'orders',
              path: '/portal/orders',
              labelKey: 'shell.navigation.orders',
            },
            {
              key: 'integrations',
              path: '/portal/integrations',
              labelKey: 'shell.navigation.integrations',
            },
          ],
        },
      ])
    }
  })

  it('shows Work Scores only from scoring or own-work permissions', () => {
    for (const permission of ['WORK_SCORES:READ', 'WORK_SCORES:ADJUST', 'DESIGN:WORK']) {
      expect(getContextNavigation('portal', account([], [permission]))[0]?.items).toContainEqual({
        key: 'work-scores',
        path: '/portal/work-scores',
        labelKey: 'shell.navigation.workScores',
      })
    }
    expect(getContextNavigation('portal', account(['ORDERS:READ']))[0]?.items).not.toContainEqual(
      expect.objectContaining({ key: 'work-scores' }),
    )
  })

  it('shows Mapping only for global or scoped mapping access', () => {
    for (const permission of ['MAPPING:READ', 'MAPPING:WRITE']) {
      const expected = ['/portal/mapping']
      expect(
        getContextNavigation('portal', account([permission]))[0]?.items.map(({ path }) => path),
      ).toEqual(expected)
      expect(
        getContextNavigation('portal', account([], [permission]))[0]?.items.map(({ path }) => path),
      ).toEqual(expected)
    }
    expect(getContextNavigation('portal', account(['ORDERS:READ']))[0]?.items).not.toContainEqual(
      expect.objectContaining({ key: 'mapping' }),
    )
  })

  it('shows shipment operations for global or scoped shipment readers', () => {
    expect(getContextNavigation('portal', account(['SHIPMENTS:READ']))[0]?.items).toContainEqual({
      key: 'shipments',
      path: '/portal/shipments',
      labelKey: 'shell.navigation.shipments',
    })
    expect(
      getContextNavigation('portal', account([], ['SHIPMENTS:READ']))[0]?.items,
    ).toContainEqual(expect.objectContaining({ key: 'shipments' }))
  })

  it('exposes Portal Operations for scoped order access and keeps it separate from configuration', () => {
    const scopedWriter = account([], ['ORDERS:WRITE'])
    scopedWriter.scopes[0] = {
      ...scopedWriter.scopes[0],
      scopeType: 'shop',
      scopeId: 'shop-1',
      resourceId: 'shop-1',
    }

    expect(getAvailableCores(scopedWriter).map(({ key }) => key)).toContain('portal')
    expect(getDefaultWorkspacePath(scopedWriter)).toBe('/portal/orders')
    expect(
      getContextNavigation('portal', account(['SHOPS:READ', 'ORDERS:READ'])).map(({ key }) => key),
    ).toEqual(['configuration', 'operations'])
  })

  it('shows Shop configuration for an exact Shop-scoped reader', () => {
    const shopReader = account([], ['SHOPS:READ'])
    shopReader.scopes[0] = {
      ...shopReader.scopes[0],
      scopeType: 'shop',
      scopeId: 'shop-1',
      resourceId: 'shop-1',
    }

    expect(getAvailableCores(shopReader).map(({ key }) => key)).toContain('portal')
    expect(getContextNavigation('portal', shopReader)[0]?.items[0]?.path).toBe('/portal/shops')
  })

  it('keeps staff navigation personal and exposes scoped manager groups', () => {
    expect(
      getContextNavigation('hr', account(['HR_ATTENDANCE:WRITE'])).map(({ key }) => key),
    ).toEqual(['personal'])
    expect(
      getContextNavigation('hr', account([], ['HR_ATTENDANCE:READ'])).map(({ key }) => key),
    ).toEqual(['team'])
  })

  it('groups organization under HR and chooses the first permitted route', () => {
    const organizationAccount = account(['DEPARTMENTS:READ'])
    expect(getContextNavigation('hr', organizationAccount)).toMatchObject([
      { key: 'operations', items: [{ path: '/organization' }] },
    ])
    expect(getDefaultWorkspacePath(organizationAccount)).toBe('/organization')
  })

  it('shows read-only HR operations when employee read access is granted', () => {
    const groups = getContextNavigation('hr', account(['HR_EMPLOYEES:READ']))
    expect(groups.find(({ key }) => key === 'operations')?.items).toContainEqual(
      expect.objectContaining({
        key: 'operations-employees',
        path: '/hr/operations/employees',
      }),
    )
  })

  it('chooses the highest-priority HR workspace on first visit', () => {
    expect(getDefaultWorkspacePath(account(['HR_EMPLOYEES:READ', 'HR_ATTENDANCE:WRITE']))).toBe(
      '/hr/operations',
    )
    expect(getDefaultWorkspacePath(account(['HR_PAYROLL:READ', 'HR_ATTENDANCE:WRITE']))).toBe(
      '/hr/payroll',
    )
    expect(getDefaultWorkspacePath(account(['HR_ATTENDANCE:READ', 'HR_ATTENDANCE:WRITE']))).toBe(
      '/hr/team',
    )
    expect(getDefaultWorkspacePath(account(['HR_ATTENDANCE:WRITE']))).toBe('/hr/me')
    expect(getDefaultWorkspacePath(account(['AUTH:READ']))).toBe('/auth/accounts')
  })

  it('finds the workspace group that owns a navigation item', () => {
    const groups = getContextNavigation('hr', account(['HR_LEAVE:READ']))
    expect(getNavigationGroupForItem(groups, 'team-approvals')).toBe('team')
    expect(getNavigationGroupForItem(groups, 'missing')).toBeUndefined()
  })

  it('uses context-specific labels for each HR workspace root', () => {
    const groups = getContextNavigation(
      'hr',
      account(['HR_ATTENDANCE:WRITE', 'HR_ATTENDANCE:READ', 'HR_EMPLOYEES:READ']),
    )
    expect(groups.find(({ key }) => key === 'personal')?.items[0].labelKey).toBe(
      'shell.navigation.myDay',
    )
    expect(groups.find(({ key }) => key === 'team')?.items[0].labelKey).toBe(
      'shell.navigation.teamOverview',
    )
    expect(groups.find(({ key }) => key === 'operations')?.items[0].labelKey).toBe(
      'shell.navigation.hrOverview',
    )
  })
})
