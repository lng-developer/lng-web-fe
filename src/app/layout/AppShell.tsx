import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLoaderData, useLocation, useNavigate } from 'react-router-dom'
import { MenuOutlined, ReloadOutlined } from '@ant-design/icons'
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Drawer, Grid, Layout, Select, Space, Tooltip, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { getUnreadCount } from '@/features/notifications/api/notificationApi'
import { NotificationCenter } from '@/features/notifications/components/NotificationCenter'
import { getChatUnreadCount } from '@/features/portal/chat/api/chatApi'
import { chatKeys } from '@/features/portal/chat/api/chatKeys'
import { ChatShell } from '@/features/portal/chat/components/ChatShell'
import { useDocumentTitleBadge } from '@/shared/hooks/useDocumentTitleBadge'
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'
import { useTitleFlashStore } from '@/shared/notification'
import { ThemeSwitch } from '@/shared/theme/ThemeSwitch'
import { ContentErrorBoundary } from '@/shared/ui'

import { AccountMenu } from './AccountMenu'
import { TeamsSetupPrompt } from './TeamsSetupPrompt'
import {
  type AppCoreKey,
  getAvailableCores,
  hasFinanceAccess,
  getContextNavigation,
  getCoreForPath,
} from './appNavigation'
import styles from './AppShell.module.scss'
import { isCompactBreakpoint } from './appShellResponsive'
import { AppSidebar } from './AppSidebar'
import { getRememberedCoreRoute, rememberCoreRoute } from './coreRouteMemory'
import { LegacySidebar } from './LegacySidebar'
import { NavigationSearch } from './NavigationSearch'
import { resolvePageTitle } from './pageTitle'
import { getSidebarRouteState } from './sidebarRouteState'

const { Content, Header } = Layout

export function AppShell() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isFetching = useIsFetching()
  const screens = Grid.useBreakpoint()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
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
  const { data: chatUnreadData } = useQuery({
    queryKey: chatKeys.unread,
    queryFn: getChatUnreadCount,
    refetchInterval: 30_000,
  })
  const { data: notiUnreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
  })
  const totalUnread = (chatUnreadData?.unreadCount ?? 0) + (notiUnreadData?.unreadCount ?? 0)
  const flashMessage = useTitleFlashStore((s) => s.flashMessage)
  const clearFlashMessage = useTitleFlashStore((s) => s.clearFlashMessage)

  useDocumentTitleBadge({
    pageTitle,
    appName: t('app.name', { defaultValue: 'LNG Web' }),
    unreadCount: totalUnread,
    flashMessage,
    onClearFlash: clearFlashMessage,
  })

  const changeCore = useCallback(
    (core: AppCoreKey) => {
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
          account={account}
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
            groups={groups}
            selectedKey={selectedKey}
            collapsed={false}
            embedded
            navigationSearch=""
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
            <NavigationSearch account={account} className={styles.navSearch} />
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
          <TeamsSetupPrompt key={account.account.id} accountId={account.account.id} />
          <div className={`${styles.workspace} ${isFixedWorkspace ? styles.workspaceFixed : ''}`}>
            <ContentErrorBoundary>
              <Outlet />
            </ContentErrorBoundary>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
