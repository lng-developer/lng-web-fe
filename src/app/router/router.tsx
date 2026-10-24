import { createBrowserRouter, Navigate, useParams, type RouteObject } from 'react-router-dom'

import { AppShell } from '@/app/layout/AppShell'
import {
  requirePasswordSetup,
  requireProfileSetup,
  requireWorkspace,
} from '@/features/auth/guards/accountSetupGuards'
import { LoginPage } from '@/features/auth/login/pages/LoginPage'
import { OperationsDashboardPage } from '@/features/foundation/OperationsDashboardPage'
import { LegacyMappingRedirect } from '@/features/portal/mapping/pages/LegacyMappingRedirect'
import { PermissionBoundary } from '@/shared/auth/PermissionBoundary'

import { NotFoundPage } from './NotFoundPage'
import { RouteErrorPage } from './RouteErrorPage'
import { WorkspaceIndexRedirect } from './WorkspaceIndexRedirect'

const loadCatalogWorkspaceRoute = () =>
  Promise.all([
    import('@/features/portal/components/PortalPageBoundary'),
    import('@/features/portal/catalog/pages/CatalogWorkspacePage'),
  ]).then(([{ PortalPageBoundary }, { CatalogWorkspacePage }]) => ({
    Component: () => (
      <PortalPageBoundary anyOf={['CATALOG:READ', 'CATALOG:WRITE']}>
        <CatalogWorkspacePage />
      </PortalPageBoundary>
    ),
  }))

const organizationRoutePermissions = [
  'DEPARTMENTS:READ',
  'DEPARTMENTS:WRITE',
  'TEAMS:READ',
  'TEAMS:WRITE',
]

