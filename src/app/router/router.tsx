import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'

import { AppShell } from '@/app/layout/AppShell'
import { FoundationPage } from '@/features/foundation/FoundationPage'

import { NotFoundPage } from './NotFoundPage'
import { RouteErrorPage } from './RouteErrorPage'

export const appRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/foundation" replace /> },
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
