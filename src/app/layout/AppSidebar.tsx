import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  EditOutlined,
  FileTextOutlined,
  HistoryOutlined,
  HomeOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  ToolOutlined,
  TrophyOutlined,
  TruckOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Layout, Menu, type MenuProps, Typography } from 'antd'

import { useThemePreference } from '@/shared/theme/themeContext'

import { type NavigationGroup, type NavigationItem } from './appNavigation'
import styles from './AppShell.module.scss'

export function AppSidebar({
  accountLabel,
  coreLabel,
  groups,
  selectedKey,
  collapsed,
  embedded = false,
  navigationSearch,
  onNavigate,
}: {
  accountLabel?: string
  coreLabel: string
  groups: NavigationGroup[]
  selectedKey?: string
  collapsed: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  embedded?: boolean
  navigationSearch: string
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  const { resolved } = useThemePreference()
  const selectedGroupKey = useMemo(
    () =>
      groups.find(
        (group) => !group.standalone && group.items.some((item) => item.key === selectedKey),
      )?.key,
    [groups, selectedKey],
  )

  const visibleGroups = useMemo(() => {
    const searchTerm = navigationSearch
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!searchTerm) return groups
    return groups
      .map((group) => {
        const label = t(group.labelKey).toLowerCase()
        const filteredItems = group.items.filter((item) =>
          t(item.labelKey).toLowerCase().includes(normalizedSearch),
        )
        if (label.includes(normalizedSearch) || filteredItems.length) {
          return {
            ...group,
            items: filteredItems.length
              ? filteredItems
              : label.includes(normalizedSearch)
                ? group.items
                : [],
          }
        }
        return undefined
      })
      .filter((group): group is NavigationGroup => Boolean(group))
      .filter((group) => group.items.length)
  }, [groups, navigationSearch, t])

  const items: MenuProps['items'] = useMemo(
    () =>
      visibleGroups.flatMap((group): NonNullable<MenuProps['items']> => {
        if (group.standalone) {
          const [item] = group.items
          return item
            ? [
                {
                  key: item.key,
                  icon: iconFor(item),
                  label: (
                    <Link to={item.path} prefetch="intent" onClick={onNavigate}>
                      {t(item.labelKey)}
                    </Link>
                  ),
                },
              ]
            : []
        }
        return [
          {
            key: `group:${group.key}`,
            icon: iconForGroup(group.key),
            label: t(group.labelKey),
            children: group.items.map((item) => ({
              key: item.key,
              icon: iconFor(item),
              label: (
                <Link to={item.path} prefetch="intent" onClick={onNavigate}>
                  {t(item.labelKey)}
                </Link>
              ),
            })),
          },
        ]
      }),
    [onNavigate, t, visibleGroups],
  )

  const navigation = (
    <nav
      aria-label={t('shell.navigation.primary')}
      className={embedded ? styles.mobileNavigation : styles.navigation}
    >
      <Menu
        key={selectedGroupKey ?? 'no-selected-group'}
        style={{ border: 'none' }}
        mode="inline"
        inlineCollapsed={collapsed}
        triggerSubMenuAction="hover"
        defaultOpenKeys={selectedGroupKey ? [`group:${selectedGroupKey}`] : undefined}
        selectedKeys={selectedKey ? [selectedKey] : []}
        items={items}
      />
    </nav>
  )

  if (embedded) return navigation

  return (
    <Layout.Sider
      aria-label={coreLabel}
      className={styles.sidebar}
      width={202}
      collapsedWidth={52}
      collapsed={collapsed}
      theme={resolved}
    >
      <div className={styles.sidebarIdentity}>
        <Typography.Text strong className={styles.sidebarIdentityName}>
          {t('shell.legacySystemName')}
        </Typography.Text>
        {accountLabel && (
          <Typography.Text className={styles.sidebarIdentityAccount}>
            {accountLabel}
          </Typography.Text>
        )}
      </div>
      {navigation}
    </Layout.Sider>
  )
}

function iconFor({ key, path }: NavigationItem) {
  const portalIcons = {
    'operations-dashboard': <HomeOutlined />,
    shops: <ShopOutlined />,
    catalog: <AppstoreOutlined />,
    vendors: <TruckOutlined />,
    media: <PictureOutlined />,
    integrations: <ApiOutlined />,
    orders: <ShoppingCartOutlined />,
    customizations: <EditOutlined />,
    mapping: <ApartmentOutlined />,
    design: <EditOutlined />,
    production: <ToolOutlined />,
    'vendor-submissions': <SendOutlined />,
    shipments: <CarOutlined />,
    finance: <DollarOutlined />,
    settlements: <DollarOutlined />,
    reports: <BarChartOutlined />,
    'work-scores': <TrophyOutlined />,
    accounts: <UserOutlined />,
    'access-control': <SafetyCertificateOutlined />,
    'audit-log': <HistoryOutlined />,
  }
  if (key in portalIcons) return portalIcons[key as keyof typeof portalIcons]
  if (key.includes('schedule')) return <CalendarOutlined />
  if (key.includes('attendance')) return <ClockCircleOutlined />
  if (key.includes('request') || key.includes('approval')) return <FileTextOutlined />
  if (key.includes('payroll')) return <DollarOutlined />
  if (key.includes('member') || key === 'team') return <TeamOutlined />
  if (key === 'organization') return <ApartmentOutlined />
  if (path.startsWith('/auth')) return <SafetyCertificateOutlined />
  return <UserOutlined />
}

function iconForGroup(key: string) {
  if (key === 'dashboard') return <HomeOutlined />
  if (key === 'orders') return <ShoppingCartOutlined />
  if (key === 'team-tasks') return <TeamOutlined />
  if (key === 'listing') return <AppstoreOutlined />
  if (key === 'cost-centers') return <DollarOutlined />
  if (key === 'reports') return <BarChartOutlined />
  if (key === 'monitoring') return <HistoryOutlined />
  if (key === 'configuration') return <SettingOutlined />
  if (key === 'personal') return <UserOutlined />
  if (key === 'team') return <TeamOutlined />
  if (key === 'operations') return <CalendarOutlined />
  if (key === 'payroll') return <DollarOutlined />
  if (key === 'system') return <SafetyCertificateOutlined />
  return <AppstoreOutlined />
}
