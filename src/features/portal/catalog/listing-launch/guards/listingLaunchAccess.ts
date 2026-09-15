import type { CurrentAccount } from '@/features/auth/api/authApi'
import { canUseScopedPermission } from '@/shared/auth/permissions'
export const canWriteLaunch = (account: CurrentAccount | undefined, shopId: string) =>
  canUseScopedPermission(account, 'CATALOG:WRITE', { scopeType: 'shop', scopeId: shopId })
