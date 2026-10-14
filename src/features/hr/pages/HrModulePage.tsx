import { useMemo } from 'react'
import { Navigate, useLocation, useRouteLoaderData } from 'react-router-dom'

import type { CurrentAccount } from '@/features/auth/api/authApi'

import { getDefaultHrPath, getHrNavigation } from '../hrNavigation'
import { getHrAccess, hasHrAccess } from '../hrViews'
import { HrActionPage } from './HrActionPage'
import { HrDashboardPage } from './HrDashboardPage'
import styles from './HrModulePage.module.scss'

export function HrModulePage() {
  const location = useLocation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const access = useMemo(() => getHrAccess(account), [account])
  const navigation = useMemo(() => getHrNavigation(access), [access])
  const path = location.pathname.replace(/\/$/, '')
  const route = navigation.find((item) => item.path === path)
  const defaultPath = getDefaultHrPath(access)

  if (path === '/hr/dashboard' && hasHrAccess(access.globalPermissions)) return <HrDashboardPage />

  if (!route) return <Navigate to={defaultPath ?? '/operations-dashboard'} replace />

  return (
    <section className={styles.page}>
      <HrActionPage routeKey={route.key} />
    </section>
  )
}
