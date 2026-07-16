/* eslint-disable react-refresh/only-export-components -- file cấu hình router, không phải component */
import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import NotFound from '@/components/common/NotFound'
import RouteError from '@/components/common/RouteError'
import { ROUTES } from '@/constants/routes'
import AuthLayout from '@/layouts/AuthLayout'
import MainLayout from '@/layouts/MainLayout'
import ProtectedRoute from '@/routes/ProtectedRoute'
import PublicRoute from '@/routes/PublicRoute'

const HomePage = lazy(() => import('@/features/home/pages/HomePage'))
const BackendEndpointConsolePage = lazy(
  () => import('@/features/api-coverage/pages/BackendEndpointConsolePage'),
)
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'))
const DepartmentsPage = lazy(() => import('@/features/departments/pages/DepartmentsPage'))
const DesignTasksPage = lazy(() => import('@/features/design-tasks/pages/DesignTasksPage'))
const FinancePage = lazy(() => import('@/features/finance/pages/FinancePage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const ListingPage = lazy(() => import('@/features/listings/pages/ListingPage'))
const MappingPage = lazy(() => import('@/features/mapping/pages/MappingPage'))
const OrdersPage = lazy(() => import('@/features/orders/pages/OrdersPage'))
const PodWorkbenchPage = lazy(() => import('@/features/pod-workbench/pages/PodWorkbenchPage'))
const QcPage = lazy(() => import('@/features/qc/pages/QcPage'))
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'))
const UsersRolesPage = lazy(() => import('@/features/rbac/pages/UsersRolesPage'))
const ScalePage = lazy(() => import('@/features/scale/pages/ScalePage'))
const ShippingPage = lazy(() => import('@/features/shipments/pages/ShippingPage'))
const UiKitPage = lazy(() => import('@/features/ui-kit/pages/UiKitPage'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const UnauthorizedPage = lazy(() => import('@/features/auth/pages/UnauthorizedPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'))
const VendorListPage = lazy(() => import('@/features/vendors/pages/VendorListPage'))
const VendorProductsPage = lazy(() => import('@/features/vendors/pages/VendorProductsPage'))

function requirePermissions(requiredPermissions, element) {
  return <ProtectedRoute requiredPermissions={requiredPermissions}>{element}</ProtectedRoute>
}

function requireAnyPermissions(requiredAnyPermissions, element) {
  return <ProtectedRoute requiredAnyPermissions={requiredAnyPermissions}>{element}</ProtectedRoute>
}

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'departments', element: <DepartmentsPage /> },
          { path: 'portal/orders', element: requirePermissions(['ORDERS:READ'], <OrdersPage />) },
          {
            path: 'portal/listings',
            element: requirePermissions(['CATALOG:READ'], <ListingPage />),
          },
          {
            path: 'portal/orders/workbench',
            element: requirePermissions(['ORDERS:READ'], <PodWorkbenchPage moduleId="orders" />),
          },
          {
            path: 'portal/catalog/setup',
            element: requirePermissions(['CATALOG:READ'], <PodWorkbenchPage moduleId="catalog" />),
          },
          {
            path: 'portal/mapping',
            element: requirePermissions(['MAPPING:READ'], <MappingPage />),
          },
          {
            path: 'portal/production',
            element: requirePermissions(
              ['PRODUCTION:READ'],
              <PodWorkbenchPage moduleId="production" />,
            ),
          },
          {
            path: 'portal/vendor-submissions',
            element: requirePermissions(
              ['VENDOR_SUBMISSIONS:READ'],
              <PodWorkbenchPage moduleId="logistics" />,
            ),
          },
          {
            path: 'portal/fulfillment/shipping',
            element: requirePermissions(['SHIPMENTS:READ'], <ShippingPage />),
          },
          {
            path: 'portal/finance/summary',
            element: requirePermissions(['FINANCE:READ'], <FinancePage />),
          },
          {
            path: 'portal/reports',
            element: requirePermissions(['REPORTS:READ'], <ReportsPage />),
          },
          {
            path: 'portal/fulfillment/scale',
            element: requirePermissions(['PRODUCTION:READ'], <ScalePage />),
          },
          {
            path: 'portal/fulfillment/qc',
            element: requireAnyPermissions(['PRODUCTION:READ', 'DESIGN:REVIEW'], <QcPage />),
          },
          // { path: 'portal/design/tasks', element: <DesignTasksPage /> },
          {
            path: 'portal/vendors',
            element: requirePermissions(['VENDORS:READ'], <VendorListPage />),
          },
          {
            path: 'portal/vendors/products-cost',
            element: requirePermissions(['VENDORS:READ'], <VendorProductsPage />),
          },
          {
            path: 'portal/design/tasks',
            element: requireAnyPermissions(
              ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW', 'DESIGN_TASKS:READ'],
              <DesignTasksPage />,
            ),
          },
          {
            path: 'portal/design/tasks/:taskTypeSlug',
            element: requireAnyPermissions(
              ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW', 'DESIGN_TASKS:READ'],
              <DesignTasksPage />,
            ),
          },
          {
            path: 'portal/settings/users-roles',
            element: requirePermissions(['AUTH:READ'], <UsersRolesPage />),
          },
          {
            path: 'portal/settings/api-coverage',
            element: requirePermissions(['MANAGE_SYSTEM'], <BackendEndpointConsolePage />),
          },
          {
            path: 'portal/settings/audit-log',
            element: requirePermissions(
              ['AUDIT:READ'],
              <BackendEndpointConsolePage preset="audit" />,
            ),
          },
          // Path tương đối so với MainLayout - ROUTES.UI_KIT ('/ui-kit') dùng cho NavLink.
          { path: 'ui-kit', element: <UiKitPage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  {
    path: ROUTES.UNAUTHORIZED,
    element: <UnauthorizedPage />,
    errorElement: <RouteError />,
  },
  {
    element: (
      <PublicRoute>
        <AuthLayout />
      </PublicRoute>
    ),
    errorElement: <RouteError />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
      { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordPage /> },
    ],
  },
])
