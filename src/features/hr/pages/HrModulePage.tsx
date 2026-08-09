import { useMemo } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { getPermissions } from '@/shared/auth/session'

import { getDefaultHrPath, getHrNavigation } from '../hrNavigation'
import { HrActionPage } from './HrActionPage'
import styles from './HrModulePage.module.scss'

export function HrModulePage() {
  const location = useLocation()
  const permissions = useMemo(() => getPermissions(), [])
  const navigation = useMemo(() => getHrNavigation(permissions), [permissions])
  const path = location.pathname.replace(/\/$/, '')
  const route = navigation.find((item) => item.path === path)
  const defaultPath = getDefaultHrPath(permissions)

  if (!route) return <Navigate to={defaultPath ?? '/operations-dashboard'} replace />

  return (
    <section className={styles.page}>
      <HrActionPage routeKey={route.key} />
    </section>
  )
}
