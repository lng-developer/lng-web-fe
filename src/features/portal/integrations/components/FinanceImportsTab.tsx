import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import { UiButtonTabs } from '@/shared/ui'

import { canReadFinanceImports } from '../auth/integrationAccess'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'
import { AdsMappingSection } from './AdsMappingSection'
import { FinanceImportSection } from './FinanceImportSection'

export type FinanceTab = 'ads' | 'ads-mapping' | 'transactions' | 'settlements'

export interface FinanceImportsTabProps {
  readonly account: CurrentAccount
  readonly shops: Shop[]
  readonly isShopsLoading: boolean
  readonly shopNames: Map<string, string>
}

export function FinanceImportsTab({
  account,
  shops,
  isShopsLoading,
  shopNames,
}: FinanceImportsTabProps) {
  const { t } = useTranslation()
  const [activeFinanceTab, setActiveFinanceTab] = useState<FinanceTab>('ads')

  const canReadAdsImports = canReadFinanceImports(account)
  const canManageAdsMappings = account.permissions.includes('FINANCE:WRITE')

  return (
    <>
      <UiButtonTabs
        className={styles.segmentedTabs}
        value={activeFinanceTab}
        onChange={(tab) => setActiveFinanceTab(tab as FinanceTab)}
        items={[
          { value: 'ads', label: 'Ads' },
          { value: 'ads-mapping', label: 'Ads mapping' },
          { value: 'transactions', label: 'Transactions' },
          { value: 'settlements', label: 'Settlements' },
        ]}
      />
      {activeFinanceTab === 'ads' ? (
        <FinanceImportSection
          title={t('portal.integrations.ads.title', { defaultValue: 'Amazon Ads imports' })}
          permissionHint={t('portal.integrations.ads.permissionHint', {
            defaultValue: 'Finance read permission is required to view Ads import history.',
          })}
          sourceType="ADS"
          canRead={canReadAdsImports}
          shops={shops}
          isShopsLoading={isShopsLoading}
          shopNames={shopNames}
          isActiveTab={activeFinanceTab === 'ads'}
        />
      ) : null}
      {activeFinanceTab === 'ads-mapping' ? (
        <AdsMappingSection
          canRead={canReadAdsImports}
          canManage={canManageAdsMappings}
          shops={shops}
          isActiveTab={activeFinanceTab === 'ads-mapping'}
        />
      ) : null}
      {activeFinanceTab === 'transactions' ? (
        <FinanceImportSection
          title={t('portal.integrations.transactions.title', {
            defaultValue: 'Amazon Transactions imports',
          })}
          permissionHint={t('portal.integrations.transactions.permissionHint', {
            defaultValue:
              'Finance read permission is required to view Transactions import history.',
          })}
          sourceType="TRANSACTIONS"
          canRead={canReadAdsImports}
          shops={shops}
          isShopsLoading={isShopsLoading}
          shopNames={shopNames}
          isActiveTab={activeFinanceTab === 'transactions'}
        />
      ) : null}
      {activeFinanceTab === 'settlements' ? (
        <FinanceImportSection
          title={t('portal.integrations.settlements.title', {
            defaultValue: 'Amazon Settlements imports',
          })}
          permissionHint={t('portal.integrations.settlements.permissionHint', {
            defaultValue: 'Finance read permission is required to view Settlements import history.',
          })}
          sourceType="SETTLEMENTS"
          canRead={canReadAdsImports}
          shops={shops}
          isShopsLoading={isShopsLoading}
          shopNames={shopNames}
          isActiveTab={activeFinanceTab === 'settlements'}
        />
      ) : null}
    </>
  )
}
