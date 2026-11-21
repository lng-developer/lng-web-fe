import { useTranslation } from 'react-i18next'
import { DesktopOutlined } from '@ant-design/icons'
import { Typography } from 'antd'

import { StatusTag } from '@/shared/ui'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { ExtensionPlatformBadge } from '@/features/portal/extensions/components/ExtensionPlatformBadge'
import {
  ExtensionFinanceScheduleRow,
  ExtensionOrderScheduleRow,
  ExtensionTrackingScheduleRow,
} from './ExtensionAutomationScheduleRows'
import type { CreateExtensionCommandInput } from './extensionHelpers'

import type {
  ExtensionFinanceSchedule,
  ExtensionFinanceScheduleSource,
  ExtensionManagementAgent,
  ExtensionOrderSchedule,
  ExtensionScheduleType,
  ExtensionTrackingSchedule,
} from '../api/integrationApi'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'

export interface ExtensionAutomationAgentCardProps {
  readonly agent: ExtensionManagementAgent
  readonly account: CurrentAccount
  readonly shopNames: Map<string, string>
  readonly orderSchedule?: ExtensionOrderSchedule
  readonly trackingSchedule?: ExtensionTrackingSchedule
  readonly financeSchedulesBySource: Map<ExtensionFinanceScheduleSource, ExtensionFinanceSchedule>
  readonly canWriteOrders: boolean
  readonly canWriteFinance: boolean
  readonly isSavingSchedule: boolean
  readonly isSavingTrackingSchedule?: boolean
  readonly isSavingFinanceSchedule: boolean
  readonly isCreatingCommand: boolean
  readonly onSaveSchedule: (input: {
    agentId: string
    enabled: boolean
    scheduleType?: ExtensionScheduleType
    intervalMinutes?: 60 | 120 | 180 | 240
    fixedTimes?: string[]
    timezone?: string
  }) => void
  readonly onSaveTrackingSchedule?: (input: {
    agentId: string
    enabled: boolean
    scheduleType?: ExtensionScheduleType
    intervalMinutes?: number
    fixedTimes?: string[]
    timezone?: string
  }) => void
  readonly onRequestTrackingScheduleNow?: (agentId: string) => void
  readonly onSaveFinanceSchedule: (input: {
    agentId: string
    source: ExtensionFinanceScheduleSource
    enabled: boolean
    scheduleType?: ExtensionScheduleType
    intervalMinutes?: number
    fixedTimes?: string[]
    timezone?: string
  }) => void
  readonly onCreateCommand: (input: CreateExtensionCommandInput) => void
}

export function ExtensionAutomationAgentCard({
  agent,
  account,
  shopNames,
  orderSchedule,
  trackingSchedule,
  financeSchedulesBySource,
  canWriteOrders,
  canWriteFinance,
  isSavingSchedule,
  isSavingTrackingSchedule,
  isSavingFinanceSchedule,
  isCreatingCommand,
  onSaveSchedule,
  onSaveTrackingSchedule,
  onRequestTrackingScheduleNow,
  onSaveFinanceSchedule,
  onCreateCommand,
}: ExtensionAutomationAgentCardProps) {
  const { t } = useTranslation()
  const shopName = shopNames.get(agent.shopId) ?? agent.shopId

  return (
    <article
      key={agent.id}
      aria-label={`${shopName} / ${agent.label}`}
      className={styles.automationAgentCard}
    >
      <div className={styles.automationAgentHeaderCompact}>
        <div className={styles.agentIdentity}>
          <div
            className={agent.status === 'ONLINE' ? styles.agentIconBoxOnline : styles.agentIconBox}
          >
            <DesktopOutlined />
          </div>
          <div>
            <div className={styles.agentTitleRow}>
              <Typography.Text strong className={styles.agentLabel}>
                {agent.label}
              </Typography.Text>
              <ExtensionPlatformBadge platform={agent.provider} />
            </div>
            <div className={styles.agentMetaRow}>
              <Typography.Text type="secondary" className={styles.agentIdText}>
                Agent ID · {agent.id.slice(-6)}
              </Typography.Text>
            </div>
          </div>
        </div>
        <StatusTag status={agent.status === 'ONLINE' ? 'online' : 'offline'}>
          {agent.status === 'ONLINE' ? 'Online' : 'Offline'}
        </StatusTag>
      </div>

      <ul className={styles.automationScheduleList}>
        <ExtensionOrderScheduleRow
          agent={agent}
          schedule={orderSchedule}
          account={account}
          canWriteOrders={canWriteOrders}
          isSavingSchedule={isSavingSchedule}
          isCreatingCommand={isCreatingCommand}
          onSaveSchedule={onSaveSchedule}
          onCreateCommand={onCreateCommand}
        />

        <ExtensionTrackingScheduleRow
          agent={agent}
          schedule={trackingSchedule}
          account={account}
          canWriteOrders={canWriteOrders}
          isSavingTrackingSchedule={isSavingTrackingSchedule}
          onSaveTrackingSchedule={onSaveTrackingSchedule}
          onRequestTrackingScheduleNow={onRequestTrackingScheduleNow}
        />

        {agent.provider !== 'ETSY' && (
          <ExtensionFinanceScheduleRow
            agent={agent}
            source="ADS"
            label={t('portal.integrations.extension.manualRequests.ADS', {
              defaultValue: 'Ads',
            })}
            schedule={financeSchedulesBySource.get('ADS')}
            account={account}
            canWriteFinance={canWriteFinance}
            isSavingFinanceSchedule={isSavingFinanceSchedule}
            isCreatingCommand={isCreatingCommand}
            onSaveFinanceSchedule={onSaveFinanceSchedule}
            onCreateCommand={onCreateCommand}
          />
        )}

        {agent.provider !== 'ETSY' && (
          <ExtensionFinanceScheduleRow
            agent={agent}
            source="TRANSACTIONS"
            label={t('portal.integrations.extension.manualRequests.TRANSACTIONS', {
              defaultValue: 'Transaction',
            })}
            schedule={financeSchedulesBySource.get('TRANSACTIONS')}
            account={account}
            canWriteFinance={canWriteFinance}
            isSavingFinanceSchedule={isSavingFinanceSchedule}
            isCreatingCommand={isCreatingCommand}
            onSaveFinanceSchedule={onSaveFinanceSchedule}
            onCreateCommand={onCreateCommand}
          />
        )}

        <ExtensionFinanceScheduleRow
          agent={agent}
          source="SETTLEMENTS"
          label={
            agent.provider === 'ETSY'
              ? t('portal.integrations.extension.monthlyStatement', {
                  defaultValue: 'Monthly statement',
                })
              : t('portal.integrations.extension.manualRequests.SETTLEMENTS', {
                  defaultValue: 'Settlement',
                })
          }
          schedule={financeSchedulesBySource.get('SETTLEMENTS')}
          account={account}
          canWriteFinance={canWriteFinance}
          isSavingFinanceSchedule={isSavingFinanceSchedule}
          isCreatingCommand={isCreatingCommand}
          onSaveFinanceSchedule={onSaveFinanceSchedule}
          onCreateCommand={onCreateCommand}
        />
      </ul>
    </article>
  )
}
