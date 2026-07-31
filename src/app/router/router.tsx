import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'

import { AppShell } from '@/app/layout/AppShell'
import {
  requirePasswordSetup,
  requireProfileSetup,
  requireWorkspace,
} from '@/features/auth/guards/accountSetupGuards'
import { LoginPage } from '@/features/auth/login/pages/LoginPage'
import { FoundationPage } from '@/features/foundation/FoundationPage'

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
