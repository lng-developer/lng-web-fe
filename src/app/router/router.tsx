import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'

import { AppShell } from '@/app/layout/AppShell'
import { AccessEditorPage } from '@/features/auth/access/pages/AccessEditorPage'
import { AccessControlPage } from '@/features/auth/access-control/pages/AccessControlPage'
import { AccessExplorerPage } from '@/features/auth/accounts/pages/AccessExplorerPage'
import { AccountDetailPage } from '@/features/auth/accounts/pages/AccountDetailPage'
import { AccountSecurityPage } from '@/features/auth/accounts/pages/AccountSecurityPage'
import { requireAuth } from '@/features/auth/guards/requireAuth'
import { LoginPage } from '@/features/auth/login/pages/LoginPage'
import { FoundationPage } from '@/features/foundation/FoundationPage'

import { NotFoundPage } from './NotFoundPage'
import { RouteErrorPage } from './RouteErrorPage'

export const appRoutes: RouteObject[] = [
  { path: 'login', element: <LoginPage /> },
  {
    element: <AppShell />,
    loader: requireAuth,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'auth/accounts', element: <AccessExplorerPage /> },
      { path: 'auth/accounts/:accountId', element: <AccountDetailPage /> },
      { path: 'auth/accounts/:accountId/access', element: <AccessEditorPage /> },
      { path: 'auth/accounts/:accountId/security', element: <AccountSecurityPage /> },
      { path: 'auth/access-control', element: <AccessControlPage /> },
      { path: 'auth/roles', element: <Navigate to="/auth/access-control?tab=roles" replace /> },
      { path: 'auth/access', element: <Navigate to="/auth/accounts" replace /> },
      { path: 'auth/access/:accountId', element: <AccessEditorPage /> },
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
