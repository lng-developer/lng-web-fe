import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppstoreOutlined, BarsOutlined } from '@ant-design/icons'
import { Empty, Segmented, Spin, Typography } from 'antd'

import { SectionCard } from '@/shared/ui'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { ExtensionAutomationAgentCard } from './ExtensionAutomationAgentCard'
import { type AgentGroup, ExtensionAutomationGroup } from './ExtensionAutomationGroup'
import { ExtensionAutomationTable } from './ExtensionAutomationTable'
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

export interface ExtensionAutomationTabProps {
  readonly account: CurrentAccount
  readonly agents: ExtensionManagementAgent[]
  readonly schedules: ExtensionOrderSchedule[]
  readonly trackingSchedules?: ExtensionTrackingSchedule[]
  readonly financeSchedules: ExtensionFinanceSchedule[]
  readonly isLoading: boolean
  readonly shopNames: Map<string, string>
  readonly canWriteOrders: boolean
  readonly canWriteFinance: boolean
  readonly isSavingSchedule: boolean
  readonly isSavingTrackingSchedule?: boolean
  readonly isSavingFinanceSchedule: boolean
  readonly isCreatingCommand: boolean
  readonly defaultViewMode?: 'cards' | 'table'
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

export function ExtensionAutomationTab({
  account,
  agents,
  schedules,
  trackingSchedules = [],
  financeSchedules,
  isLoading,
  shopNames,
  canWriteOrders,
  canWriteFinance,
  isSavingSchedule,
  isSavingTrackingSchedule = false,
  isSavingFinanceSchedule,
  isCreatingCommand,
  defaultViewMode = 'cards',
  onSaveSchedule,
  onSaveTrackingSchedule,
  onRequestTrackingScheduleNow,
  onSaveFinanceSchedule,
  onCreateCommand,
}: ExtensionAutomationTabProps) {
  const { t } = useTranslation()

  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('lng:ext_automation_view_mode')
      if (saved === 'cards' || saved === 'table') return saved
    } catch {
      // ignore
    }
    return defaultViewMode
  })

  const [expandedOfflineShops, setExpandedOfflineShops] = useState<Record<string, boolean>>({})

  const handleViewModeChange = (mode: 'cards' | 'table') => {
    setViewMode(mode)
    try {
      localStorage.setItem('lng:ext_automation_view_mode', mode)
    } catch {
      // ignore
    }
  }

  const handleToggleExpand = useCallback((shopId: string) => {
    setExpandedOfflineShops((prev) => ({
      ...prev,
      [shopId]: !prev[shopId],
    }))
  }, [])

  const orderScheduleByAgentId = useMemo(
    () => new Map(schedules.map((schedule) => [schedule.agentId, schedule])),
    [schedules],
  )

  const trackingScheduleByAgentId = useMemo(
    () => new Map(trackingSchedules.map((schedule) => [schedule.agentId, schedule])),
    [trackingSchedules],
  )

  const financeScheduleByAgentSource = useMemo(
    () =>
      new Map(
        financeSchedules.map((schedule) => [`${schedule.agentId}:${schedule.source}`, schedule]),
      ),
    [financeSchedules],
  )

  const agentGroups = useMemo<AgentGroup[]>(() => {
    const groups = new Map<string, ExtensionManagementAgent[]>()
    agents.forEach((agent) =>
      groups.set(agent.shopId, [...(groups.get(agent.shopId) ?? []), agent]),
    )
    return [...groups].map(([shopId, groupAgents]) => {
      const sorted = [...groupAgents].sort((a, b) => {
        if (a.status === 'ONLINE' && b.status !== 'ONLINE') return -1
        if (a.status !== 'ONLINE' && b.status === 'ONLINE') return 1
        return 0
      })
      const onlineAgents = sorted.filter((a) => a.status === 'ONLINE')
      const offlineAgents = sorted.filter((a) => a.status !== 'ONLINE')
      return {
        agents: sorted,
        onlineAgents,
        offlineAgents,
        name: shopNames.get(shopId) ?? shopId,
        shopId,
        provider: sorted[0]?.provider,
      }
    })
  }, [agents, shopNames])

  const renderAgentCard = useCallback(
    (agent: ExtensionManagementAgent) => {
      const financeSchedulesBySource = new Map<
        ExtensionFinanceScheduleSource,
        ExtensionFinanceSchedule
      >()
      const sources: ExtensionFinanceScheduleSource[] = ['ADS', 'TRANSACTIONS', 'SETTLEMENTS']
      sources.forEach((src) => {
        const item = financeScheduleByAgentSource.get(`${agent.id}:${src}`)
        if (item) financeSchedulesBySource.set(src, item)
      })

      return (
        <ExtensionAutomationAgentCard
          key={agent.id}
          agent={agent}
          account={account}
          shopNames={shopNames}
          orderSchedule={orderScheduleByAgentId.get(agent.id)}
          trackingSchedule={trackingScheduleByAgentId.get(agent.id)}
          financeSchedulesBySource={financeSchedulesBySource}
          canWriteOrders={canWriteOrders}
          canWriteFinance={canWriteFinance}
          isSavingSchedule={isSavingSchedule}
          isSavingTrackingSchedule={isSavingTrackingSchedule}
          isSavingFinanceSchedule={isSavingFinanceSchedule}
          isCreatingCommand={isCreatingCommand}
          onSaveSchedule={onSaveSchedule}
          onSaveTrackingSchedule={onSaveTrackingSchedule}
          onRequestTrackingScheduleNow={onRequestTrackingScheduleNow}
          onSaveFinanceSchedule={onSaveFinanceSchedule}
          onCreateCommand={onCreateCommand}
        />
      )
    },
    [
      account,
      canWriteFinance,
      canWriteOrders,
      financeScheduleByAgentSource,
      isCreatingCommand,
      isSavingFinanceSchedule,
      isSavingSchedule,
      isSavingTrackingSchedule,
      onCreateCommand,
      onRequestTrackingScheduleNow,
      onSaveFinanceSchedule,
      onSaveSchedule,
      onSaveTrackingSchedule,
      orderScheduleByAgentId,
      shopNames,
      trackingScheduleByAgentId,
    ],
  )

  return (
    <SectionCard
      title={
        <div className={styles.sectionHeaderTitle}>
          <span>{t('portal.integrations.tabs.automation', { defaultValue: 'Automation' })}</span>
          <span className={styles.countBadge}>
            {agents.length} {agents.length === 1 ? 'extension' : 'extensions'}
          </span>
        </div>
      }
      extra={
        <Segmented
          value={viewMode}
          onChange={(val) => handleViewModeChange(val as 'cards' | 'table')}
          options={[
            {
              value: 'cards',
              icon: <AppstoreOutlined />,
              label: t('portal.extensions.view.cards', { defaultValue: 'Cards' }),
            },
            {
              value: 'table',
              icon: <BarsOutlined />,
              label: t('portal.extensions.view.table', { defaultValue: 'Table' }),
            },
          ]}
        />
      }
      className={styles.tableCard}
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {t('portal.integrations.extension.manualRequests.description', {
          defaultValue:
            'Request a one-time import or configure a recurring schedule for each extension. Manual dates do not change schedules.',
        })}
      </Typography.Paragraph>

      <Spin spinning={isLoading}>
        {agents.length === 0 ? (
          <Empty description="No extension agents connected" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : viewMode === 'table' ? (
          <ExtensionAutomationTable
            agents={agents}
            account={account}
            shopNames={shopNames}
            orderScheduleByAgentId={orderScheduleByAgentId}
            financeScheduleByAgentSource={financeScheduleByAgentSource}
            canWriteOrders={canWriteOrders}
            canWriteFinance={canWriteFinance}
            isSavingSchedule={isSavingSchedule}
            isSavingFinanceSchedule={isSavingFinanceSchedule}
            isCreatingCommand={isCreatingCommand}
            onSaveSchedule={onSaveSchedule}
            onSaveFinanceSchedule={onSaveFinanceSchedule}
            onCreateCommand={onCreateCommand}
          />
        ) : (
          <div className={styles.automationGroups}>
            {agentGroups.map((group) => (
              <ExtensionAutomationGroup
                key={group.shopId}
                group={group}
                isExpanded={Boolean(expandedOfflineShops[group.shopId])}
                onToggleExpand={handleToggleExpand}
                renderAgentCard={renderAgentCard}
              />
            ))}
          </div>
        )}
      </Spin>
    </SectionCard>
  )
}

export default ExtensionAutomationTab
