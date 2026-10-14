import { useMemo } from 'react'
import { Navigate, useLocation, useRouteLoaderData } from 'react-router-dom'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { getPermissions } from '@/shared/auth/session'

import { getDefaultHrPath, getHrNavigation } from '../hrNavigation'
import { hasHrAccess } from '../hrViews'
import { HrActionPage } from './HrActionPage'
import { HrDashboardPage } from './HrDashboardPage'
import styles from './HrModulePage.module.scss'

export function HrModulePage() {
  const location = useLocation()
  const loadedAccount = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const permissions = useMemo(() => {
    if (loadedAccount?.permissions) {
      return new Set(loadedAccount.permissions)
    }
    return new Set(getPermissions())
  }, [loadedAccount])

  const navigation = useMemo(
    () => getHrNavigation(permissions, { includeSelf: true }),
    [permissions],
  )
  const path = location.pathname.replace(/\/$/, '')
  const route = navigation.find((item) => item.path === path)
  const canAccessDashboard = hasHrAccess(permissions)
  const defaultPath = getDefaultHrPath(permissions) ?? '/hr/me'

  if (path === '/hr' || path === '') {
    return <Navigate to={canAccessDashboard ? '/hr/dashboard' : defaultPath} replace />
  }

  if (path === '/hr/dashboard') {
    if (!canAccessDashboard) {
      return <Navigate to={defaultPath} replace />
    }
    return <HrDashboardPage />
  }

  if (!route) {
    return <Navigate to={defaultPath} replace />
  }

  return (
    <section className={styles.page}>
      <HrActionPage routeKey={route.key} />
    </section>
  )
}

