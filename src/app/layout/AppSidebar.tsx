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
import { Layout, Menu, type MenuProps } from 'antd'

import { useThemePreference } from '@/shared/theme/themeContext'

import { type NavigationGroup, type NavigationItem } from './appNavigation'
import styles from './AppShell.module.scss'

export function AppSidebar({
  coreLabel,
  groups,
  selectedKey,
  collapsed,
  embedded = false,
  navigationSearch,
  onNavigate,
}: {
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
  const searchTerm = navigationSearch
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

  const openKeys = visibleGroups
    .filter((group) => !group.standalone)
    .map((group) => `group:${group.key}`)

  const items: MenuProps['items'] = visibleGroups.flatMap(
    (group): NonNullable<MenuProps['items']> => {
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
          icon: collapsed ? iconForGroup(group.key) : undefined,
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
    },
  )

  const navigation = (
    <nav
      aria-label={t('shell.navigation.primary')}
      className={embedded ? styles.mobileNavigation : styles.navigation}
    >
      <Menu
        style={{ border: 'none' }}
        mode="inline"
        inlineCollapsed={collapsed}
        triggerSubMenuAction="hover"
        openKeys={collapsed ? undefined : openKeys}
        expandIcon={() => null}
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
      width={240}
      collapsedWidth={68}
      collapsed={collapsed}
      theme={resolved}
    >
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
  if (key === 'setup') return <SettingOutlined />
  if (key === 'order-workflow') return <ShoppingCartOutlined />
  if (key === 'fulfillment') return <ToolOutlined />
  if (key === 'performance') return <BarChartOutlined />
  if (key === 'personal') return <UserOutlined />
  if (key === 'team') return <TeamOutlined />
  if (key === 'operations') return <CalendarOutlined />
  if (key === 'payroll') return <DollarOutlined />
  if (key === 'system') return <SafetyCertificateOutlined />
  return <AppstoreOutlined />
}
