import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLoaderData, useLocation, useNavigate } from 'react-router-dom'
import { Breadcrumb, Layout, Space } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { NotificationCenter } from '@/features/notifications/components/NotificationCenter'
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'
import { ThemeSwitch } from '@/shared/theme/ThemeSwitch'

import { AccountMenu } from './AccountMenu'
import {
  type AppCoreKey,
  getAvailableCores,
  getContextNavigation,
  getCoreForPath,
  getNavigationGroupForItem,
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
  const { selectedKey } = getSidebarRouteState(location.pathname, groups)
  const activeGroup = getNavigationGroupForItem(groups, selectedKey)
  const activeItem = groups.flatMap((group) => group.items).find(({ key }) => key === selectedKey)

  useEffect(() => {
    if (routeCore) rememberCoreRoute(routeCore, location.pathname, groups)
  }, [groups, location.pathname, routeCore])

  const changeCore = (core: AppCoreKey) => {
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
          key={`${activeCore}:${activeGroup ?? 'none'}`}
          coreLabel={t(`shell.cores.${activeCore}`)}
          groups={groups}
          selectedKey={selectedKey}
          collapsed={collapsed}
        />
      )}

      <Layout>
        <Header className={styles.header}>
          <Breadcrumb
            className={styles.breadcrumb}
            items={[
              { title: t('shell.workspace') },
              {
                title: activeItem
                  ? t(activeItem.labelKey)
                  : t(activeCore ? `shell.cores.${activeCore}` : 'shell.navigation.foundation'),
              },
            ]}
          />
          <Space size={12}>
            <ThemeSwitch />
            <LanguageSwitch />
            <NotificationCenter />
            <AccountMenu account={account} />
          </Space>
        </Header>

        <Content className={styles.content}>
          <div className={styles.workspace}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
