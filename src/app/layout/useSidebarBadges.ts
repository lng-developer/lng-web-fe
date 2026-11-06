import { useLocation } from 'react-router-dom'
import { workspaceRouteLinks } from '@/app/router/workspaceRoutes'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { useOrderSummaryQuery } from '@/features/portal/orders/hooks/useOrderSummaryQuery'

export interface UseSidebarBadgesParams {
  account?: CurrentAccount
  permissions: Set<string> | null
  collapsed: boolean
  activeMenu: string
}

export function useSidebarBadges({
  account,
  permissions,
  collapsed,
  activeMenu,
}: UseSidebarBadgesParams): Partial<Record<string, number>> {
  const location = useLocation()
  const isOrdersSection =
    !collapsed && (activeMenu === 'sales' || location.pathname.startsWith('/portal/orders'))

  const canQuerySummary = (required: readonly string[]) =>
    Boolean(account) &&
    (permissions === null || required.some((permission) => permissions.has(permission)))

  const orderSummary = useOrderSummaryQuery(
    { page: 1, limit: 1 },
    {
      enabled: canQuerySummary(['ORDERS:READ', 'ORDERS:WRITE']) && isOrdersSection,
      staleTime: 60_000,
    },
  )

  return {
    [workspaceRouteLinks.orders]: orderSummary.data?.tabCounts?.NEW,
  }
}
