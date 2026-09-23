import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLoaderData, useLocation, useNavigate } from 'react-router-dom'
import { MenuOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Button, Drawer, Grid, Input, Layout, Select, Space, Tooltip, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { NotificationCenter } from '@/features/notifications/components/NotificationCenter'
import { ChatShell } from '@/features/portal/chat/components/ChatShell'
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'
import { ThemeSwitch } from '@/shared/theme/ThemeSwitch'

import { AccountMenu } from './AccountMenu'
import {
  type AppCoreKey,
  getAvailableCores,
  hasFinanceAccess,
  getContextNavigation,
  getCoreForPath,
  type NavigationGroup,
} from './appNavigation'
import styles from './AppShell.module.scss'
import { isCompactBreakpoint } from './appShellResponsive'
import { AppSidebar } from './AppSidebar'
import { getRememberedCoreRoute, rememberCoreRoute } from './coreRouteMemory'
import { LegacySidebar } from './LegacySidebar'
import { formatDocumentTitle, resolvePageTitle } from './pageTitle'
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
  const screens = Grid.useBreakpoint()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const [navigationSearch, setNavigationSearch] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const account = useLoaderData() as CurrentAccount
  const cores = useMemo(() => getAvailableCores(account), [account])
  const routeCore = getCoreForPath(location.pathname)
  const activeCore = routeCore ?? cores[0]?.key
  const isCompact = isCompactBreakpoint(screens)
  const groups = useMemo(
    () => (activeCore ? getContextNavigation(activeCore, account) : []),
    [account, activeCore],
  )
  const legacyBottomMenus = useMemo(
    () => ({
      portal: getContextNavigation('portal', account),
      hr: getContextNavigation('hr', account),
      system: getContextNavigation('system', account),
    }),
    [account],
  )
  const searchableGroups = useMemo(
    () =>
      navigationSearch.trim()
        ? uniqueNavigationGroups(cores.flatMap(({ key }) => getContextNavigation(key, account)))
        : groups,
    [account, cores, groups, navigationSearch],
  )
  const { selectedKey } = getSidebarRouteState(location.pathname, groups)
  const isPortalWorkbench =
    location.pathname.startsWith('/portal/orders') ||
    location.pathname.startsWith('/portal/catalog/') ||
    location.pathname.startsWith('/portal/listing') ||
    location.pathname.startsWith('/portal/shops') ||
    location.pathname.startsWith('/portal/vendors') ||
    location.pathname.startsWith('/portal/customers') ||
    location.pathname.startsWith('/portal/design') ||
    location.pathname.startsWith('/portal/production') ||
    location.pathname.startsWith('/portal/shipments') ||
    location.pathname.startsWith('/portal/work-scores') ||
    location.pathname.startsWith('/portal/vendor-submissions') ||
    location.pathname.startsWith('/portal/mapping')
  const isFixedWorkspace = location.pathname === '/portal/chat' || isPortalWorkbench
  const activeItem = groups.flatMap((group) => group.items).find(({ key }) => key === selectedKey)
  const pageTitle = resolvePageTitle(location.pathname, {
    activeLabelKey: activeItem?.labelKey,
    groups,
    t,
  })

  useEffect(() => {
    if (routeCore) rememberCoreRoute(routeCore, location.pathname, groups)
  }, [groups, location.pathname, routeCore])
  useEffect(() => {
    document.title = formatDocumentTitle(pageTitle, t('app.name', { defaultValue: 'LNG Web' }))
  }, [pageTitle, t])

  const changeCore = useCallback(
    (core: AppCoreKey) => {
      setNavigationSearch('')
      const target = getRememberedCoreRoute(core, getContextNavigation(core, account))
      if (target) navigate(target)
    },
    [account, navigate],
  )

  const refreshWorkspace = useCallback(() => void queryClient.invalidateQueries(), [queryClient])

  const handleOpenMobileNavigation = useCallback(() => setMobileNavigationOpen(true), [])
  const handleCloseMobileNavigation = useCallback(() => setMobileNavigationOpen(false), [])

  return (
    <Layout className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        {t('shell.skipToContent')}
      </a>
      {!isCompact && (
        <LegacySidebar
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          bottomMenus={legacyBottomMenus}
          accountLabel={account.account.email}
          financeVisible={hasFinanceAccess(account)}
        />
      )}
      {activeCore && isCompact && (
        <Drawer
          className={styles.mobileNavigationDrawer}
          open={mobileNavigationOpen}
          placement="left"
          title={t('shell.navigation.cores')}
          onClose={handleCloseMobileNavigation}
        >
          <Select
            aria-label={t('shell.navigation.cores')}
            className={styles.mobileCoreSelect}
            options={cores.map(({ key, labelKey }) => ({ label: t(labelKey), value: key }))}
            value={activeCore}
            onChange={(core) => changeCore(core as AppCoreKey)}
          />
          <AppSidebar
            accountLabel={account.account.email}
            coreLabel={t(`shell.cores.${activeCore}`)}
            groups={searchableGroups}
            selectedKey={selectedKey}
            collapsed={false}
            embedded
            navigationSearch={navigationSearch}
            onNavigate={handleCloseMobileNavigation}
          />
        </Drawer>
      )}

      <Layout
        className={
          !isCompact
            ? collapsed
              ? styles.legacyContentCollapsed
              : styles.legacyContentExpanded
            : undefined
        }
      >
        <Header className={styles.header}>
          <div className={styles.headerLeft}>
            {isCompact && (
              <Button
                aria-label={t('shell.openNavigation')}
                className={styles.mobileMenuButton}
                icon={<MenuOutlined />}
                type="text"
                onClick={handleOpenMobileNavigation}
              />
            )}
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
          <Space size={14} className={styles.headerActions}>
            <Tooltip title={t('shell.refresh')}>
              <Button
                type="text"
                aria-label={t('shell.refresh')}
                className={styles.headerIconButton}
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
            isPortalWorkbench ? styles.contentOrderWorkspace : undefined,
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
