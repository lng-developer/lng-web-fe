import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ApartmentOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Layout, Menu, type MenuProps, Typography } from 'antd'

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
}: {
  coreLabel: string
  groups: NavigationGroup[]
  selectedKey?: string
  collapsed: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}) {
  const { t } = useTranslation()
  const activeGroup = getNavigationGroupForItem(groups, selectedKey)
  const [openKeys, setOpenKeys] = useState(activeGroup ? [`group:${activeGroup}`] : [])

  const items: MenuProps['items'] = groups.map((group) => ({
    key: `group:${group.key}`,
    label: t(group.labelKey),
    children: group.items.map((item) => ({
      key: item.key,
      icon: iconFor(item),
      label: <Link to={item.path}>{t(item.labelKey)}</Link>,
    })),
  }))

  return (
    <Layout.Sider
      className={styles.sidebar}
      width={220}
      collapsedWidth={0}
      collapsed={collapsed}
      theme="light"
    >
      <div className={styles.contextTitle}>
        <Typography.Text strong>{coreLabel}</Typography.Text>
      </div>
      <nav aria-label={t('shell.navigation.primary')} className={styles.navigation}>
        <Menu
          mode="inline"
          openKeys={openKeys}
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={items}
          onOpenChange={(keys) => setOpenKeys(keys.length ? [keys.at(-1)!] : [])}
        />
      </nav>
    </Layout.Sider>
  )
}

function iconFor({ key, path }: NavigationItem) {
  if (key.includes('schedule')) return <CalendarOutlined />
  if (key.includes('attendance')) return <ClockCircleOutlined />
  if (key.includes('request') || key.includes('approval')) return <FileTextOutlined />
  if (key.includes('payroll')) return <DollarOutlined />
  if (key.includes('member') || key === 'team') return <TeamOutlined />
  if (key === 'organization') return <ApartmentOutlined />
  if (path.startsWith('/auth')) return <SafetyCertificateOutlined />
  return <UserOutlined />
}
