import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SafetyCertificateOutlined } from '@ant-design/icons'
import { Tabs, type TabsProps } from 'antd'

import { PermissionsPage } from '@/features/auth/permissions/pages/PermissionsPage'
import { RolesPage } from '@/features/auth/roles/pages/RolesPage'
import { ScopesPage } from '@/features/auth/scopes/pages/ScopesPage'
import { PageHeader } from '@/shared/ui'

import styles from './AccessControlPage.module.scss'

const tabKeys = ['roles', 'permissions', 'scopes'] as const
type AccessControlTab = (typeof tabKeys)[number]

function isAccessControlTab(value: string | null): value is AccessControlTab {
  return tabKeys.some((tab) => tab === value)
}

export function AccessControlPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const activeTab: AccessControlTab = isAccessControlTab(requestedTab) ? requestedTab : 'roles'
  const items: TabsProps['items'] = [
    { key: 'roles', label: t('auth.accessControl.roles'), children: <RolesPage /> },
    {
      key: 'permissions',
      label: t('auth.accessControl.permissions'),
      children: <PermissionsPage />,
    },
    { key: 'scopes', label: t('auth.accessControl.scopes'), children: <ScopesPage /> },
  ]

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('auth.accessControl.title')}
        description={t('auth.accessControl.description')}
        actions={<SafetyCertificateOutlined className={styles.icon} aria-hidden />}
      />
      <Tabs
        activeKey={activeTab}
        className={styles.tabs}
        items={items}
        onChange={(tab) => navigate({ search: `?tab=${tab}` })}
      />
    </section>
  )
}
