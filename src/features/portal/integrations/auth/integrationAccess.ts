import type { CurrentAccount } from '@/features/auth/api/authApi'

const ORDER_WRITE = 'ORDERS:WRITE'

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
