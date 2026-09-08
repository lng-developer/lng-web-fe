import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useRouteLoaderData } from 'react-router-dom'
import { AppstoreOutlined, FileTextOutlined, TableOutlined } from '@ant-design/icons'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { UiTabLabel, UiTabs } from '@/shared/ui'

import { CatalogDashboardPage } from './CatalogDashboardPage'
import { CatalogListingWorkbenchPage } from './CatalogListingWorkbenchPage'
import styles from './CatalogWorkspacePage.module.scss'
import { InternalTemplateManagementPage } from './InternalTemplateManagementPage'
import { ProductTypeManagementPage } from './ProductTypeManagementPage'

export const CatalogWorkspacePage = () => {
  const { t } = useTranslation()
  const { salesChannelCode: channelParam } = useParams()
  const salesChannelCode =
    channelParam && ['amazon', 'etsy', 'shopify'].includes(channelParam.toLowerCase())
      ? channelParam.toUpperCase()
      : undefined
  const [activeTab, setActiveTab] = useState(salesChannelCode ? 'listings' : 'dashboard')
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const canManageMasterData = account.permissions.includes('CATALOG:WRITE')

  if (salesChannelCode) {
    return (
      <CatalogListingWorkbenchPage
        account={account}
        fixedSalesChannelCode={salesChannelCode}
        hideCatalogHeader
      />
    )
  }

  return (
    <UiTabs
      activeKey={activeTab}
      className={[styles.workspace, activeTab === 'listings' ? styles.listingsWorkspace : '']
        .filter(Boolean)
        .join(' ')}
      onChange={setActiveTab}
      destroyOnHidden
      items={[
        {
          key: 'dashboard',
          label: (
            <UiTabLabel>
              <AppstoreOutlined /> {t('portal.catalog.tabs.overview')}
            </UiTabLabel>
          ),
          children: <CatalogDashboardPage onOpenListings={() => setActiveTab('listings')} />,
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
