import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import { UiButtonTabs } from '@/shared/ui'

import type { ExtensionCommand } from '../api/integrationApi'
import { useExtensionWorkbench } from '../hooks/useExtensionWorkbench'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'
import { ExtensionAutomationTab } from './ExtensionAutomationTab'
import { ExtensionCommandDrawer } from './ExtensionCommandDrawer'
import { ExtensionOperationsTab } from './ExtensionOperationsTab'

export type ExtensionSubTab = 'operations' | 'automation'

export interface ExtensionTabContentProps {
  readonly account: CurrentAccount
  readonly shops: Shop[]
  readonly isShopsLoading: boolean
  readonly shopNames: Map<string, string>
  readonly setupShopOptions: Array<{ label: string; value: string }>
  readonly writableShops: Shop[]
  readonly canWrite: boolean
}

export function ExtensionTabContent({
  account,
  shops,
  isShopsLoading,
  shopNames,
  setupShopOptions,
  writableShops,
  canWrite,
}: ExtensionTabContentProps) {
  const { t } = useTranslation()
  const [activeExtensionTab, setActiveExtensionTab] = useState<ExtensionSubTab>('operations')
  const [selectedCommand, setSelectedCommand] = useState<ExtensionCommand>()

  const {
    tokenForm,
    createdToken,
    setCreatedToken,
    createToken,
    extensionAgents,
    extensionManagementAgents,
    extensionCommands,
    extensionOrderSchedules,
    createCommand,
    revokeToken,
    saveOrderSchedule,
  } = useExtensionWorkbench({ account, canWrite })

  const managementAgents = extensionManagementAgents.data?.items ?? []
  const schedules = extensionOrderSchedules.data?.items ?? []

  return (
    <>
      <UiButtonTabs
        className={styles.segmentedTabs}
        value={activeExtensionTab}
        onChange={(tab) => setActiveExtensionTab(tab as ExtensionSubTab)}
        items={[
          { value: 'operations', label: t('portal.integrations.tabs.operations') },
          { value: 'automation', label: t('portal.integrations.tabs.automation') },
        ]}
      />
      {activeExtensionTab === 'operations' ? (
        <ExtensionOperationsTab
          account={account}
          tokenForm={tokenForm}
          createdToken={createdToken}
          onCreatedTokenChange={setCreatedToken}
          onCreateToken={(values) => createToken.mutate(values)}
          isCreatingToken={createToken.isPending}
          createTokenError={createToken.error}
          shops={shops}
          isShopsLoading={isShopsLoading}
          shopNames={shopNames}
          setupShopOptions={setupShopOptions}
          writableShops={writableShops}
          managementAgents={managementAgents}
          isManagementAgentsLoading={extensionManagementAgents.isLoading}
          commands={extensionCommands.data?.items ?? []}
          isCommandsLoading={extensionCommands.isLoading}
          createCommandError={createCommand.error}
          isCreatingCommand={createCommand.isPending}
          onCreateCommand={(input) => createCommand.mutate(input)}
          onRevokeToken={(tokenId) => revokeToken.mutate(tokenId)}
          onSelectCommand={setSelectedCommand}
          noOnlineAgents={extensionAgents.data?.items.length === 0}
        />
      ) : (
        <ExtensionAutomationTab
          agents={managementAgents}
          schedules={schedules}
          isLoading={extensionManagementAgents.isLoading || extensionOrderSchedules.isLoading}
          shopNames={shopNames}
          isSavingSchedule={saveOrderSchedule.isPending}
          onSaveSchedule={(input) => saveOrderSchedule.mutate(input)}
        />
      )}
      <ExtensionCommandDrawer
        command={selectedCommand}
        onClose={() => setSelectedCommand(undefined)}
      />
    </>
  )
}
