import type { TFunction } from 'i18next'
import type { NavigationGroup } from './appNavigation'

export interface RouteTitleDefinition {
  readonly pattern: RegExp
  readonly key: string
  readonly defaultTitle: string
}

export const ROUTE_TITLE_DEFINITIONS: readonly RouteTitleDefinition[] = [
  // ── Monitoring & Observability ────────────────────────────────
  {
    pattern: /^\/(auth|portal)\/monitoring(\/.*)?$/,
    key: 'shell.navigation.monitoring',
    defaultTitle: 'Monitoring',
  },

  // ── Audit Logs ────────────────────────────────────────────────
  {
    pattern: /^\/(auth\/audit-log|portal\/audit)(\/.*)?$/,
    key: 'shell.navigation.auditLog',
    defaultTitle: 'Audit log',
  },

  // ── Dashboards ────────────────────────────────────────────────
  {
    pattern: /^\/system\/dashboard(\/.*)?$/,
    key: 'shell.navigation.dashboard',
    defaultTitle: 'Dashboard',
  },
  {
    pattern: /^\/(portal\/dashboard|operations-dashboard|foundation)(\/.*)?$/,
    key: 'shell.navigation.operationsDashboard',
    defaultTitle: 'Dashboard',
  },

  {
    pattern: /^\/portal\/catalog\/listing-launches(\/.*)?$/,
    key: 'listingLaunch.title',
    defaultTitle: 'Listing drafts',
  },
  // ── Catalog Sub-workbenches & Listings ────────────────────────
  {
    pattern: /^\/portal\/catalog\/product-types(\/.*)?$/,
    key: 'shell.navigation.productTypes',
    defaultTitle: 'Product Types',
  },
  {
    pattern: /^\/portal\/catalog\/templates(\/.*)?$/,
    key: 'shell.navigation.internalTemplates',
    defaultTitle: 'Internal Templates',
  },
  {
    pattern: /^\/portal\/(catalog|listing)(\/.*)?$/,
    key: 'shell.navigation.catalog',
    defaultTitle: 'Catalog',
  },

  // ── Orders, Integrations & Logistics ──────────────────────────
  {
    pattern: /^\/portal\/orders(\/.*)?$/,
    key: 'shell.navigation.orders',
    defaultTitle: 'Orders',
  },
  {
    pattern: /^\/portal\/integrations(\/.*)?$/,
    key: 'shell.navigation.integrations',
    defaultTitle: 'Integrations',
  },
  {
    pattern: /^\/portal\/shipments(\/.*)?$/,
    key: 'shell.navigation.shipments',
    defaultTitle: 'Shipments',
  },

  // ── Production & Design ───────────────────────────────────────
  {
    pattern: /^\/portal\/design\/files(\/.*)?$/,
    key: 'shell.navigation.design',
    defaultTitle: 'PSD Files',
  },
  {
    pattern: /^\/portal\/design(\/.*)?$/,
    key: 'shell.navigation.design',
    defaultTitle: 'Design',
  },
  {
    pattern: /^\/portal\/production(\/.*)?$/,
    key: 'shell.navigation.production',
    defaultTitle: 'Production',
  },
  {
    pattern: /^\/portal\/vendor-submissions(\/.*)?$/,
    key: 'shell.navigation.vendorSubmissions',
    defaultTitle: 'Vendor submissions',
  },
  {
    pattern: /^\/portal\/work-scores(\/.*)?$/,
    key: 'shell.navigation.workScores',
    defaultTitle: 'Work scores',
  },
  {
    pattern: /^\/portal\/customizations?(\/.*)?$/,
    key: 'shell.navigation.customizations',
    defaultTitle: 'Customization review',
  },

  // ── Vendors & Shops ───────────────────────────────────────────
  {
    pattern: /^\/portal\/vendors(\/.*)?$/,
    key: 'shell.navigation.vendors',
    defaultTitle: 'Vendors',
  },
  {
    pattern: /^\/portal\/shops(\/.*)?$/,
    key: 'shell.navigation.shops',
    defaultTitle: 'Shops',
  },
  {
    pattern: /^\/portal\/customers(\/.*)?$/,
    key: 'shell.navigation.customers',
    defaultTitle: 'Customers',
  },

  // ── Finance, Reports, Mapping, Media & Chat ───────────────────
  {
    pattern: /^\/portal\/finance\/settlements(\/.*)?$/,
    key: 'finance.tabs.settlement',
    defaultTitle: 'Settlement',
  },
  {
    pattern: /^\/portal\/finance(\/.*)?$/,
    key: 'shell.navigation.finance',
    defaultTitle: 'Finance',
  },
  {
    pattern: /^\/portal\/reports(\/.*)?$/,
    key: 'shell.navigation.reports',
    defaultTitle: 'Reports',
  },
  {
    pattern: /^\/portal\/mapping(\/.*)?$/,
    key: 'shell.navigation.mapping',
    defaultTitle: 'Mapping',
  },
  {
    pattern: /^\/portal\/media(\/.*)?$/,
    key: 'shell.navigation.media',
    defaultTitle: 'Media',
  },
  {
    pattern: /^\/portal\/chat(\/.*)?$/,
    key: 'shell.navigation.chat',
    defaultTitle: 'Chat',
  },

  // ── Auth, Accounts & Access Control ───────────────────────────
  {
    pattern: /^\/auth\/accounts\/[^/]+\/security(\/.*)?$/,
    key: 'accounts.accountSecurity.title',
    defaultTitle: 'Security',
  },
  {
    pattern: /^\/auth\/(accounts\/[^/]+\/access|access\/[^/]+)(\/.*)?$/,
    key: 'accounts.manageAccess',
    defaultTitle: 'Access Editor',
  },
  {
    pattern: /^\/auth\/accounts\/[^/]+$/,
    key: 'accounts.accountDetail.profile',
    defaultTitle: 'Account Detail',
  },
  {
    pattern: /^\/auth\/accounts(\/.*)?$/,
    key: 'shell.navigation.accounts',
    defaultTitle: 'Accounts',
  },
  {
    pattern: /^\/auth\/(access-control|roles|permissions|scopes)(\/.*)?$/,
    key: 'shell.navigation.accessControl',
    defaultTitle: 'Access control',
  },

  // ── Organization & HR ─────────────────────────────────────────
  {
    pattern: /^\/organization(\/.*)?$/,
    key: 'shell.navigation.organization',
    defaultTitle: 'Organization',
  },
  {
    pattern: /^\/hr\/(me|team)\/schedule(\/.*)?$/,
    key: 'hrOperations.navigation.schedule',
    defaultTitle: 'Schedule',
  },
  {
    pattern: /^\/hr\/(me|team)\/attendance(\/.*)?$/,
    key: 'hrOperations.navigation.attendance',
    defaultTitle: 'Attendance',
  },
  {
    pattern: /^\/hr\/(me|team)\/requests(\/.*)?$/,
    key: 'hrOperations.navigation.requests',
    defaultTitle: 'Time Requests',
  },
  {
    pattern: /^\/hr\/me\/payroll(\/.*)?$/,
    key: 'hrOperations.navigation.payroll',
    defaultTitle: 'Payroll',
  },
  {
    pattern: /^\/hr\/me\/profile(\/.*)?$/,
    key: 'hrOperations.navigation.profile',
    defaultTitle: 'Profile',
  },
  {
    pattern: /^\/hr\/team\/approvals(\/.*)?$/,
    key: 'hrOperations.navigation.approvals',
    defaultTitle: 'Approvals',
  },
  {
    pattern: /^\/hr(\/.*)?$/,
    key: 'shell.navigation.hr',
    defaultTitle: 'HR workspace',
  },

  // ── Public Auth & Setup ───────────────────────────────────────
  {
    pattern: /^\/login(\/.*)?$/,
    key: 'auth.login.title',
    defaultTitle: 'Sign in',
  },
  {
    pattern: /^\/forgot-password(\/.*)?$/,
    key: 'auth.forgotPassword.title',
    defaultTitle: 'Forgot Password',
  },
  {
    pattern: /^\/reset-password(\/.*)?$/,
    key: 'auth.resetPassword.title',
    defaultTitle: 'Reset Password',
  },
  {
    pattern: /^\/setup\/password(\/.*)?$/,
    key: 'auth.setup.passwordTitle',
    defaultTitle: 'Set Up Password',
  },
  {
    pattern: /^\/setup\/profile(\/.*)?$/,
    key: 'auth.setup.profileTitle',
    defaultTitle: 'Set Up Profile',
  },
]

