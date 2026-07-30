import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  AppstoreOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Breadcrumb, Button, Layout, Menu, Space, Typography } from 'antd'

import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'
import { ThemeSwitch } from '@/shared/theme/ThemeSwitch'

import styles from './AppShell.module.scss'

const { Content, Header, Sider } = Layout
const { Text } = Typography

export function AppShell() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <Layout className={styles.shell}>
      <Sider
        className={styles.sidebar}
        width={248}
        collapsedWidth={72}
        collapsed={collapsed}
        theme="light"
      >
        <Link className={styles.brand} to="/foundation" aria-label="LNG Web">
          <span className={styles.brandMark}>L</span>
          {!collapsed && <Text strong>LNG Web</Text>}
        </Link>

        <nav aria-label={t('shell.navigation.primary')} className={styles.navigation}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            inlineCollapsed={collapsed}
            items={[
              {
                key: '/foundation',
                icon: <AppstoreOutlined />,
                label: <Link to="/foundation">{t('shell.navigation.foundation')}</Link>,
              },
            ]}
          />
        </nav>

        <Button
          className={styles.collapseButton}
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          aria-label={collapsed ? t('shell.expand') : t('shell.collapse')}
          onClick={() => setCollapsed((current) => !current)}
        />
      </Sider>

      <Layout>
        <Header className={styles.header}>
          <Breadcrumb
            items={[{ title: t('shell.workspace') }, { title: t('shell.navigation.foundation') }]}
          />
          <Space size={12}>
            <ThemeSwitch />
            <LanguageSwitch />
            <Avatar icon={<UserOutlined />} />
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
