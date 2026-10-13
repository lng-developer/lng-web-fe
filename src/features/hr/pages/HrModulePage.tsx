import { useMemo } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { getPermissions } from '@/shared/auth/session'

import { getDefaultHrPath, getHrNavigation } from '../hrNavigation'
import { hasHrAccess } from '../hrViews'
import { HrActionPage } from './HrActionPage'
import { HrDashboardPage } from './HrDashboardPage'
import styles from './HrModulePage.module.scss'

export function HrModulePage() {
  const location = useLocation()
  const permissions = useMemo(() => new Set(getPermissions()), [])

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

