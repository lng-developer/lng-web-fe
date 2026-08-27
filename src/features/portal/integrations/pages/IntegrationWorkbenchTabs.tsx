import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { UploadOutlined } from '@ant-design/icons'
import { Button } from 'antd'

import { UiTabLabel, UiTabs } from '@/shared/ui'

import styles from './IntegrationWorkbenchPage.module.scss'

export type IntegrationWorkbenchTab = 'orders' | 'extension' | 'finance'

interface IntegrationWorkbenchTabsProps {
  readonly activeTab: IntegrationWorkbenchTab
  readonly canUpload: boolean
  readonly extension: ReactNode
  readonly finance: ReactNode
  readonly imports: ReactNode
  readonly onChange: (tab: IntegrationWorkbenchTab) => void
  readonly onUpload: () => void
}

export function IntegrationWorkbenchTabs({
  activeTab,
  canUpload,
  extension,
  finance,
  imports,
  onChange,
  onUpload,
}: IntegrationWorkbenchTabsProps) {
  const { t } = useTranslation()

  return (
    <UiTabs
      activeKey={activeTab}
      destroyOnHidden
      onChange={(key) => onChange(key as IntegrationWorkbenchTab)}
      tabBarExtraContent={
        activeTab === 'orders' && canUpload ? (
          <div className={styles.tabsAction}>
            <Button icon={<UploadOutlined aria-hidden />} type="primary" onClick={onUpload}>
              {t('portal.integrations.upload.action', { defaultValue: 'Upload report' })}
            </Button>
          </div>
        ) : null
      }
      items={[
        {
          key: 'orders',
          label: <UiTabLabel>{t('portal.integrations.tabs.orders')}</UiTabLabel>,
          children: <section aria-label="Imports workbench">{imports}</section>,
        },
        {
          key: 'extension',
          label: <UiTabLabel>{t('portal.integrations.tabs.extension')}</UiTabLabel>,
          children: <section aria-label="Amazon Extension workbench">{extension}</section>,
        },
        {
          key: 'finance',
          label: (
            <UiTabLabel>
              {t('portal.integrations.tabs.finance', { defaultValue: 'Finance data' })}
            </UiTabLabel>
          ),
          children: <section aria-label="Finance workbench">{finance}</section>,
        },
      ]}
    />
  )
}
