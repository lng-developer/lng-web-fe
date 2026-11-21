import type React from 'react'
import { useTranslation } from 'react-i18next'
import { DownOutlined, ShopOutlined, UpOutlined } from '@ant-design/icons'
import { Button, Typography } from 'antd'

import { ExtensionPlatformBadge } from '@/features/portal/extensions/components/ExtensionPlatformBadge'

import type { ExtensionManagementAgent } from '../api/integrationApi'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'

export interface AgentGroup {
  agents: ExtensionManagementAgent[]
  onlineAgents: ExtensionManagementAgent[]
  offlineAgents: ExtensionManagementAgent[]
  name: string
  shopId: string
  provider?: string | null
}

export interface ExtensionAutomationGroupProps {
  readonly group: AgentGroup
  readonly isExpanded: boolean
  readonly onToggleExpand: (shopId: string) => void
  readonly renderAgentCard: (agent: ExtensionManagementAgent) => React.ReactNode
}

export function ExtensionAutomationGroup({
  group,
  isExpanded,
  onToggleExpand,
  renderAgentCard,
}: ExtensionAutomationGroupProps) {
  const { t } = useTranslation()

  // If there are online agents, show online agents first.
  // If no online agents, show the first offline agent as primary.
  const primaryAgents =
    group.onlineAgents.length > 0 ? group.onlineAgents : group.offlineAgents.slice(0, 1)

  const secondaryOfflineAgents =
    group.onlineAgents.length > 0 ? group.offlineAgents : group.offlineAgents.slice(1)

  return (
    <section
      key={group.shopId}
      aria-label={`${group.name} automation`}
      className={styles.automationGroup}
    >
      <div className={styles.automationGroupHeader}>
        <div className={styles.automationGroupTitle}>
          <ShopOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <Typography.Title level={5} style={{ margin: 0 }}>
            {group.name}
          </Typography.Title>
          <ExtensionPlatformBadge platform={group.provider} />
        </div>
        <span className={styles.countBadge}>
          {group.onlineAgents.length > 0
            ? `${group.onlineAgents.length} online / ${group.agents.length} bots`
            : `${group.agents.length} bots (offline)`}
        </span>
      </div>

      {/* Primary / Active Bot Cards */}
      <div className={styles.automationGrid}>{primaryAgents.map(renderAgentCard)}</div>

      {/* Collapsible Secondary / Offline Workers */}
      {secondaryOfflineAgents.length > 0 ? (
        <>
          <div className={styles.offlineToggleRow}>
            <Button
              type="link"
              size="small"
              icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
              onClick={() => onToggleExpand(group.shopId)}
              style={{ padding: 0, fontSize: 12 }}
            >
              {isExpanded
                ? t('portal.extensions.schedules.hideOfflineBots', {
                    count: secondaryOfflineAgents.length,
                    defaultValue: `Hide ${secondaryOfflineAgents.length} offline extension workers`,
                  })
                : t('portal.extensions.schedules.showOfflineBots', {
                    count: secondaryOfflineAgents.length,
                    defaultValue: `${secondaryOfflineAgents.length} offline extension workers (click to view)`,
                  })}
            </Button>
          </div>

          {isExpanded ? (
            <div className={styles.offlineAgentsSubGrid}>
              {secondaryOfflineAgents.map(renderAgentCard)}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
