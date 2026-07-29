import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import Loader from '@/components/common/Loader'
import { resolveSetupRoute, ROUTES } from '@/constants/routes'
import { useCurrentUserQuery } from '@/features/auth/api/auth.queries'
import { hasAnyPermission, hasRequiredPermissions } from '@/features/auth/utils/authz'
import { useMyEmployeeProfileQuery } from '@/features/hr-time/api/hrTime.queries'
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
  const hasProfileResult = currentUser && Object.hasOwn(currentUser, 'employeeProfile')
  const employeeProfileQuery = useMyEmployeeProfileQuery({
    enabled: Boolean(currentUser?.account) && !hasProfileResult,
    retry: false,
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

  useEffect(() => {
    if (!currentUser || hasProfileResult) return
    if (employeeProfileQuery.isSuccess) {
      setCurrentUser({ ...currentUser, employeeProfile: employeeProfileQuery.data })
    } else if (employeeProfileQuery.isError) {
      setCurrentUser({ ...currentUser, employeeProfile: null })
    }
  }, [
    currentUser,
    employeeProfileQuery.data,
    employeeProfileQuery.isError,
    employeeProfileQuery.isSuccess,
    hasProfileResult,
    setCurrentUser,
  ])

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
  const setupRoute = resolveSetupRoute({
    mustChangePassword: user?.account?.mustChangePassword,
    profileSetupRequired: user?.profileSetupRequired,
  })

  if (setupRoute && location.pathname !== setupRoute) {
    return <Navigate to={setupRoute} replace />
  }

  if (!setupRoute && location.pathname === ROUTES.CHANGE_INITIAL_PASSWORD) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  if (
    !hasRequiredPermissions(user, requiredPermissions) ||
    !hasAnyPermission(user, requiredAnyPermissions)
  ) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />
  }

  return children ?? <Outlet />
}
