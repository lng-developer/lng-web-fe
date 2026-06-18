import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import Loader from '@/components/common/Loader'
import { ROUTES } from '@/constants/routes'
import { useCurrentUserQuery } from '@/features/auth/api/auth.queries'
import { clearAuthTokens, getRefreshToken } from '@/services/axiosInstance'
import { useAuthStore } from '@/store/useAuthStore'

export default function PublicRoute({ redirectTo = ROUTES.HOME, children }) {
  const currentUser = useAuthStore((state) => state.currentUser)
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser)
  const clearCurrentUser = useAuthStore((state) => state.clearCurrentUser)
  const hasRefreshToken = Boolean(getRefreshToken())
  const currentUserQuery = useCurrentUserQuery({
    enabled: hasRefreshToken && !currentUser,
  })

  useEffect(() => {
    if (currentUserQuery.isSuccess) {
      const nextUser = currentUserQuery.data?.data ?? currentUserQuery.data
      setCurrentUser(nextUser)
    }
  }, [currentUserQuery.data, currentUserQuery.isSuccess, setCurrentUser])

  useEffect(() => {
    if (currentUserQuery.isError) {
      clearAuthTokens()
      clearCurrentUser()
    }
  }, [clearCurrentUser, currentUserQuery.isError])

  if (!hasRefreshToken) {
    return children ?? <Outlet />
  }

  if (currentUser) {
    return <Navigate to={redirectTo} replace />
  }

  if (currentUserQuery.isPending || currentUserQuery.isFetching) {
    return <Loader />
  }

  if (currentUserQuery.isError) {
    return children ?? <Outlet />
  }

  const user = currentUserQuery.data?.data ?? currentUserQuery.data

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  return children ?? <Outlet />
}
