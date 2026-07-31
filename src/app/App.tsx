import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { SESSION_EXPIRED_EVENT } from '@/shared/auth/session'
import { queryClient } from '@/shared/query/queryClient'

import { AppProviders } from './providers/AppProviders'
import { router } from './router/router'

export function App() {
  useEffect(() => {
    const redirectToLogin = () => {
      queryClient.clear()
      void router.navigate('/login', { replace: true })
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, redirectToLogin)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, redirectToLogin)
  }, [])

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
