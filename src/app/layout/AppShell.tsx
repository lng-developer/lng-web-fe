import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppstoreOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Breadcrumb, Button, Layout, Menu, Space, Typography } from 'antd'

import { logout } from '@/features/auth/api/authApi'
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'
import { ThemeSwitch } from '@/shared/theme/ThemeSwitch'

import styles from './AppShell.module.scss'

const { Content, Header, Sider } = Layout
const { Text } = Typography

export function AppShell() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isAccountsRoute =
    location.pathname.startsWith('/auth/accounts') || location.pathname.startsWith('/auth/access')
  const isAccessControlRoute =
    location.pathname.startsWith('/auth/access-control') ||
    location.pathname.startsWith('/auth/roles')
  const selectedKey = isAccountsRoute
    ? '/auth/accounts'
    : isAccessControlRoute
      ? '/auth/access-control'
      : location.pathname

  async function handleLogout() {
    setIsLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <Layout className={styles.shell}>
      <Sider
        className={styles.sidebar}
        width={248}
        collapsedWidth={0}
        collapsed={collapsed}
        breakpoint="lg"
        theme="light"
        onBreakpoint={setCollapsed}
      >
        <Link className={styles.brand} to="/foundation" aria-label="LNG Web">
          <span className={styles.brandMark}>L</span>
          {!collapsed && <Text strong>LNG Web</Text>}
        </Link>

        <nav aria-label={t('shell.navigation.primary')} className={styles.navigation}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            inlineCollapsed={collapsed}
            items={[
              {
                key: '/foundation',
                icon: <AppstoreOutlined />,
                label: <Link to="/foundation">{t('shell.navigation.foundation')}</Link>,
              },
              {
                key: '/auth/accounts',
                icon: <SafetyCertificateOutlined />,
                label: <Link to="/auth/accounts">{t('shell.navigation.accounts')}</Link>,
              },
              {
                key: '/auth/access-control',
                icon: <SafetyCertificateOutlined />,
                label: <Link to="/auth/access-control">{t('shell.navigation.accessControl')}</Link>,
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
            className={styles.breadcrumb}
            items={[
              { title: t('shell.workspace') },
              {
                title: t(
                  isAccountsRoute
                    ? 'shell.navigation.accounts'
                    : isAccessControlRoute
                      ? 'shell.navigation.accessControl'
                      : 'shell.navigation.foundation',
                ),
              },
            ]}
          />
          <Space size={12}>
            <ThemeSwitch />
            <LanguageSwitch />
            <Avatar icon={<UserOutlined />} />
            <Button
              aria-label={t('shell.logout')}
              type="text"
              icon={<LogoutOutlined />}
              loading={isLoggingOut}
              onClick={handleLogout}
            />
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
