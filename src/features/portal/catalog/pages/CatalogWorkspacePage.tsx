import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams, useRouteLoaderData } from 'react-router-dom'
import { AppstoreOutlined, TableOutlined } from '@ant-design/icons'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { UiTabLabel, UiTabs } from '@/shared/ui'

import { CatalogDashboardPage } from './CatalogDashboardPage'
import { CatalogListingWorkbenchPage } from './CatalogListingWorkbenchPage'
import styles from './CatalogWorkspacePage.module.scss'
import { InternalTemplateManagementPage } from './InternalTemplateManagementPage'
import { ProductTypeManagementPage } from './ProductTypeManagementPage'

export const CatalogWorkspacePage = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { salesChannelCode: channelParam } = useParams()
  const salesChannelCode =
    channelParam && ['amazon', 'etsy', 'shopify'].includes(channelParam.toLowerCase())
      ? channelParam.toUpperCase()
      : undefined
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

  const catalogTab = location.pathname.endsWith('/listings')
    ? 'listings'
    : location.pathname.endsWith('/product-types')
      ? 'product-types'
      : location.pathname.endsWith('/templates')
        ? 'templates'
        : 'dashboard'

  if (catalogTab === 'product-types') {
    return <ProductTypeManagementPage canManage={canManageMasterData} />
  }

  if (catalogTab === 'templates') {
    return <InternalTemplateManagementPage canManage={canManageMasterData} />
  }

  const handleTabChange = (nextTab: string) => {
    if (nextTab === 'listings') navigate('/portal/catalog/listings')
    else navigate('/portal/catalog')
  }

  return (
    <UiTabs
      activeKey={catalogTab}
      className={[styles.workspace, catalogTab === 'listings' ? styles.listingsWorkspace : '']
        .filter(Boolean)
        .join(' ')}
      onChange={handleTabChange}
      destroyOnHidden
      items={[
        {
          key: 'dashboard',
          label: (
            <UiTabLabel>
              <AppstoreOutlined /> {t('portal.catalog.tabs.overview')}
            </UiTabLabel>
          ),
          children: <CatalogDashboardPage onOpenListings={() => navigate('/portal/catalog/listings')} />,
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
      ]}
    />
  )
}
