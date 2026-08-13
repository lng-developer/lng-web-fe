import { useState } from 'react'
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

import {
  getNavigationGroupForItem,
  type NavigationGroup,
  type NavigationItem,
} from './appNavigation'
import styles from './AppShell.module.scss'

export function AppSidebar({
  coreLabel,
  groups,
  selectedKey,
  collapsed,
  navigationSearch,
}: {
  coreLabel: string
  groups: NavigationGroup[]
  selectedKey?: string
  collapsed: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  navigationSearch: string
}) {
  const { t } = useTranslation()
  const { resolved } = useThemePreference()
  const searchTerm = navigationSearch
  const activeGroup = getNavigationGroupForItem(groups, selectedKey)
  const [openState, setOpenState] = useState({
    selectedKey,
    key: activeGroup ? `group:${activeGroup}` : undefined,
  })
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const visibleGroups = searchTerm
    ? groups
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
    : groups

  const openKeys =
    searchTerm && visibleGroups.length
      ? visibleGroups.map((group) => `group:${group.key}`)
      : openState.selectedKey === selectedKey
        ? openState.key
          ? [openState.key]
          : activeGroup && visibleGroups.some(({ key }) => key === activeGroup)
            ? [`group:${activeGroup}`]
            : []
        : activeGroup && visibleGroups.some(({ key }) => key === activeGroup)
          ? [`group:${activeGroup}`]
          : []

  const items: MenuProps['items'] = visibleGroups.map((group) => ({
    key: `group:${group.key}`,
    icon: iconForGroup(group.key),
    label: t(group.labelKey),
    children: group.items.map((item) => ({
      key: item.key,
      icon: iconFor(item),
      label: (
        <Link to={item.path} prefetch="intent">
          {t(item.labelKey)}
        </Link>
      ),
    })),
  }))

  return (
    <Layout.Sider
      className={styles.sidebar}
      width={220}
      collapsedWidth={68}
      collapsed={collapsed}
      theme={resolved}
    >
      <div className={styles.contextTitle}>
        <Typography.Text strong>{coreLabel}</Typography.Text>
      </div>
      <nav aria-label={t('shell.navigation.primary')} className={styles.navigation}>
        <Menu
          style={{ border: 'none' }}
          mode="inline"
          inlineCollapsed={collapsed}
          triggerSubMenuAction="hover"
          openKeys={collapsed ? undefined : openKeys}
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={items}
          onOpenChange={(keys) => setOpenState({ selectedKey, key: keys.at(-1) })}
        />
      </nav>
    </Layout.Sider>
  )
}

function iconFor({ key, path }: NavigationItem) {
  const portalIcons = {
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
  if (key === 'setup') return <SettingOutlined />
  if (key === 'order-workflow') return <ShoppingCartOutlined />
  if (key === 'fulfillment') return <ToolOutlined />
  if (key === 'performance') return <BarChartOutlined />
  if (key === 'team') return <TeamOutlined />
  if (key === 'payroll') return <DollarOutlined />
  if (key === 'system') return <SafetyCertificateOutlined />
  return <UserOutlined />
}
