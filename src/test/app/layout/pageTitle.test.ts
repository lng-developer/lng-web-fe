import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'

import { formatDocumentTitle, resolvePageTitle } from '@/app/layout/pageTitle'
import type { NavigationGroup } from '@/app/layout/appNavigation'

describe('pageTitle', () => {
  describe('formatDocumentTitle', () => {
    it('formats title with app name', () => {
      expect(formatDocumentTitle('Monitoring', 'LNG Web')).toBe('Monitoring | LNG Web')
      expect(formatDocumentTitle('Giám sát', 'LNG Web')).toBe('Giám sát | LNG Web')
    })

    it('returns app name when title is empty or nullish', () => {
      expect(formatDocumentTitle('', 'LNG Web')).toBe('LNG Web')
      expect(formatDocumentTitle('   ', 'LNG Web')).toBe('LNG Web')
      expect(formatDocumentTitle(undefined, 'LNG Web')).toBe('LNG Web')
      expect(formatDocumentTitle(null, 'LNG Web')).toBe('LNG Web')
      expect(formatDocumentTitle()).toBe('LNG Web')
    })
  })

  describe('resolvePageTitle', () => {
    it('resolves monitoring routes correctly across /portal and /auth aliases', () => {
      expect(resolvePageTitle('/portal/monitoring')).toBe('Monitoring')
      expect(resolvePageTitle('/auth/monitoring')).toBe('Monitoring')
      expect(resolvePageTitle('/portal/monitoring/tab')).toBe('Monitoring')
    })

    it('resolves audit log routes correctly across /portal and /auth aliases', () => {
      expect(resolvePageTitle('/portal/audit')).toBe('Audit log')
      expect(resolvePageTitle('/auth/audit-log')).toBe('Audit log')
    })

    it('resolves workbench and catalog subroutes', () => {
      expect(resolvePageTitle('/portal/orders')).toBe('Orders')
      expect(resolvePageTitle('/portal/orders/123')).toBe('Orders')
      expect(resolvePageTitle('/portal/team-tasks')).toBe('Team Tasks')
      expect(resolvePageTitle('/portal/catalog')).toBe('Catalog')
      expect(resolvePageTitle('/portal/catalog/templates')).toBe('Internal Templates')
      expect(resolvePageTitle('/portal/catalog/product-types')).toBe('Product Types')
    })

    it('resolves logistics, finance, and design routes', () => {
      expect(resolvePageTitle('/portal/shipments')).toBe('Shipments')
      expect(resolvePageTitle('/portal/design')).toBe('Design')
      expect(resolvePageTitle('/portal/design/files')).toBe('PSD Files')
      expect(resolvePageTitle('/portal/finance')).toBe('Finance')
      expect(resolvePageTitle('/portal/finance/settlements')).toBe('Settlement')
    })

    it('resolves auth, security, and hr routes', () => {
      expect(resolvePageTitle('/auth/accounts/acc-1/security')).toBe('Security')
      expect(resolvePageTitle('/auth/accounts/acc-1')).toBe('Account Detail')
      expect(resolvePageTitle('/auth/accounts')).toBe('Accounts')
      expect(resolvePageTitle('/hr/me/schedule')).toBe('Schedule')
      expect(resolvePageTitle('/hr/me/attendance')).toBe('Attendance')
    })

    it('translates title when t function is provided', () => {
      const mockT = ((key: string, opts?: { defaultValue?: string }) => {
        if (key === 'shell.navigation.monitoring') return 'Giám sát'
        if (key === 'shell.navigation.auditLog') return 'Nhật ký hệ thống'
        return opts?.defaultValue ?? key
      }) as unknown as TFunction

      expect(resolvePageTitle('/portal/monitoring', { t: mockT })).toBe('Giám sát')
      expect(resolvePageTitle('/auth/monitoring', { t: mockT })).toBe('Giám sát')
      expect(resolvePageTitle('/portal/audit', { t: mockT })).toBe('Nhật ký hệ thống')
    })

    it('falls back to group item when not in static route patterns', () => {
      const groups: NavigationGroup[] = [
        {
          key: 'custom',
          labelKey: 'custom',
          items: [
            {
              key: 'custom-feature',
              path: '/portal/custom-path',
              labelKey: 'shell.navigation.customPath',
            },
          ],
        },
      ]

      const mockT = ((key: string) =>
        key === 'shell.navigation.customPath' ? 'Custom Path' : key) as unknown as TFunction

      expect(
        resolvePageTitle('/portal/custom-path', {
          groups,
          t: mockT,
        }),
      ).toBe('Custom Path')
    })

    it('falls back to Dashboard for unknown routes', () => {
      expect(resolvePageTitle('/unknown/unmapped/path')).toBe('Dashboard')
    })
  })
})
