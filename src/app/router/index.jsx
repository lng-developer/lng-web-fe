/* eslint-disable react-refresh/only-export-components -- file cấu hình router, không phải component */
import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { ROUTES } from '@/constants/routes'
import MainLayout from '@/layouts/MainLayout'

const HomePage = lazy(() => import('@/features/home/pages/HomePage'))
const UiKitPage = lazy(() => import('@/features/ui-kit/pages/UiKitPage'))

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      // Path tương đối so với MainLayout - ROUTES.UI_KIT ('/ui-kit') dùng cho NavLink.
      { path: 'ui-kit', element: <UiKitPage /> },
    ],
  },
])
