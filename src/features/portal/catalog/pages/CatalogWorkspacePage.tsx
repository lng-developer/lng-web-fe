import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { Tabs } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'

import { CatalogListingWorkbenchPage } from './CatalogListingWorkbenchPage'
import { InternalTemplateManagementPage } from './InternalTemplateManagementPage'
import { ProductTypeManagementPage } from './ProductTypeManagementPage'

export function CatalogWorkspacePage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const canManageMasterData = account.permissions.includes('CATALOG:WRITE')

  return (
    <Tabs
      destroyOnHidden={false}
      items={[
        {
          key: 'listings',
          label: t('portal.catalog.tabs.listings'),
          children: <CatalogListingWorkbenchPage account={account} />,
        },
        {
          key: 'product-types',
          label: t('portal.catalog.tabs.productTypes'),
          children: <ProductTypeManagementPage canManage={canManageMasterData} />,
        },
        {
          key: 'templates',
          label: t('portal.catalog.tabs.templates'),
          children: <InternalTemplateManagementPage canManage={canManageMasterData} />,
        },
      ]}
    />
  )
}
