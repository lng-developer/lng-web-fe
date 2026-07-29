/* eslint-disable react-refresh/only-export-components -- file cấu hình router, không phải component */
import { lazy } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'

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
const QualityScoringPage = lazy(() => import('@/features/design-tasks/pages/QualityScoringPage'))
const PsdFileLibraryPage = lazy(() => import('@/features/design-tasks/pages/PsdFileLibraryPage'))
const FinancePage = lazy(() => import('@/features/finance/pages/FinancePage'))
const FinanceDataImportsPage = lazy(
  () => import('@/features/finance-imports/pages/FinanceDataImportsPage'),
)
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const ListingsPage = lazy(() => import('@/features/listings/pages/ListingsPage'))
const ProductTypesPage = lazy(() => import('@/features/listings/pages/ProductTypesPage'))
const InternalTemplatesPage = lazy(() => import('@/features/listings/pages/InternalTemplatesPage'))
const MappingPage = lazy(() => import('@/features/mapping/pages/MappingPage'))
const AnnouncementsPage = lazy(() => import('@/features/hr-communication/pages/AnnouncementsPage'))
const HrDashboardPage = lazy(() => import('@/features/hr-dashboard/pages/HrDashboardPage'))
const AttendanceDeskPage = lazy(() => import('@/features/hr-time/pages/AttendanceDeskPage'))
const HrSettingsPage = lazy(() => import('@/features/hr-settings/pages/HrSettingsPage'))
const MyTimePage = lazy(() => import('@/features/hr-time/pages/MyTimePage'))
const MyPayslipsPage = lazy(() => import('@/features/hr-payroll/pages/MyPayslipsPage'))
const PayrollRunsPage = lazy(() => import('@/features/hr-payroll/pages/PayrollRunsPage'))
const PayrollRegisterPage = lazy(() => import('@/features/hr-payroll/pages/PayrollRegisterPage'))
const OrdersPage = lazy(() => import('@/features/orders/pages/OrdersPage'))
const PodWorkbenchPage = lazy(() => import('@/features/pod-workbench/pages/PodWorkbenchPage'))
const QcPage = lazy(() => import('@/features/qc/pages/QcPage'))
const ArtworkQcWorkbenchPage = lazy(() => import('@/features/qc/pages/ArtworkQcWorkbenchPage'))
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'))
const RequestInboxPage = lazy(() => import('@/features/hr-time/pages/RequestInboxPage'))
const PeoplePage = lazy(() => import('@/features/hr-time/pages/PeoplePage'))
const SchedulePage = lazy(() => import('@/features/hr-time/pages/SchedulePage'))
const UsersRolesPage = lazy(() => import('@/features/rbac/pages/UsersRolesPage'))
const ScalePage = lazy(() => import('@/features/scale/pages/ScalePage'))
const ScaleWorkbenchPage = lazy(() => import('@/features/scale/pages/ScaleWorkbenchPage'))
const ShippingPage = lazy(() => import('@/features/shipments/pages/ShippingPage'))
const ShopsPage = lazy(() => import('@/features/shops/pages/ShopsPage'))
const UiKitPage = lazy(() => import('@/features/ui-kit/pages/UiKitPage'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const UnauthorizedPage = lazy(() => import('@/features/auth/pages/UnauthorizedPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'))
const VendorListPage = lazy(() => import('@/features/vendors/pages/VendorListPage'))
const VendorProductsPage = lazy(() => import('@/features/vendors/pages/VendorProductsPage'))
const VendorSubmissionsPage = lazy(
  () => import('@/features/vendor-submissions/pages/VendorSubmissionsPage'),
)

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
          {
            path: ROUTES.HR.slice(1),
            element: <Outlet />,
            children: [
              {
                path: ROUTES.HR_DASHBOARD.replace(`${ROUTES.HR}/`, ''),
                element: requirePermissions(['HR_EMPLOYEES:READ'], <HrDashboardPage />),
              },
              {
                index: true,
                element: requireAnyPermissions(
                  ['HR_ATTENDANCE:WRITE', 'HR_LEAVE:WRITE', 'HR_OVERTIME:WRITE'],
                  <MyTimePage />,
                ),
              },
              {
                path: ROUTES.HR_TIME_MY_TIME.replace(`${ROUTES.HR}/`, ''),
                element: requireAnyPermissions(
                  ['HR_ATTENDANCE:WRITE', 'HR_LEAVE:WRITE', 'HR_OVERTIME:WRITE'],
                  <MyTimePage />,
                ),
              },
              {
                path: ROUTES.HR_TIME_REQUEST_INBOX.replace(`${ROUTES.HR}/`, ''),
                element: requireAnyPermissions(
                  ['HR_LEAVE:READ', 'HR_LEAVE:APPROVE', 'HR_OVERTIME:READ', 'HR_OVERTIME:APPROVE'],
                  <RequestInboxPage />,
                ),
              },
              {
                path: ROUTES.HR_TIME_ATTENDANCE.replace(`${ROUTES.HR}/`, ''),
                element: requireAnyPermissions(
                  ['HR_ATTENDANCE:READ', 'HR_ATTENDANCE:MANAGE'],
                  <AttendanceDeskPage />,
                ),
              },
              {
                path: ROUTES.HR_TIME_SCHEDULE.replace(`${ROUTES.HR}/`, ''),
                element: requireAnyPermissions(
                  [
                    'HR_SCHEDULE:READ',
                    'HR_SCHEDULE:WRITE',
                    'HR_CALENDAR:READ',
                    'HR_CALENDAR:WRITE',
                  ],
                  <SchedulePage />,
                ),
              },
              {
                path: ROUTES.HR_TIME_EMPLOYEES.replace(`${ROUTES.HR}/`, ''),
                element: requireAnyPermissions(
                  ['HR_EMPLOYEES:READ', 'HR_EMPLOYEES:WRITE'],
                  <PeoplePage />,
                ),
              },
              {
                path: ROUTES.HR_MY_PAYSLIPS.replace(`${ROUTES.HR}/`, ''),
                element: <MyPayslipsPage />,
              },
              {
                path: ROUTES.HR_PAYROLL_RUNS.replace(`${ROUTES.HR}/`, ''),
                element: requirePermissions(['HR_PAYROLL:READ'], <PayrollRunsPage />),
              },
              {
                path: ROUTES.HR_PAYROLL_REGISTER.replace(`${ROUTES.HR}/`, ''),
                element: requirePermissions(['HR_PAYROLL:READ'], <PayrollRegisterPage />),
              },
              {
                path: ROUTES.HR_ANNOUNCEMENTS.replace(`${ROUTES.HR}/`, ''),
                element: requireAnyPermissions(
                  ['HR_ANNOUNCEMENTS:READ', 'HR_ANNOUNCEMENTS:WRITE'],
                  <AnnouncementsPage />,
                ),
              },
              {
                path: ROUTES.HR_SETTINGS.replace(`${ROUTES.HR}/`, ''),
                element: requirePermissions(['HR_INTEGRATIONS:MANAGE'], <HrSettingsPage />),
              },
            ],
          },
          { path: 'portal/orders', element: requirePermissions(['ORDERS:READ'], <OrdersPage />) },
          {
            path: ROUTES.PORTAL_LISTINGS.slice(1),
            element: requirePermissions(['CATALOG:READ'], <ListingsPage />),
          },
          {
            path: ROUTES.PORTAL_PRODUCT_TYPES.slice(1),
            element: requirePermissions(['CATALOG:READ'], <ProductTypesPage />),
          },
          {
            path: ROUTES.PORTAL_INTERNAL_TEMPLATES.slice(1),
            element: requirePermissions(['CATALOG:READ'], <InternalTemplatesPage />),
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
            element: requirePermissions(['VENDOR_SUBMISSIONS:READ'], <VendorSubmissionsPage />),
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
            path: 'portal/finance/imports',
            element: requirePermissions(['FINANCE:READ'], <FinanceDataImportsPage />),
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
            path: 'portal/fulfillment/scale/workbench',
            element: requirePermissions(['PRODUCTION:READ'], <ScaleWorkbenchPage />),
          },
          {
            path: 'portal/fulfillment/qc',
            element: requireAnyPermissions(['PRODUCTION:READ', 'DESIGN:REVIEW'], <QcPage />),
          },
          {
            path: 'portal/fulfillment/qc/artwork',
            element: requireAnyPermissions(
              ['PRODUCTION:READ', 'DESIGN:REVIEW'],
              <ArtworkQcWorkbenchPage />,
            ),
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
            path: 'portal/design/quality-scoring',
            element: requireAnyPermissions(
              ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW', 'DESIGN_TASKS:READ'],
              <QualityScoringPage />,
            ),
          },
          {
            path: 'portal/design/psd-files',
            element: requireAnyPermissions(
              ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW', 'DESIGN_TASKS:READ'],
              <PsdFileLibraryPage />,
            ),
          },
          {
            path: 'portal/settings/users-roles',
            element: requirePermissions(['AUTH:READ'], <UsersRolesPage />),
          },
          {
            path: 'portal/settings/shops-stores',
            element: requirePermissions(['SHOPS:READ'], <ShopsPage />),
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
