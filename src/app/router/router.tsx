import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'

import { AppShell } from '@/app/layout/AppShell'
import {
  requirePasswordSetup,
  requireProfileSetup,
  requireWorkspace,
} from '@/features/auth/guards/accountSetupGuards'
import { LoginPage } from '@/features/auth/login/pages/LoginPage'
import { FoundationPage } from '@/features/foundation/FoundationPage'
import { LegacyMappingRedirect } from '@/features/portal/mapping/pages/LegacyMappingRedirect'

import { NotFoundPage } from './NotFoundPage'
import { RouteErrorPage } from './RouteErrorPage'
import { WorkspaceIndexRedirect } from './WorkspaceIndexRedirect'

export const appRoutes: RouteObject[] = [
  { path: 'login', element: <LoginPage /> },
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
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <WorkspaceIndexRedirect /> },
      {
        path: 'auth/audit-log',
        lazy: () =>
          import('@/features/audit/pages/AuditLogPage').then(({ AuditLogPage }) => ({
            Component: AuditLogPage,
          })),
      },
      {
        path: 'auth/accounts',
        lazy: () =>
          import('@/features/auth/accounts/pages/AccessExplorerPage').then(
            ({ AccessExplorerPage }) => ({ Component: AccessExplorerPage }),
          ),
      },
      {
        path: 'auth/accounts/:accountId',
        lazy: () =>
          import('@/features/auth/accounts/pages/AccountDetailPage').then(
            ({ AccountDetailPage }) => ({ Component: AccountDetailPage }),
          ),
      },
      {
        path: 'auth/accounts/:accountId/access',
        lazy: () =>
          import('@/features/auth/access/pages/AccessEditorPage').then(({ AccessEditorPage }) => ({
            Component: AccessEditorPage,
          })),
      },
      {
        path: 'auth/accounts/:accountId/security',
        lazy: () =>
          import('@/features/auth/accounts/pages/AccountSecurityPage').then(
            ({ AccountSecurityPage }) => ({ Component: AccountSecurityPage }),
          ),
      },
      {
        path: 'auth/access-control',
        lazy: () =>
          import('@/features/auth/access-control/pages/AccessControlPage').then(
            ({ AccessControlPage }) => ({ Component: AccessControlPage }),
          ),
      },
      { path: 'auth/roles', element: <Navigate to="/auth/access-control?tab=roles" replace /> },
      { path: 'auth/access', element: <Navigate to="/auth/accounts" replace /> },
      {
        path: 'auth/access/:accountId',
        lazy: () =>
          import('@/features/auth/access/pages/AccessEditorPage').then(({ AccessEditorPage }) => ({
            Component: AccessEditorPage,
          })),
      },
      {
        path: 'organization',
        lazy: () =>
          import('@/features/organization/pages/OrganizationPage').then(({ OrganizationPage }) => ({
            Component: OrganizationPage,
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
              <PortalPageBoundary anyOf={['ORDERS:READ', 'ORDERS:WRITE']}>
                <IntegrationWorkbenchPage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/design',
        lazy: () =>
          Promise.all([
            import('@/features/portal/components/PortalPageBoundary'),
            import('@/features/portal/design/pages/DesignWorkbenchPage'),
          ]).then(([{ PortalPageBoundary }, { DesignWorkbenchPage }]) => ({
            Component: () => (
              <PortalPageBoundary
                anyOf={['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW']}
              >
                <DesignWorkbenchPage />
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
                anyOf={['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW']}
              >
                <PsdFileWorkspacePage />
              </PortalPageBoundary>
            ),
          })),
      },
      {
        path: 'portal/production',
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
              <PortalPageBoundary anyOf={['WORK_SCORES:READ', 'WORK_SCORES:ADJUST', 'DESIGN:WORK']}>
                <WorkScoreWorkbenchPage />
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
      { path: 'foundation', element: <FoundationPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
    errorElement: <RouteErrorPage />,
  },
]

export const router = createBrowserRouter(appRoutes)
