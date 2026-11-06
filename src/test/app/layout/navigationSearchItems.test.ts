import { describe, expect, it } from 'vitest'

import {
  filterNavigationItems,
  getSearchableNavigationItems,
  normalizeSearchText,
} from '@/app/layout/navigationSearchItems'
import type { CurrentAccount } from '@/features/auth/api/authApi'

const createMockAccount = (permissions: string[] = [], roles: string[] = []): CurrentAccount => ({
  account: { id: 'account-1', email: 'test@lng.co', mustChangePassword: false },
  roles,
  permissions,
  scopes: [],
  profileSetupRequired: false,
})

const mockT = (key: string): string => {
  const dictionary: Record<string, string> = {
    'shell.navigation.dashboard': 'Dashboard',
    'shell.cores.portal': 'Portal',
    'shell.cores.hr': 'HR',
    'shell.cores.system': 'System',
    'legacyMenu.orders': 'Orders',
    'legacyMenu.sales': 'Sales',
    'legacyMenu.amazon': 'Amazon',
    'legacyMenu.etsy': 'Etsy',
    'legacyMenu.shopify': 'Shopify',
    'legacyMenu.teamTasks': 'Team Tasks',
    'legacyMenu.listing': 'Listing',
    'legacyMenu.amzListing': 'Amz Listing',
    'legacyMenu.etsyListing': 'Etsy Listing',
    'legacyMenu.costCenters': 'Cost Centers',
    'legacyMenu.reports': 'Reports',
    'legacyMenu.monitoring': 'Monitoring',
    'legacyMenu.configuration': 'Configuration',
    'legacyMenu.setting': 'Setting',
    'shell.navigation.accounts': 'Accounts',
    'shell.navigation.accessControl': 'Access Control',
    'shell.navigation.catalog': 'Catalog',
    'portal.design.ideaTasks': 'Idea Tasks',
    'shell.navigation.myDay': 'My Day',
    'shell.navigation.teamOverview': 'Team Overview',
    'shell.navigation.hrOverview': 'HR Operations',
  }
  return dictionary[key] ?? key
}

const mockI18n = {
  getResource: (lng: string, _ns: string, key: string): string | undefined => {
    if (lng === 'vi') {
      const viDictionary: Record<string, string> = {
        'legacyMenu.orders': 'Đơn hàng',
        'legacyMenu.sales': 'Bán hàng',
        'shell.navigation.accounts': 'Tài khoản',
        'portal.design.ideaTasks': 'Ý tưởng thiết kế',
        'shell.navigation.myDay': 'Công việc của tôi',
        'shell.navigation.dashboard': 'Bảng điều khiển',
      }
      return viDictionary[key]
    }
    if (lng === 'en') {
      const enDictionary: Record<string, string> = {
        'legacyMenu.orders': 'Orders',
        'legacyMenu.sales': 'Sales',
        'shell.navigation.accounts': 'Accounts',
        'portal.design.ideaTasks': 'Idea Tasks',
      }
      return enDictionary[key]
    }
    return undefined
  },
}

describe('normalizeSearchText', () => {
  it('lowercases and strips Vietnamese accents', () => {
    expect(normalizeSearchText('Đơn Hàng')).toBe('don hang')
    expect(normalizeSearchText('Ý tưởng thiết kế')).toBe('y tuong thiet ke')
    expect(normalizeSearchText('  Tài khoản & Phân quyền  ')).toBe('tai khoan & phan quyen')
    expect(normalizeSearchText('BẢNG ĐIỀU KHIỂN')).toBe('bang dieu khien')
  })
})

describe('getSearchableNavigationItems', () => {
  it('gives SUPER_ADMIN access to all routes', () => {
    const admin = createMockAccount([], ['SUPER_ADMIN'])
    const items = getSearchableNavigationItems(admin)
    const paths = items.map((i) => i.path)

    expect(paths).toContain('/portal/dashboard')
    expect(paths).toContain('/portal/orders')
    expect(paths).toContain('/portal/orders?salesChannelCode=amazon')
    expect(paths).toContain('/auth/accounts')
    expect(paths).toContain('/portal/monitoring')
  })

  it('restricts routes based on granular permissions', () => {
    const restrictedUser = createMockAccount(['ORDERS:READ'])
    const items = getSearchableNavigationItems(restrictedUser)
    const paths = items.map((i) => i.path)

    expect(paths).toContain('/portal/orders')
    expect(paths).not.toContain('/auth/accounts')
    expect(paths).not.toContain('/portal/finance')
  })
})

describe('filterNavigationItems', () => {
  it('returns quick priority navigation items when query is empty', () => {
    const admin = createMockAccount([], ['ADMIN'])
    const items = getSearchableNavigationItems(admin)
    const quickNav = filterNavigationItems(items, '', mockT, mockI18n)

    expect(quickNav.length).toBeGreaterThan(0)
    expect(quickNav.length).toBeLessThanOrEqual(8)
    expect(quickNav.some((i) => i.path === '/portal/orders')).toBe(true)
  })

  it('finds items using English queries', () => {
    const admin = createMockAccount([], ['ADMIN'])
    const items = getSearchableNavigationItems(admin)
    const matches = filterNavigationItems(items, 'orders', mockT, mockI18n)

    expect(matches.length).toBeGreaterThan(0)
    expect(matches.some((i) => i.path === '/portal/orders')).toBe(true)
  })

  it('finds items using unaccented Vietnamese queries', () => {
    const admin = createMockAccount([], ['ADMIN'])
    const items = getSearchableNavigationItems(admin)
    const matches = filterNavigationItems(items, 'don hang', mockT, mockI18n)

    expect(matches.length).toBeGreaterThan(0)
    expect(matches.some((i) => i.path === '/portal/orders')).toBe(true)
  })

  it('finds accounts page when searching "tai khoan" or "users"', () => {
    const admin = createMockAccount([], ['ADMIN'])
    const items = getSearchableNavigationItems(admin)
    const matches = filterNavigationItems(items, 'tai khoan', mockT, mockI18n)

    expect(matches.some((i) => i.path === '/auth/accounts')).toBe(true)
  })

  it('finds amazon orders when typing "amz"', () => {
    const admin = createMockAccount([], ['ADMIN'])
    const items = getSearchableNavigationItems(admin)
    const matches = filterNavigationItems(items, 'amz', mockT, mockI18n)

    expect(matches.some((i) => i.path.includes('amazon'))).toBe(true)
  })
})