export function formatDocumentTitle(pageTitle?: string | null, appName = 'LNG Web'): string {
  const trimmed = pageTitle?.trim()
  return trimmed ? `${trimmed} | ${appName}` : appName
}

export function resolvePageTitle(
  pathname: string,
  options?: {
    readonly activeLabelKey?: string
    readonly groups?: readonly NavigationGroup[]
    readonly t?: TFunction
  },
): string {
  const t =
    options?.t ??
    (((key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key) as TFunction)

  // 1. Specific route pattern match takes priority (handles aliases, sub-routes like /portal/monitoring)
  const routeDef = ROUTE_TITLE_DEFINITIONS.find(({ pattern }) => pattern.test(pathname))
  if (routeDef) {
    return t(routeDef.key, { defaultValue: routeDef.defaultTitle })
  }

  // 2. Active item label key if present and not a generic core fallback
  if (options?.activeLabelKey && !options.activeLabelKey.startsWith('shell.cores.')) {
    return t(options.activeLabelKey)
  }

  // 3. Match against navigation item paths from provided groups
  if (options?.groups) {
    const matchedItem = options.groups
      .flatMap((group) => group.items)
      .filter(({ path }) => pathname === path || pathname.startsWith(`${path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0]
    if (matchedItem) {
      return t(matchedItem.labelKey)
    }
  }

  // 4. Default fallback
  return t('shell.navigation.operationsDashboard', { defaultValue: 'Dashboard' })
}
