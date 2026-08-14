import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLoaderData, useLocation, useNavigate } from 'react-router-dom'
import { Input, Layout, Space } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { NotificationCenter } from '@/features/notifications/components/NotificationCenter'
import { ChatShell } from '@/features/portal/chat/components/ChatShell'
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'
import { ThemeSwitch } from '@/shared/theme/ThemeSwitch'

import { AccountMenu } from './AccountMenu'
import {
  type AppCoreKey,
  getAvailableCores,
  getContextNavigation,
  getCoreForPath,
} from './appNavigation'
import { AppRail } from './AppRail'
import styles from './AppShell.module.scss'
import { AppSidebar } from './AppSidebar'
import { getRememberedCoreRoute, rememberCoreRoute } from './coreRouteMemory'
import { getSidebarRouteState } from './sidebarRouteState'

const { Content, Header } = Layout

export function AppShell() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const [navigationSearch, setNavigationSearch] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const account = useLoaderData() as CurrentAccount
  const cores = useMemo(() => getAvailableCores(account), [account])
  const routeCore = getCoreForPath(location.pathname)
  const activeCore = routeCore ?? cores[0]?.key
  const groups = useMemo(
    () => (activeCore ? getContextNavigation(activeCore, account) : []),
    [account, activeCore],
  )
  const searchableGroups = useMemo(
    () =>
      navigationSearch.trim()
        ? cores.flatMap(({ key }) => getContextNavigation(key, account))
        : groups,
    [account, cores, groups, navigationSearch],
  )
  const { selectedKey } = getSidebarRouteState(location.pathname, groups)
  const isFixedWorkspace = location.pathname === '/portal/chat'
  const activeItem = groups.flatMap((group) => group.items).find(({ key }) => key === selectedKey)
  const pageTitle = activeItem
    ? t(activeItem.labelKey)
    : t(
        routeCore && activeCore
          ? `shell.cores.${activeCore}`
          : 'shell.navigation.operationsDashboard',
      )

  useEffect(() => {
    if (routeCore) rememberCoreRoute(routeCore, location.pathname, groups)
  }, [groups, location.pathname, routeCore])
  useEffect(() => {
    document.title = `${pageTitle} | ${t('app.name')}`
  }, [pageTitle, t])
  const changeCore = (core: AppCoreKey) => {
    setNavigationSearch('')
    const target = getRememberedCoreRoute(core, getContextNavigation(core, account))
    if (target) navigate(target)
  }
  return (
    <Layout className={styles.shell}>
      <AppRail
        cores={cores}
        activeCore={activeCore}
        contextCollapsed={collapsed}
        onCoreChange={changeCore}
        onContextCollapsedChange={setCollapsed}
      />
      {activeCore && (
        <AppSidebar
          coreLabel={t(`shell.cores.${activeCore}`)}
          groups={searchableGroups}
          selectedKey={selectedKey}
          collapsed={collapsed}
          navigationSearch={navigationSearch}
        />
      )}

      <Layout>
        <Header className={styles.header}>
          <div className={styles.headerLeft}>
            <Input.Search
              value={navigationSearch}
              onChange={(event) => setNavigationSearch(event.target.value)}
              allowClear
              placeholder={t('shell.searchPlaceholder')}
              className={styles.navSearch}
            />
          </div>
          <Space size={10} className={styles.headerActions}>
            <ChatShell account={account} />
            <NotificationCenter />
            <ThemeSwitch />
            <LanguageSwitch />
            <AccountMenu account={account} />
          </Space>
        </Header>

        <Content className={`${styles.content} ${isFixedWorkspace ? styles.contentFixed : ''}`}>
          <div className={`${styles.workspace} ${isFixedWorkspace ? styles.workspaceFixed : ''}`}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
