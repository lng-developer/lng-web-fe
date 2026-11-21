import type { AccessExplorerSnapshot } from '../../api/accessExplorerApi'
import styles from '../pages/AccessExplorerPage.module.scss'

export type AccessAccountItem = AccessExplorerSnapshot['accounts']['items'][number]
export type MatrixModuleKey = 'orders' | 'catalog' | 'design' | 'hr' | 'reports'
export type PermLevel = 'FULL' | 'WRITE' | 'READ' | 'NONE'

export function statusTone(status?: string) {
  return String(status ?? '').toLowerCase() === 'active' ? 'operational' : 'cancelled'
}

export function normalize(value?: string) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

export function roleCodesForScope(account: AccessAccountItem, scopeType: string) {
  return [
    ...new Set(
      (account.roleAssignments ?? [])
        .filter((assignment) => assignment.scopeType?.toLowerCase() === scopeType)
        .map((assignment) => assignment.roleCode)
        .filter((roleCode): roleCode is string => Boolean(roleCode)),
    ),
  ]
}

export function getModuleLevel(account: AccessAccountItem, module: MatrixModuleKey): PermLevel {
  const allRoles = new Set([
    ...(account.roles ?? []).map((r) => r.toUpperCase()),
    ...(account.roleAssignments ?? []).map((a) => (a.roleCode ?? '').toUpperCase()).filter(Boolean),
  ])

  if (allRoles.has('SUPER_ADMIN') || allRoles.has('ADMIN')) {
    return 'FULL'
  }

  switch (module) {
    case 'orders': {
      if (allRoles.has('OPS_MANAGER') || allRoles.has('ORDER_MANAGER')) return 'FULL'
      if (
        allRoles.has('OPS_LEADER') ||
        allRoles.has('SALES_LEADER') ||
        allRoles.has('OPS_OPERATOR')
      )
        return 'WRITE'
      if (allRoles.has('OPS_VIEWER') || allRoles.has('REVIEWER') || allRoles.has('SALES_VIEWER'))
        return 'READ'
      return 'NONE'
    }
    case 'catalog': {
      if (allRoles.has('CATALOG_MANAGER') || allRoles.has('PRODUCT_MANAGER')) return 'FULL'
      if (
        allRoles.has('CATALOG_EDITOR') ||
        allRoles.has('PRODUCT_EDITOR') ||
        allRoles.has('DESIGNER') ||
        allRoles.has('DESIGN_LEADER')
      )
        return 'WRITE'
      if (allRoles.has('CATALOG_VIEWER') || allRoles.has('REVIEWER')) return 'READ'
      return 'NONE'
    }
    case 'design': {
      if (allRoles.has('DESIGN_LEADER') || allRoles.has('DESIGN_MANAGER')) return 'FULL'
      if (allRoles.has('DESIGNER')) return 'WRITE'
      if (allRoles.has('REVIEWER')) return 'READ'
      return 'NONE'
    }
    case 'hr': {
      if (allRoles.has('HR_MANAGER') || allRoles.has('HR_ADMIN')) return 'FULL'
      if (allRoles.has('LEADER') || allRoles.has('HR_STAFF')) return 'WRITE'
      if (allRoles.has('EMPLOYEE') || allRoles.has('HR_VIEWER')) return 'READ'
      return 'NONE'
    }
    case 'reports': {
      if (allRoles.has('FINANCE_MANAGER') || allRoles.has('REPORT_MANAGER')) return 'FULL'
      if (allRoles.has('SALES_LEADER') || allRoles.has('FINANCE_STAFF')) return 'WRITE'
      if (
        allRoles.has('OPS_VIEWER') ||
        allRoles.has('FINANCE_VIEWER') ||
        allRoles.has('REPORT_VIEWER')
      )
        return 'READ'
      return 'NONE'
    }
  }
}

export function renderMatrixBadge(level: PermLevel, t: (key: string) => string) {
  switch (level) {
    case 'FULL':
      return (
        <span className={`${styles.matrixBadge} ${styles.badgeFull}`}>
          {t('auth.accessExplorer.permFull')}
        </span>
      )
    case 'WRITE':
      return (
        <span className={`${styles.matrixBadge} ${styles.badgeWrite}`}>
          {t('auth.accessExplorer.permWrite')}
        </span>
      )
    case 'READ':
      return (
        <span className={`${styles.matrixBadge} ${styles.badgeRead}`}>
          {t('auth.accessExplorer.permRead')}
        </span>
      )
    default:
      return <span className={`${styles.matrixBadge} ${styles.badgeNone}`}>—</span>
  }
}