export const appRoutes: RouteObject[] = [
  { path: 'login', element: <LoginPage /> },
  {
    path: 'forgot-password',
    lazy: () =>
      import('@/features/auth/public/pages/PublicAuthPage').then(({ PublicAuthPage }) => ({
        Component: () => <PublicAuthPage mode="forgot-password" />,
      })),
  },
  {
    path: 'reset-password',
    lazy: () =>
      import('@/features/auth/public/pages/PublicAuthPage').then(({ PublicAuthPage }) => ({
        Component: () => <PublicAuthPage mode="reset-password" />,
      })),
  },
  { path: '500', element: <RouteErrorPage /> },
  {
    path: 'setup/password',
    loader: requirePasswordSetup,
    lazy: () =>
      import('@/features/auth/setup/pages/PasswordSetupPage').then(({ PasswordSetupPage }) => ({
        Component: PasswordSetupPage,
      })),
  },
  {
    path: 'setup/profile',
    loader: requireProfileSetup,
    lazy: () =>
      import('@/features/auth/setup/pages/ProfileSetupPage').then(({ ProfileSetupPage }) => ({
        Component: ProfileSetupPage,
      })),
  },
  {
    id: 'workspace',
    element: <AppShell />,
    loader: requireWorkspace,
    shouldRevalidate: () => false,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <WorkspaceIndexRedirect /> },
      {
        path: 'auth/audit-log',
        element: <Navigate to="/portal/audit" replace />,
      },
      {
        path: 'system/dashboard',
        lazy: () =>
          import('@/features/system/pages/SystemDashboardPage').then(({ SystemDashboardPage }) => ({
            Component: () => (
              <PermissionBoundary anyOf={['AUTH:READ', 'AUDIT:READ']} globalOnly>
                <SystemDashboardPage />
              </PermissionBoundary>
            ),
          })),
      },
      {
        path: 'auth/monitoring',
        element: <Navigate to="/portal/monitoring" replace />,
      },
      {
        path: 'auth/accounts',
        lazy: () =>
          import('@/features/auth/accounts/pages/AccessExplorerPage').then(
            ({ AccessExplorerPage }) => ({
              Component: () => (
                <PermissionBoundary anyOf={['AUTH:READ', 'AUTH:WRITE']} globalOnly>
                  <AccessExplorerPage />
                </PermissionBoundary>
              ),
            }),
          ),
      },
      {
        path: 'auth/accounts/:accountId',
        lazy: () =>
          import('@/features/auth/accounts/pages/AccountDetailPage').then(
            ({ AccountDetailPage }) => ({
              Component: () => (
                <PermissionBoundary anyOf={['AUTH:READ', 'AUTH:WRITE']} globalOnly>
                  <AccountDetailPage />
                </PermissionBoundary>
              ),
            }),
          ),
      },
      {
        path: 'auth/accounts/:accountId/access',
        lazy: () =>
          // import('@/features/auth/access/pages/AccessEditorPage').then(({ AccessEditorPage }) => ({
          import('@/features/auth/access/pages/AccessEditor/index').then(
            ({ AccessEditorPage }) => ({
              Component: () => (
                <PermissionBoundary anyOf={['AUTH:WRITE']} globalOnly>
                  <AccessEditorPage />
                </PermissionBoundary>
              ),
            }),
          ),
      },
      {
        path: 'auth/accounts/:accountId/security',
        lazy: () =>
          import('@/features/auth/accounts/pages/AccountSecurityPage').then(
            ({ AccountSecurityPage }) => ({
              Component: () => (
                <PermissionBoundary anyOf={['AUTH:WRITE']} globalOnly>
                  <AccountSecurityPage />
                </PermissionBoundary>
              ),
            }),
          ),
      },
      {
        path: 'auth/access-control',
        lazy: () =>
          import('@/features/auth/access-control/pages/AccessControlPage').then(
            ({ AccessControlPage }) => ({
              Component: () => (
                <PermissionBoundary anyOf={['AUTH:READ', 'AUTH:WRITE']} globalOnly>
                  <AccessControlPage />
                </PermissionBoundary>
              ),
            }),
          ),
      },
      { path: 'auth/roles', element: <Navigate to="/auth/access-control?tab=roles" replace /> },
      {
        path: 'auth/permissions',
        element: <Navigate to="/auth/access-control?tab=permissions" replace />,
      },
      { path: 'auth/scopes', element: <Navigate to="/auth/access-control?tab=scopes" replace /> },
      { path: 'auth/access', element: <Navigate to="/auth/accounts" replace /> },
      {
        path: 'auth/access/:accountId',
        lazy: () =>
          Promise.resolve({
            Component: () => {
              const { accountId } = useParams()
              return <Navigate to={`/auth/accounts/${accountId}/access`} replace />
            },
          }),
      },
      {
        path: 'organization',
        lazy: () =>
          import('@/features/organization/pages/OrganizationPage').then(({ OrganizationPage }) => ({
            Component: () => (
              <PermissionBoundary anyOf={organizationRoutePermissions}>
                <OrganizationPage />
              </PermissionBoundary>
            ),
          })),
      },
      {
        path: 'hr/*',
        lazy: () =>
          import('@/features/hr/pages/HrModulePage').then(({ HrModulePage }) => ({
            Component: HrModulePage,
          })),
      },
      {
        path: 'portal/shops',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/shops/pages/ShopWorkspacePage'),
          ]).then(([{ PortalPageBoundary }, { ShopWorkspacePage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['SHOPS:READ']}>
                <ShopWorkspacePage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/catalog',
        lazy: loadCatalogWorkspaceRoute,
      },
      {
        path: 'portal/catalog/product-types',
        lazy: loadCatalogWorkspaceRoute,
      },
      {
        path: 'portal/catalog/listings',
        lazy: loadCatalogWorkspaceRoute,
      },
      {
        path: 'portal/catalog/templates',
        lazy: loadCatalogWorkspaceRoute,
      },
      {
        path: 'portal/listing/:salesChannelCode',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/catalog/pages/CatalogWorkspacePage'),
          ]).then(([{ PortalPageBoundary }, { CatalogWorkspacePage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['CATALOG:READ', 'CATALOG:WRITE']}>
                <CatalogWorkspacePage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/vendors',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/vendors/pages/VendorWorkspacePage'),
          ]).then(([{ PortalPageBoundary }, { VendorWorkspacePage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['VENDORS:READ']} globalOnly>
                <VendorWorkspacePage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/vendors/products/:productId/cost-centers',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/vendors/pages/VendorProductCostCentersPage'),
          ]).then(([{ PortalPageBoundary }, { VendorProductCostCentersPage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['VENDORS:READ']} globalOnly>
                <VendorProductCostCentersPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/vendors/products/:productId/cost-centers/new',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/vendors/pages/VendorCostCenterEditorPage'),
          ]).then(([{ PortalPageBoundary }, { VendorCostCenterEditorPage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['VENDORS:WRITE']} globalOnly>
                <VendorCostCenterEditorPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/vendors/cost-centers/:costCenterId/edit',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/vendors/pages/VendorCostCenterEditorPage'),
          ]).then(([{ PortalPageBoundary }, { VendorCostCenterEditorPage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['VENDORS:WRITE']} globalOnly>
                <VendorCostCenterEditorPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/vendors/cost-centers/:costCenterId',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/vendors/pages/VendorCostCenterEditorPage'),
          ]).then(([{ PortalPageBoundary }, { VendorCostCenterEditorPage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['VENDORS:READ']} globalOnly>
                <VendorCostCenterEditorPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/orders',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/orders/pages/OrderWorkbenchPage'),
          ]).then(([{ PortalPageBoundary }, { OrderWorkbenchPage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['ORDERS:READ', 'ORDERS:WRITE']}>
                <OrderWorkbenchPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/team-tasks',
        lazy: () =>
          import('@/features/portal/team-tasks/pages/TeamTasksPage').then(({ TeamTasksPage }) => ({
            Component: TeamTasksPage,
          })),
      },
      {
        path: 'portal/customers',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/customers/pages/CustomerWorkspacePage'),
          ]).then(([{ PortalPageBoundary }, { CustomerWorkspacePage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['CUSTOMERS:READ']}>
                <CustomerWorkspacePage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/chat',
        lazy: () =>
          import('@/features/portal/chat/pages/ChatWorkspacePage').then(
            ({ ChatWorkspacePage }) => ({
              Component: ChatWorkspacePage,
            }),
          ),
      },
      {
        path: 'portal/customizations',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/customization/pages/CustomizationReviewPage'),
          ]).then(([{ PortalPageBoundary }, { CustomizationReviewPage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['ORDERS:READ']}>
                <CustomizationReviewPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/finance',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/finance/pages/FinanceWorkspacePage'),
          ]).then(([{ PortalPageBoundary }, { FinanceWorkspacePage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['FINANCE:READ', 'FINANCE:WRITE']}>
                <FinanceWorkspacePage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/finance/settlements',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/finance/pages/SettlementWorkspacePage'),
          ]).then(([{ PortalPageBoundary }, { SettlementWorkspacePage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['FINANCE:READ', 'FINANCE:WRITE']}>
                <SettlementWorkspacePage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/finance/cash-flow',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/finance/pages/CashFlowWorkspacePage'),
          ]).then(([{ PortalPageBoundary }, { CashFlowWorkspacePage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['FINANCE:READ', 'FINANCE:WRITE']}>
                <CashFlowWorkspacePage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/finance/transactions',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/finance/pages/TransactionLedgerPage'),
          ]).then(([{ PortalPageBoundary }, { TransactionLedgerPage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['FINANCE:READ', 'FINANCE:WRITE']}>
                <TransactionLedgerPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/reports/:salesChannelCode?/:reportView?',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/reports/pages/ReportWorkspacePage'),
          ]).then(([{ PortalPageBoundary }, { ReportWorkspacePage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['REPORTS:READ', 'FINANCE:READ']}>
                <ReportWorkspacePage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/audit',
        lazy: () =>
          import('@/features/audit/pages/AuditLogPage').then(({ AuditLogPage }) => ({
            Component: () => (
              <PermissionBoundary anyOf={['AUDIT:READ']} globalOnly>
                <AuditLogPage />
              </PermissionBoundary>
            ),
          })),
      },
      {
        path: 'portal/monitoring',
        lazy: () =>
          import('@/features/monitoring/pages/MonitoringDashboardPage').then(
            ({ MonitoringDashboardPage }) => ({
              Component: () => (
                <PermissionBoundary anyOf={['AUDIT:READ']} globalOnly>
                  <MonitoringDashboardPage />
                </PermissionBoundary>
              ),
            }),
          ),
      },
      {
        path: 'portal/mapping',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/mapping/pages/MappingWorkspacePage'),
          ]).then(([{ PortalPageBoundary }, { MappingWorkspacePage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['MAPPING:READ', 'MAPPING:WRITE']}>
                <MappingWorkspacePage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/mapping/workbench',
        element: <LegacyMappingRedirect tab="workbench" />,
      },
      {
        path: 'portal/mapping/sku-rules',
        element: <LegacyMappingRedirect tab="sku-rules" />,
      },
      {
        path: 'portal/mapping/product-mapping',
        element: <LegacyMappingRedirect tab="product-mapping" />,
      },
      {
        path: 'portal/mapping/input-semantics',
        element: <LegacyMappingRedirect tab="input-semantics" />,
      },
      {
        path: 'portal/mapping/value-aliases',
        element: <LegacyMappingRedirect tab="value-aliases" />,
      },
      {
        path: 'portal/mapping/vendor-routing',
        element: <LegacyMappingRedirect tab="vendor-routing" />,
      },
      {
        path: 'portal/integrations',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/integrations/pages/IntegrationWorkbenchPage'),
          ]).then(([{ PortalPageBoundary }, { IntegrationWorkbenchPage }]) => ({
            Component: () => (
              <PortalPageBoundary
                anyOf={['ORDERS:READ', 'ORDERS:WRITE', 'CATALOG:READ', 'CATALOG:WRITE']}
              >
                <IntegrationWorkbenchPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/design',
        element: <Navigate to="/portal/design/idea-tasks" replace />,
      },
      {
        path: 'portal/design/idea-tasks',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/design/pages/IdeaTasksPage'),
          ]).then(([{ PortalPageBoundary }, { IdeaTasksPage }]) => ({
            Component: () => (
              <PortalPageBoundary
                anyOf={['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW']}
              >
                <IdeaTasksPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/design/psd-tasks',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/design/pages/PsdTasksPage'),
          ]).then(([{ PortalPageBoundary }, { PsdTasksPage }]) => ({
            Component: () => (
              <PortalPageBoundary
                anyOf={[
                  'DESIGN:READ',
                  'DESIGN:WRITE',
                  'DESIGN:WORK',
                  'DESIGN:REVIEW',
                  'DESIGN:PSD_REQUEST',
                ]}
              >
                <PsdTasksPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/design/png-tasks',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/design/pages/PngTasksPage'),
          ]).then(([{ PortalPageBoundary }, { PngTasksPage }]) => ({
            Component: () => (
              <PortalPageBoundary
                anyOf={[
                  'DESIGN:READ',
                  'DESIGN:WRITE',
                  'DESIGN:WORK',
                  'DESIGN:REVIEW',
                  'PRODUCTION:READ',
                  'PRODUCTION:WRITE',
                ]}
              >
                <PngTasksPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/design/files',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/design/pages/PsdFileWorkspacePage'),
          ]).then(([{ PortalPageBoundary }, { PsdFileWorkspacePage }]) => ({
            Component: () => (
              <PortalPageBoundary
                anyOf={[
                  'DESIGN:READ',
                  'DESIGN:WRITE',
                  'DESIGN:WORK',
                  'DESIGN:REVIEW',
                  'DESIGN:PSD_REQUEST',
                ]}
              >
                <PsdFileWorkspacePage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/design/workspace',
        element: <Navigate to="/portal/design/idea-tasks" replace />,
      },
      {
        path: 'portal/design/scores',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/design/pages/DesignScoresPage'),
          ]).then(([{ PortalPageBoundary }, { DesignScoresPage }]) => ({
            Component: () => (
              <PortalPageBoundary
                anyOf={[
                  'DESIGN:READ',
                  'DESIGN:WRITE',
                  'DESIGN:WORK',
                  'DESIGN:REVIEW',
                  'WORK_SCORES:READ',
                  'WORK_SCORES:ADJUST',
                ]}
              >
                <DesignScoresPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/design/:salesChannel',
        lazy: () =>
          Promise.resolve({
            Component: () => {
              const { salesChannel } = useParams()
              return (
                <Navigate
                  to={`/portal/design/idea-tasks?salesChannelCode=${salesChannel}`}
                  replace
                />
              )
            },
          }),
      },
      {
        path: 'portal/production/scores',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/production/pages/ProductionScoresPage'),
          ]).then(([{ PortalPageBoundary }, { ProductionScoresPage }]) => ({
            Component: () => (
              <PortalPageBoundary
                anyOf={[
                  'PRODUCTION:READ',
                  'PRODUCTION:WRITE',
                  'PRODUCTION:SCALE_WORK',
                  'WORK_SCORES:READ',
                  'WORK_SCORES:ADJUST',
                ]}
              >
                <ProductionScoresPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/production/:queue?',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/production/pages/ProductionWorkbenchPage'),
          ]).then(([{ PortalPageBoundary }, { ProductionWorkbenchPage }]) => ({
            Component: () => (
              <PortalPageBoundary
                anyOf={['PRODUCTION:READ', 'PRODUCTION:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW']}
              >
                <ProductionWorkbenchPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/media',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/media/pages/MediaWorkspacePage'),
          ]).then(([{ PortalPageBoundary }, { MediaWorkspacePage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['MEDIA:READ']} globalOnly>
                <MediaWorkspacePage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/work-scores',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/work-scores/pages/WorkScoreWorkbenchPage'),
          ]).then(([{ PortalPageBoundary }, { WorkScoreWorkbenchPage }]) => ({
            Component: () => (
              <PortalPageBoundary
                anyOf={[
                  'WORK_SCORES:READ',
                  'WORK_SCORES:ADJUST',
                  'DESIGN:WORK',
                  'PRODUCTION:SCALE_WORK',
                ]}
              >
                <WorkScoreWorkbenchPage scope="ALL" />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/vendor-submissions',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/vendor-submissions/pages/VendorSubmissionWorkbenchPage'),
          ]).then(([{ PortalPageBoundary }, { VendorSubmissionWorkbenchPage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['VENDOR_SUBMISSIONS:READ']}>
                <VendorSubmissionWorkbenchPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/shipments',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/shipments/pages/ShipmentWorkbenchPage'),
          ]).then(([{ PortalPageBoundary }, { ShipmentWorkbenchPage }]) => ({
            Component: () => (
              <PortalPageBoundary anyOf={['SHIPMENTS:READ', 'SHIPMENTS:WRITE']}>
                <ShipmentWorkbenchPage />
              </PortalPageBoundary>
            ),
          })),
      },
      { path: 'portal/dashboard', element: <OperationsDashboardPage /> },
      { path: 'operations-dashboard', element: <Navigate to="/portal/dashboard" replace /> },
      { path: 'foundation', element: <Navigate to="/portal/dashboard" replace /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
    errorElement: <RouteErrorPage />,
  },
]

export const router = createBrowserRouter(appRoutes)
