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
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const UsersRolesPage = lazy(() => import('@/features/rbac/pages/UsersRolesPage'))
const UiKitPage = lazy(() => import('@/features/ui-kit/pages/UiKitPage'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const UnauthorizedPage = lazy(() => import('@/features/auth/pages/UnauthorizedPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'))

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
          { path: 'portal/settings/users-roles', element: <UsersRolesPage /> },
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
