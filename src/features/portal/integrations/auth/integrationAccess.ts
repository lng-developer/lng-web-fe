import type { CurrentAccount } from '@/features/auth/api/authApi'
import { canUseScopedPermission, hasScopedPermission } from '@/shared/auth/permissions'

export function canReadListingImages(account: CurrentAccount) {
  return ['CATALOG:READ', 'CATALOG:WRITE'].some(
    (permission) =>
      canUseScopedPermission(account, permission) ||
      hasScopedPermission(account, permission, 'shop'),
  )
}

const ORDER_WRITE = 'ORDERS:WRITE'
const FINANCE_READ = 'FINANCE:READ'
const FINANCE_WRITE = 'FINANCE:WRITE'

export function canWriteOrdersForShop(account: CurrentAccount, shopId: string | null) {
  if (account.permissions.includes(ORDER_WRITE)) return true
  if (!shopId) return false

  return account.scopes.some(
    (scope) =>
      scope.scopeType.toLowerCase() === 'shop' &&
      (scope.scopeId === shopId || scope.resourceId === shopId) &&
      scope.permissions.includes(ORDER_WRITE),
  )
}

export function canWriteOrdersSomewhere(account: CurrentAccount) {
  return (
    account.permissions.includes(ORDER_WRITE) ||
    account.scopes.some(
      (scope) =>
        scope.scopeType.toLowerCase() === 'shop' && scope.permissions.includes(ORDER_WRITE),
    )
  )
}

export function canWriteFinanceForShop(account: CurrentAccount, shopId: string | null) {
  if (account.permissions.includes(FINANCE_WRITE)) return true
  if (!shopId) return false

  return account.scopes.some(
    (scope) =>
      scope.scopeType.toLowerCase() === 'shop' &&
      (scope.scopeId === shopId || scope.resourceId === shopId) &&
      scope.permissions.includes(FINANCE_WRITE),
  )
}

export function canReadFinanceImports(account: CurrentAccount) {
  return account.permissions.includes(FINANCE_READ) || account.permissions.includes(FINANCE_WRITE)
}
