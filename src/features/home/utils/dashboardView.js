import { ROUTES } from '../../../constants/routes.js'
import { hasAnyPermission } from '../../auth/utils/authz.js'

const ORDER_PERMISSIONS = ['ORDERS:READ', 'ORDERS:WRITE']
const PRODUCTION_PERMISSIONS = [
  'PRODUCTION:READ',
  'PRODUCTION:WRITE',
  'DESIGN:WORK',
  'DESIGN:REVIEW',
]
const DESIGN_PERMISSIONS = ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW']

const queueDefinitions = [
  {
    id: 'order-cases',
    source: 'orders',
    requiredAnyPermissions: ORDER_PERMISSIONS,
    count: (summaries) => summaries.orders?.tabCounts?.OPEN_CASE,
    href: `${ROUTES.PORTAL_ORDER_LIST}?tab=openCase`,
    tone: 'warning',
    priority: 20,
    labelKey: 'home.dashboard.queues.orderCases',
    descriptionKey: 'home.dashboard.queueDescriptions.orderCases',
  },
  {
    id: 'scale',
    source: 'production',
    requiredAnyPermissions: PRODUCTION_PERMISSIONS,
    count: (summaries) => summaries.production?.needScale,
    href: `${ROUTES.PORTAL_SCALE}?status=needScale`,
    tone: 'warning',
    priority: 40,
    labelKey: 'home.dashboard.queues.scale',
    descriptionKey: 'home.dashboard.queueDescriptions.scale',
  },
  {
    id: 'qc',
    source: 'production',
    requiredAnyPermissions: PRODUCTION_PERMISSIONS,
    count: (summaries) => summaries.production?.qcPending,
    href: `${ROUTES.PORTAL_QC}?status=pending`,
    tone: 'info',
    priority: 30,
    labelKey: 'home.dashboard.queues.qc',
    descriptionKey: 'home.dashboard.queueDescriptions.qc',
  },
  {
    id: 'design',
    source: 'design',
    requiredAnyPermissions: DESIGN_PERMISSIONS,
    count: (summaries) => summaries.design?.total,
    href: `${ROUTES.PORTAL_DESIGN_TASKS}?status=requested`,
    tone: 'info',
    priority: 10,
    labelKey: 'home.dashboard.queues.design',
    descriptionKey: 'home.dashboard.queueDescriptions.design',
  },
]

const attentionDefinitions = [
  {
    id: 'order-missing-cost-center',
    source: 'orders',
    requiredAnyPermissions: ORDER_PERMISSIONS,
    count: (summaries) => summaries.orders?.tabCounts?.NO_COST_CENTER,
    href: `${ROUTES.PORTAL_ORDER_LIST}?tab=missingCostCenter`,
    tone: 'danger',
    priority: 100,
    labelKey: 'home.dashboard.attention.missingCostCenter',
  },
  {
    id: 'order-missing-psd',
    source: 'orders',
    requiredAnyPermissions: ORDER_PERMISSIONS,
    count: (summaries) => summaries.orders?.tabCounts?.NO_PSD,
    href: `${ROUTES.PORTAL_ORDER_LIST}?tab=missingPsd`,
    tone: 'danger',
    priority: 90,
    labelKey: 'home.dashboard.attention.orderMissingPsd',
  },
  {
    id: 'missing-psd',
    source: 'production',
    requiredAnyPermissions: PRODUCTION_PERMISSIONS,
    count: (summaries) => summaries.production?.blockers?.MISSING_PSD,
    href: `${ROUTES.PORTAL_SCALE}?status=needScale`,
    tone: 'danger',
    priority: 80,
    labelKey: 'home.dashboard.attention.missingPsd',
  },
  {
    id: 'vendor-ready',
    source: 'vendorSubmissions',
    requiredAnyPermissions: ['VENDOR_SUBMISSIONS:READ'],
    count: (summaries) => summaries.vendorSubmissions?.ready,
    href: `${ROUTES.PORTAL_VENDOR_SUBMISSIONS}?status=READY`,
    tone: 'warning',
    priority: 70,
    labelKey: 'home.dashboard.attention.vendorReady',
  },
  {
    id: 'vendor-failed',
    source: 'vendorSubmissions',
    requiredAnyPermissions: ['VENDOR_SUBMISSIONS:READ'],
    count: (summaries) => summaries.vendorSubmissions?.failed,
    href: `${ROUTES.PORTAL_VENDOR_SUBMISSIONS}?status=FAILED`,
    tone: 'danger',
    priority: 60,
    labelKey: 'home.dashboard.attention.vendorFailed',
  },
  {
    id: 'tracking-pending',
    source: 'shipments',
    requiredAnyPermissions: ['SHIPMENTS:READ'],
    count: (summaries) => summaries.shipments?.trackingPending,
    href: `${ROUTES.PORTAL_SHIPPING}?status=TRACKING_PENDING`,
    tone: 'warning',
    priority: 50,
    labelKey: 'home.dashboard.attention.trackingPending',
  },
]

const managementDefinitions = [
  { id: 'users-roles', href: ROUTES.PORTAL_USERS_ROLES, requiredAnyPermissions: ['AUTH:READ'] },
  { id: 'shops', href: ROUTES.PORTAL_SHOPS_STORES, requiredAnyPermissions: ['SHOPS:READ'] },
  {
    id: 'mapping',
    href: ROUTES.PORTAL_MAPPING_WORKBENCH,
    requiredAnyPermissions: ['MAPPING:READ'],
  },
  { id: 'vendors', href: ROUTES.PORTAL_VENDOR_LIST, requiredAnyPermissions: ['VENDORS:READ'] },
  { id: 'audit-log', href: ROUTES.PORTAL_AUDIT_LOG, requiredAnyPermissions: ['AUDIT:READ'] },
  { id: 'reports', href: ROUTES.PORTAL_REPORTS, requiredAnyPermissions: ['REPORTS:READ'] },
]

function toCount(value) {
  return Math.max(Number(value) || 0, 0)
}

function projectItems(definitions, { user, summaries, failures }) {
  return definitions
    .filter(
      (definition) =>
        !failures[definition.source] && hasAnyPermission(user, definition.requiredAnyPermissions),
    )
    .map((definition) => ({ ...definition, count: toCount(definition.count(summaries)) }))
    .filter((definition) => definition.count > 0)
    .sort((left, right) => right.priority - left.priority)
}

export function buildDashboardView({ user, summaries = {}, failures = {} }) {
  const queues = projectItems(queueDefinitions, { user, summaries, failures })
  const attention = projectItems(attentionDefinitions, { user, summaries, failures })
  const managementLinks = managementDefinitions.filter((definition) =>
    hasAnyPermission(user, definition.requiredAnyPermissions),
  )

  return {
    queues,
    attention,
    totalCount: queues.reduce((total, queue) => total + queue.count, 0),
    managementLinks,
    failedSources: Object.keys(failures).filter((source) => failures[source]),
  }
}
