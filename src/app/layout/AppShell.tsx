import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLoaderData, useLocation, useNavigate } from 'react-router-dom'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Layout, Space, Tooltip, Typography } from 'antd'

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
  type NavigationGroup,
} from './appNavigation'
import { AppRail } from './AppRail'
import styles from './AppShell.module.scss'
import { AppSidebar } from './AppSidebar'
import { getRememberedCoreRoute, rememberCoreRoute } from './coreRouteMemory'
import { getSidebarRouteState } from './sidebarRouteState'

const { Content, Header } = Layout

function uniqueNavigationGroups(groups: NavigationGroup[]) {
  const seenItems = new Set<string>()
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const key = `${item.key}:${item.path}`
        if (seenItems.has(key)) return false
        seenItems.add(key)
        return true
      }),
    }))
    .filter(({ items }) => items.length)
}

export function AppShell() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isFetching = useIsFetching()
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
        ? uniqueNavigationGroups(cores.flatMap(({ key }) => getContextNavigation(key, account)))
        : groups,
    [account, cores, groups, navigationSearch],
  )
  const { selectedKey } = getSidebarRouteState(location.pathname, groups)
  const isOrderWorkspace = location.pathname === '/portal/orders'
  const isFixedWorkspace = location.pathname === '/portal/chat' || isOrderWorkspace
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
  const refreshWorkspace = () => void queryClient.invalidateQueries()
  return (
    <Layout className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        {t('shell.skipToContent')}
      </a>
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
            <div className={styles.headerContext}>
              <Typography.Text className={styles.headerCore}>
                {activeCore ? t(`shell.cores.${activeCore}`) : t('app.name')}
              </Typography.Text>
              <Typography.Text strong className={styles.headerTitle}>
                {pageTitle}
              </Typography.Text>
            </div>
            <Input
              value={navigationSearch}
              onChange={(event) => setNavigationSearch(event.target.value)}
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t('shell.searchPlaceholder')}
              className={styles.navSearch}
            />
          </div>
          <Space size={10} className={styles.headerActions}>
            <Tooltip title={t('shell.refresh')}>
              <Button
                type="text"
                aria-label={t('shell.refresh')}
                icon={<ReloadOutlined spin={isFetching > 0} />}
                onClick={refreshWorkspace}
              />
            </Tooltip>
            <ChatShell account={account} />
            <NotificationCenter />
            <ThemeSwitch />
            <LanguageSwitch />
            <AccountMenu account={account} />
          </Space>
        </Header>

        <Content
          id="main-content"
          role="main"
          className={[
            styles.content,
            isFixedWorkspace ? styles.contentFixed : undefined,
            isOrderWorkspace ? styles.contentOrderWorkspace : undefined,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={`${styles.workspace} ${isFixedWorkspace ? styles.workspaceFixed : ''}`}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
