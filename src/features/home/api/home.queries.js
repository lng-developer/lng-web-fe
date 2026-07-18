import { hasAnyPermission } from '@/features/auth/utils/authz'
import { useDesignTaskSummaryQuery } from '@/features/design-tasks/api/designTasks.queries'
import { useOrderSummaryQuery } from '@/features/orders/api/orders.queries'
import { useProductionSummaryQuery } from '@/features/production/api/production.queries'
import { useShipmentsSummaryQuery } from '@/features/shipments/api/shipments.queries'
import { useVendorSubmissionsSummaryQuery } from '@/features/vendor-submissions/api/vendorSubmissions.queries'

import { buildDashboardView } from '../utils/dashboardView.js'

const ORDER_PERMISSIONS = ['ORDERS:READ', 'ORDERS:WRITE']
const PRODUCTION_PERMISSIONS = [
  'PRODUCTION:READ',
  'PRODUCTION:WRITE',
  'DESIGN:WORK',
  'DESIGN:REVIEW',
]
const DESIGN_PERMISSIONS = ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW']

function collectDashboardState(queryDefinitions) {
  const summaries = {}
  const failures = {}

  queryDefinitions.forEach(({ source, enabled, query }) => {
    if (!enabled) return
    if (query.isSuccess) summaries[source] = query.data
    if (query.isError) failures[source] = true
  })

  return { summaries, failures }
}

export function useHomeDashboardQuery(user) {
  const canReadOrders = hasAnyPermission(user, ORDER_PERMISSIONS)
  const canReadProduction = hasAnyPermission(user, PRODUCTION_PERMISSIONS)
  const canReadDesign = hasAnyPermission(user, DESIGN_PERMISSIONS)
  const canReadVendorSubmissions = hasAnyPermission(user, ['VENDOR_SUBMISSIONS:READ'])
  const canReadShipments = hasAnyPermission(user, ['SHIPMENTS:READ'])

  const orders = useOrderSummaryQuery({}, { enabled: canReadOrders })
  const production = useProductionSummaryQuery({}, { enabled: canReadProduction })
  const design = useDesignTaskSummaryQuery({}, { enabled: canReadDesign })
  const vendorSubmissions = useVendorSubmissionsSummaryQuery(
    {},
    { enabled: canReadVendorSubmissions },
  )
  const shipments = useShipmentsSummaryQuery({}, { enabled: canReadShipments })
  const queryDefinitions = [
    { source: 'orders', enabled: canReadOrders, query: orders },
    { source: 'production', enabled: canReadProduction, query: production },
    { source: 'design', enabled: canReadDesign, query: design },
    {
      source: 'vendorSubmissions',
      enabled: canReadVendorSubmissions,
      query: vendorSubmissions,
    },
    { source: 'shipments', enabled: canReadShipments, query: shipments },
  ]
  const { summaries, failures } = collectDashboardState(queryDefinitions)

  return {
    data: buildDashboardView({ user, summaries, failures }),
    isPending: queryDefinitions.some(({ enabled, query }) => enabled && query.isPending),
    isError: Object.keys(failures).length > 0,
    failedSources: Object.keys(failures),
    refetch: () =>
      Promise.all(
        queryDefinitions.filter(({ enabled }) => enabled).map(({ query }) => query.refetch()),
      ),
  }
}
