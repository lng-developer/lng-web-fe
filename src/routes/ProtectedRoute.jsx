import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import Loader from '@/components/common/Loader'
import { ROUTES } from '@/constants/routes'
import { useCurrentUserQuery } from '@/features/auth/api/auth.queries'
import { hasAnyPermission, hasRequiredPermissions } from '@/features/auth/utils/authz'
import { clearAuthTokens, getRefreshToken } from '@/services/axiosInstance'
import { useAuthStore } from '@/store/useAuthStore'

export default function ProtectedRoute({
  requiredPermissions = [],
  requiredAnyPermissions = [],
  children,
}) {
  const location = useLocation()
  const currentUser = useAuthStore((state) => state.currentUser)
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser)
  const clearCurrentUser = useAuthStore((state) => state.clearCurrentUser)
  const hasRefreshToken = Boolean(getRefreshToken())
  const currentUserQuery = useCurrentUserQuery({
    enabled: hasRefreshToken && !currentUser,
  })

  useEffect(() => {
    if (!hasRefreshToken) {
      clearCurrentUser()
    }
  }, [clearCurrentUser, hasRefreshToken])

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
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />
  }

  if (!currentUser && (currentUserQuery.isPending || currentUserQuery.isFetching)) {
    return <Loader />
  }

  if (currentUserQuery.isError) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />
  }

  const user = currentUser ?? currentUserQuery.data?.data ?? currentUserQuery.data

  if (
    !hasRequiredPermissions(user, requiredPermissions) ||
    !hasAnyPermission(user, requiredAnyPermissions)
  ) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />
  }

  return children ?? <Outlet />
}
