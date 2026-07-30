import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'

import { AppShell } from '@/app/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { requireAuth } from '@/features/auth/requireAuth'
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
