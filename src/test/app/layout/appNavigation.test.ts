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
const portalItems = (permissions: string[], scopedPermissions: string[] = []) =>
  getContextNavigation('portal', account(permissions, scopedPermissions)).flatMap(
    ({ items }) => items,
  )

describe('app navigation', () => {
  it('shows only cores backed by permitted routes', () => {
    expect(getAvailableCores(account(['SHOPS:READ'])).map(({ key }) => key)).toEqual([
      'portal',
      'hr',
    ])
    expect(getAvailableCores(account(['HR_ATTENDANCE:WRITE'])).map(({ key }) => key)).toEqual([
      'hr',
    ])
    expect(getAvailableCores(account(['AUTH:READ'])).map(({ key }) => key)).toEqual([
      'hr',
      'system',
    ])
    expect(getAvailableCores(account(['AUDIT:READ'])).map(({ key }) => key)).toEqual([
      'hr',
      'system',
    ])
    expect(
      getAvailableCores(account(['HR_ATTENDANCE:WRITE', 'AUTH:READ'])).map(({ key }) => key),
    ).toEqual(['hr', 'system'])
  })

  it('shows the audit log only to audit readers', () => {
    expect(getContextNavigation('system', account(['AUDIT:READ']))[0]?.items).toEqual([
      { key: 'audit-log', path: '/auth/audit-log', labelKey: 'shell.navigation.auditLog' },
      { key: 'monitoring', path: '/auth/monitoring', labelKey: 'shell.navigation.monitoring' },
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
    expect(portalItems(['SHOPS:READ'])).toContainEqual({
      key: 'shops',
      path: '/portal/shops',
      labelKey: 'shell.navigation.shops',
    })
    expect(getContextNavigation('portal', account(['SHOPS:READ']))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'setup',
          items: expect.arrayContaining([
            expect.objectContaining({ key: 'shops', path: '/portal/shops' }),
          ]),
        }),
      ]),
    )
    expect(getAvailableCores(account([])).map(({ key }) => key)).toEqual(['hr'])
  })

  it('shows Vendor configuration only when the caller can read Vendors', () => {
    expect(portalItems(['VENDORS:READ'])).toContainEqual({
      key: 'vendors',
      path: '/portal/vendors',
      labelKey: 'shell.navigation.vendors',
    })
    expect(getContextNavigation('portal', account(['SHOPS:READ']))[0]?.items).not.toContainEqual(
      expect.objectContaining({ key: 'vendors' }),
    )
  })

  it('does not expose global-only Vendor navigation from scoped permissions', () => {
    expect(portalItems([], ['VENDORS:READ'])).not.toContainEqual(
      expect.objectContaining({ key: 'vendors' }),
    )
    expect(getAvailableCores(account([], ['VENDORS:WRITE'])).map(({ key }) => key)).not.toContain(
      'portal',
    )
  })

  it('exposes Media only from global MEDIA:READ', () => {
    expect(portalItems(['MEDIA:READ'])).toContainEqual({
      key: 'media',
      path: '/portal/media',
      labelKey: 'shell.navigation.media',
    })
    expect(portalItems([], ['MEDIA:READ'])).not.toContainEqual(
      expect.objectContaining({ key: 'media' }),
    )
  })

  it('keeps Shops before Vendors when both configuration permissions are granted', () => {
    expect(
      getContextNavigation('portal', account(['SHOPS:READ', 'VENDORS:READ'])).find(
        ({ key }) => key === 'setup',
      )?.items,
    ).toEqual([
      { key: 'shops', path: '/portal/shops', labelKey: 'shell.navigation.shops' },
      { key: 'vendors', path: '/portal/vendors', labelKey: 'shell.navigation.vendors' },
    ])
  })

  it('groups Portal navigation by the operational workflow', () => {
    const groups = getContextNavigation(
      'portal',
      account([
        'SHOPS:READ',
        'CATALOG:READ',
        'VENDORS:READ',
        'MEDIA:READ',
        'ORDERS:READ',
        'MAPPING:READ',
        'DESIGN:READ',
        'PRODUCTION:READ',
        'VENDOR_SUBMISSIONS:READ',
        'SHIPMENTS:READ',
        'FINANCE:READ',
        'REPORTS:READ',
        'WORK_SCORES:READ',
      ]),
    )

    expect(groups.map(({ key }) => key)).toEqual([
      'setup',
      'order-workflow',
      'fulfillment',
      'performance',
    ])
    expect(groups.find(({ key }) => key === 'setup')?.items.map(({ key }) => key)).toEqual([
      'shops',
      'catalog',
      'vendors',
      'media',
    ])
    expect(groups.find(({ key }) => key === 'order-workflow')?.items.map(({ key }) => key)).toEqual(
      ['orders', 'customizations', 'mapping', 'integrations'],
    )
    expect(groups.find(({ key }) => key === 'fulfillment')?.items.map(({ key }) => key)).toEqual([
      'design',
      'production',
      'vendor-submissions',
      'shipments',
    ])
    expect(groups.find(({ key }) => key === 'performance')?.items.map(({ key }) => key)).toEqual([
      'finance',
      'reports',
      'work-scores',
    ])
  })

  it('shows Catalog for global or scoped readers and writers', () => {
    for (const permission of ['CATALOG:READ', 'CATALOG:WRITE']) {
      expect(portalItems([permission])).toContainEqual({
        key: 'catalog',
        path: '/portal/catalog',
        labelKey: 'shell.navigation.catalog',
      })
      expect(portalItems([], [permission])).toContainEqual({
        key: 'catalog',
        path: '/portal/catalog',
        labelKey: 'shell.navigation.catalog',
      })
    }
  })

  it('groups external order imports under the order workflow for order readers and writers', () => {
    for (const permission of ['ORDERS:READ', 'ORDERS:WRITE']) {
      expect(getContextNavigation('portal', account([permission]))).toEqual([
        {
          key: 'order-workflow',
          labelKey: 'shell.groups.portalOrderWorkflow',
          items: [
            {
              key: 'orders',
              path: '/portal/orders',
              labelKey: 'shell.navigation.orders',
            },
            {
              key: 'customizations',
              path: '/portal/customizations',
              labelKey: 'shell.navigation.customizations',
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
      expect(
        getContextNavigation('portal', account([], [permission])).flatMap(({ items }) => items),
      ).toContainEqual({
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
        portalItems([permission])
          .filter(({ key }) => key === 'mapping')
          .map(({ path }) => path),
      ).toEqual(expected)
      expect(
        portalItems([], [permission])
          .filter(({ key }) => key === 'mapping')
          .map(({ path }) => path),
      ).toEqual(expected)
    }
    expect(getContextNavigation('portal', account(['ORDERS:READ']))[0]?.items).not.toContainEqual(
      expect.objectContaining({ key: 'mapping' }),
    )
  })

  it('shows shipment operations for global or scoped shipment readers', () => {
    expect(portalItems(['SHIPMENTS:READ'])).toContainEqual({
      key: 'shipments',
      path: '/portal/shipments',
      labelKey: 'shell.navigation.shipments',
    })
    expect(portalItems([], ['SHIPMENTS:READ'])).toContainEqual(
      expect.objectContaining({ key: 'shipments' }),
    )
  })

  it('shows Reports for global or scoped report readers', () => {
    for (const scoped of [false, true]) {
      const items = scoped ? portalItems([], ['REPORTS:READ']) : portalItems(['REPORTS:READ'])
      expect(items).toContainEqual({
        key: 'reports',
        path: '/portal/reports',
        labelKey: 'shell.navigation.reports',
      })
    }
  })

  it('exposes the order workflow for scoped order access and keeps it separate from setup', () => {
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
    ).toEqual(['setup', 'order-workflow'])
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
    expect(portalItems([], ['SHOPS:READ'])).toContainEqual(
      expect.objectContaining({ path: '/portal/shops' }),
    )
  })

  it('keeps staff navigation personal and exposes scoped manager groups', () => {
    expect(getContextNavigation('hr', account([])).map(({ key }) => key)).toEqual(['personal'])
    expect(
      getContextNavigation('hr', account(['HR_ATTENDANCE:WRITE'])).map(({ key }) => key),
    ).toEqual(['personal'])
    expect(
      getContextNavigation('hr', account([], ['HR_ATTENDANCE:READ'])).map(({ key }) => key),
    ).toEqual(['personal', 'team'])
  })

  it('groups organization under HR and chooses the first permitted route', () => {
    const organizationAccount = account(['DEPARTMENTS:READ'])
    expect(getContextNavigation('hr', organizationAccount)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'operations',
          items: [
            {
              key: 'organization',
              path: '/organization',
              labelKey: 'shell.navigation.organization',
            },
          ],
        }),
      ]),
    )
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
    expect(getDefaultWorkspacePath(account([]))).toBe('/hr/me')
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
