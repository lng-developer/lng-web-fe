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
const systemItems = (permissions: string[], scopedPermissions: string[] = []) =>
  getContextNavigation('system', account(permissions, scopedPermissions)).flatMap(
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
    expect(getAvailableCores(account(['MEDIA:READ'])).map(({ key }) => key)).toEqual([
      'hr',
      'system',
    ])
    expect(
      getAvailableCores(account(['HR_ATTENDANCE:WRITE', 'AUTH:READ'])).map(({ key }) => key),
    ).toEqual(['hr', 'system'])
  })

  it('shows the audit log only to audit readers', () => {
    expect(
      getContextNavigation('system', account(['AUDIT:READ'])).find(
        ({ key }) => key === 'monitoring',
      )?.items,
    ).toEqual([
      { key: 'audit-log', path: '/auth/audit-log', labelKey: 'shell.navigation.auditLog' },
      { key: 'monitoring', path: '/auth/monitoring', labelKey: 'shell.navigation.monitoring' },
    ])
    expect(getContextNavigation('system', account(['AUTH:READ']))[0]?.items).not.toContainEqual(
      expect.objectContaining({ key: 'audit-log' }),
    )
  })

  it('maps nested organization and account routes to their owning core', () => {
    expect(getCoreForPath('/portal/shops')).toBe('portal')
    expect(getCoreForPath('/portal/monitoring')).toBe('system')
    expect(getCoreForPath('/portal/audit')).toBe('system')
    expect(getCoreForPath('/portal/media')).toBe('system')
    expect(getCoreForPath('/portal/customers')).toBe('system')
    expect(getCoreForPath('/portal/customizations')).toBe('system')
    expect(getCoreForPath('/portal/work-scores')).toBe('system')
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
          key: 'listing',
          items: expect.arrayContaining([
            expect.objectContaining({ key: 'shops', path: '/portal/shops' }),
          ]),
        }),
      ]),
    )
    expect(getAvailableCores(account([])).map(({ key }) => key)).toEqual(['hr'])
  })

  it('shows Finance navigation to a super administrator', () => {
    const superAdmin = { ...account([]), roles: ['SUPER_ADMIN'] }
    expect(getContextNavigation('portal', superAdmin)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'finance',
          items: expect.arrayContaining([
            expect.objectContaining({ key: 'settlements', path: '/portal/finance/settlements' }),
          ]),
        }),
      ]),
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
    expect(systemItems(['MEDIA:READ'])).toContainEqual({
      key: 'media',
      path: '/portal/media',
      labelKey: 'shell.navigation.media',
    })
    expect(portalItems(['MEDIA:READ'])).not.toContainEqual(
      expect.objectContaining({ key: 'media' }),
    )
    expect(systemItems([], ['MEDIA:READ'])).not.toContainEqual(
      expect.objectContaining({ key: 'media' }),
    )
  })

  it('moves customer and customization workspaces under System navigation', () => {
    expect(systemItems(['CUSTOMERS:READ'])).toContainEqual({
      key: 'customers',
      path: '/portal/customers',
      labelKey: 'shell.navigation.customers',
    })
    expect(systemItems(['ORDERS:READ'])).toContainEqual({
      key: 'customizations',
      path: '/portal/customizations',
      labelKey: 'shell.navigation.customizations',
    })
    expect(portalItems(['CUSTOMERS:READ', 'ORDERS:READ'])).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'customers' }),
        expect.objectContaining({ key: 'customizations' }),
      ]),
    )
  })

  it('groups Portal navigation by the operational workflow', () => {
    const groups = getContextNavigation(
      'portal',
      account([
        'SHOPS:READ',
        'CATALOG:READ',
        'VENDORS:READ',
        'ORDERS:READ',
        'MAPPING:READ',
        'DESIGN:READ',
        'PRODUCTION:READ',
        'VENDOR_SUBMISSIONS:READ',
        'SHIPMENTS:READ',
        'FINANCE:READ',
        'REPORTS:READ',
      ]),
    )

    expect(groups.map(({ key }) => key)).toEqual([
      'dashboard',
      'orders',
      'team-tasks',
      'listing',
      'cost-centers',
      'finance',
      'reports',
    ])
    expect(groups.find(({ key }) => key === 'dashboard')).toEqual({
      key: 'dashboard',
      labelKey: 'shell.navigation.dashboard',
      standalone: true,
      items: [
        {
          key: 'operations-dashboard',
          path: '/portal/dashboard',
          labelKey: 'shell.navigation.dashboard',
        },
      ],
    })
    expect(groups.find(({ key }) => key === 'listing')?.items.map(({ key }) => key)).toEqual([
      'shops',
      'catalog',
    ])
    expect(groups.find(({ key }) => key === 'orders')?.items.map(({ key }) => key)).toEqual([
      'orders',
      'integrations',
    ])
    expect(groups.find(({ key }) => key === 'team-tasks')?.items.map(({ key }) => key)).toEqual([
      'design',
      'production',
      'vendor-submissions',
      'shipments',
    ])
    expect(groups.find(({ key }) => key === 'cost-centers')?.items).toEqual([
      {
        key: 'product-types',
        path: '/portal/catalog/product-types',
        labelKey: 'shell.navigation.productTypes',
      },
      {
        key: 'internal-templates',
        path: '/portal/catalog/templates',
        labelKey: 'shell.navigation.internalTemplates',
      },
      { key: 'mapping', path: '/portal/mapping', labelKey: 'shell.navigation.mapping' },
    ])
    expect(groups.find(({ key }) => key === 'finance')?.items.map(({ key }) => key)).toEqual([
      'finance',
      'settlements',
    ])
    expect(groups.find(({ key }) => key === 'reports')?.items.map(({ key }) => key)).toEqual([
      'reports',
    ])
  })

  it('shows Design Requests only to request permission holders', () => {
    expect(portalItems(['DESIGN:REQUEST_READ']).map(({ key }) => key)).toContain('design-requests')
    expect(portalItems(['DESIGN:READ']).map(({ key }) => key)).not.toContain('design-requests')
  })

  it('gives HR and System their own dashboard entry points', () => {
    expect(getContextNavigation('hr', account(['HR_ATTENDANCE:WRITE']))[0]?.items).toContainEqual({
      key: 'hr-dashboard',
      path: '/hr/dashboard',
      labelKey: 'shell.navigation.dashboard',
    })
    expect(getContextNavigation('system', account(['AUTH:READ']))[0]?.items).toContainEqual({
      key: 'system-dashboard',
      path: '/system/dashboard',
      labelKey: 'shell.navigation.dashboard',
    })
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

  it('groups order operations under Orders for order readers and writers', () => {
    for (const permission of ['ORDERS:READ', 'ORDERS:WRITE']) {
      expect(getContextNavigation('portal', account([permission]))).toEqual([
        {
          key: 'orders',
          labelKey: 'shell.groups.legacyOrders',
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
      expect(
        getContextNavigation('system', account([], [permission])).flatMap(({ items }) => items),
      ).toContainEqual({
        key: 'work-scores',
        path: '/portal/work-scores',
        labelKey: 'shell.navigation.workScores',
      })
    }
    expect(getContextNavigation('system', account(['ORDERS:READ']))[0]?.items).not.toContainEqual(
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

  it('exposes Orders for scoped order access and keeps it separate from Listing', () => {
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
    ).toEqual(['orders', 'listing'])
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
    ).toEqual(['dashboard', 'personal'])
    expect(
      getContextNavigation('hr', account([], ['HR_ATTENDANCE:READ'])).map(({ key }) => key),
    ).toEqual(['dashboard', 'personal', 'team'])
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
      '/hr/dashboard',
    )
    expect(getDefaultWorkspacePath(account(['HR_PAYROLL:READ', 'HR_ATTENDANCE:WRITE']))).toBe(
      '/hr/dashboard',
    )
    expect(getDefaultWorkspacePath(account(['HR_ATTENDANCE:READ', 'HR_ATTENDANCE:WRITE']))).toBe(
      '/hr/dashboard',
    )
    expect(getDefaultWorkspacePath(account(['HR_ATTENDANCE:WRITE']))).toBe('/hr/dashboard')
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

describe('legacy sidebar navigation', () => {
  it('groups portal workspaces beneath the legacy menu labels', () => {
    expect(
      getContextNavigation(
        'portal',
        account([
          'SHOPS:READ',
          'CATALOG:READ',
          'VENDORS:READ',
          'ORDERS:READ',
          'MAPPING:READ',
          'DESIGN:READ',
          'PRODUCTION:READ',
          'VENDOR_SUBMISSIONS:READ',
          'SHIPMENTS:READ',
          'FINANCE:READ',
          'REPORTS:READ',
        ]),
      ).map(({ labelKey }) => labelKey),
    ).toEqual([
      'shell.navigation.dashboard',
      'shell.groups.legacyOrders',
      'shell.groups.legacyTeamTasks',
      'shell.groups.legacyListing',
      'shell.groups.legacyCostCenters',
      'shell.navigation.finance',
      'shell.navigation.reports',
    ])
  })

  it('groups system tools beneath monitoring and configuration', () => {
    expect(
      getContextNavigation(
        'system',
        account([
          'AUTH:READ',
          'AUDIT:READ',
          'MEDIA:READ',
          'CUSTOMERS:READ',
          'ORDERS:READ',
          'WORK_SCORES:READ',
        ]),
      ).map(({ labelKey }) => labelKey),
    ).toEqual([
      'shell.navigation.dashboard',
      'shell.groups.legacyMonitoring',
      'shell.groups.legacyConfiguration',
    ])
  })
})
