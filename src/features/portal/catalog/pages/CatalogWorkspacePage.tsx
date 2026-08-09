import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { AppstoreOutlined, FileTextOutlined, TableOutlined } from '@ant-design/icons'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { UiTabLabel, UiTabs } from '@/shared/ui'

import { CatalogDashboardPage } from './CatalogDashboardPage'
import { CatalogListingWorkbenchPage } from './CatalogListingWorkbenchPage'
import { InternalTemplateManagementPage } from './InternalTemplateManagementPage'
import { ProductTypeManagementPage } from './ProductTypeManagementPage'

export function CatalogWorkspacePage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const canManageMasterData = account.permissions.includes('CATALOG:WRITE')

  return (
    <UiTabs
      destroyOnHidden={false}
      items={[
        {
          key: 'dashboard',
          label: (
            <UiTabLabel>
              <AppstoreOutlined /> Overview
            </UiTabLabel>
          ),
          children: <CatalogDashboardPage />,
        },
        {
          key: 'listings',
          label: (
            <UiTabLabel>
              <TableOutlined /> {t('portal.catalog.tabs.listings')}
            </UiTabLabel>
          ),
          children: <CatalogListingWorkbenchPage account={account} />,
        },
        {
          key: 'product-types',
          label: (
            <UiTabLabel>
              <AppstoreOutlined /> {t('portal.catalog.tabs.productTypes')}
            </UiTabLabel>
          ),
          children: <ProductTypeManagementPage canManage={canManageMasterData} />,
        },
        {
          key: 'templates',
          label: (
            <UiTabLabel>
              <FileTextOutlined /> {t('portal.catalog.tabs.templates')}
            </UiTabLabel>
          ),
          children: <InternalTemplateManagementPage canManage={canManageMasterData} />,
        },
      ]}
    />
  )
}
