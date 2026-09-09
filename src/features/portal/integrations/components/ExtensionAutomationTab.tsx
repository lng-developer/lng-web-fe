import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ClockCircleOutlined } from '@ant-design/icons'
import { Button, Empty, Popover, Select, Spin, Typography } from 'antd'

import { SectionCard, StatusTag } from '@/shared/ui'

import type {
  ExtensionFinanceSchedule,
  ExtensionFinanceScheduleSource,
  ExtensionManagementAgent,
  ExtensionOrderSchedule,
} from '../api/integrationApi'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'

export interface ExtensionAutomationTabProps {
  readonly agents: ExtensionManagementAgent[]
  readonly schedules: ExtensionOrderSchedule[]
  readonly financeSchedules: ExtensionFinanceSchedule[]
  readonly isLoading: boolean
  readonly shopNames: Map<string, string>
  readonly canWriteOrders: boolean
  readonly canWriteFinance: boolean
  readonly isSavingSchedule: boolean
  readonly isSavingFinanceSchedule: boolean
  readonly isRequestingFinanceSchedule: boolean
  readonly onSaveSchedule: (input: {
    agentId: string
    enabled: boolean
    intervalMinutes: 60 | 120 | 180 | 240
  }) => void
  readonly onSaveFinanceSchedule: (input: {
    agentId: string
    source: ExtensionFinanceScheduleSource
    enabled: boolean
  }) => void
  readonly onRequestFinanceScheduleNow: (input: {
    agentId: string
    source: ExtensionFinanceScheduleSource
  }) => void
}

export function ExtensionAutomationTab({
  agents,
  schedules,
  financeSchedules,
  isLoading,
  shopNames,
  canWriteOrders,
  canWriteFinance,
  isSavingSchedule,
  isSavingFinanceSchedule,
  isRequestingFinanceSchedule,
  onSaveSchedule,
  onSaveFinanceSchedule,
  onRequestFinanceScheduleNow,
}: ExtensionAutomationTabProps) {
  const { t } = useTranslation()
  const orderScheduleByAgentId = useMemo(
    () => new Map(schedules.map((schedule) => [schedule.agentId, schedule])),
    [schedules],
  )
  const financeScheduleByAgentSource = useMemo(
    () => new Map(financeSchedules.map((schedule) => [`${schedule.agentId}:${schedule.source}`, schedule])),
    [financeSchedules],
  )
  const agentGroups = useMemo(() => {
    const groups = new Map<string, ExtensionManagementAgent[]>()
    agents.forEach((agent) => groups.set(agent.shopId, [...(groups.get(agent.shopId) ?? []), agent]))
    return [...groups].map(([shopId, groupAgents]) => ({
      agents: groupAgents,
      name: shopNames.get(shopId) ?? shopId,
      shopId,
    }))
  }, [agents, shopNames])

  const renderOrderSchedule = (agent: ExtensionManagementAgent) => {
    const schedule = orderScheduleByAgentId.get(agent.id)
    const enabled = schedule?.enabled ?? false
    return (
      <li>
        <section aria-label="Order import schedule" className={styles.automationScheduleRow}>
          <Typography.Text strong>Order import</Typography.Text>
          <div className={styles.automationScheduleMeta}>
            <Typography.Text type="secondary">
              {enabled && schedule ? `Every ${schedule.intervalMinutes / 60}h · Next: ${new Date(schedule.nextRunAt).toLocaleString()}` : 'Not scheduled'}
            </Typography.Text>
            {schedule?.lastError ? <Typography.Text type="danger">{schedule.lastError}</Typography.Text> : null}
          </div>
          <StatusTag status={enabled ? 'operational' : 'draft'}>{enabled ? 'Enabled' : 'Disabled'}</StatusTag>
          {canWriteOrders ? (
            <div className={styles.automationScheduleActions}>
              <Popover
                content={
                  <div className={styles.commandPopover}>
                    <Select
                      aria-label={t('portal.integrations.extension.orderScheduleInterval', { defaultValue: 'Order schedule interval' })}
                      defaultValue={schedule?.intervalMinutes ?? 120}
                      options={[60, 120, 180, 240].map((value) => ({ value, label: `Every ${value / 60} hour${value === 60 ? '' : 's'}` }))}
                      onChange={(intervalMinutes: 60 | 120 | 180 | 240) =>
                        onSaveSchedule({ agentId: agent.id, enabled, intervalMinutes })
                      }
                    />
                    <Button
                      aria-label={t('portal.integrations.extension.saveOrderSchedule', { defaultValue: 'Save schedule' })}
                      loading={isSavingSchedule}
                      type="primary"
                      onClick={() => onSaveSchedule({ agentId: agent.id, enabled: !enabled, intervalMinutes: schedule?.intervalMinutes ?? 120 })}
                    >
                      {enabled ? 'Disable schedule' : 'Save schedule'}
                    </Button>
                  </div>
                }
                title="Order schedule"
                trigger="click"
              >
                <Button aria-label={t('portal.integrations.extension.configureOrderSchedule', { defaultValue: 'Configure order schedule' })} icon={<ClockCircleOutlined />} size="small">
                  Configure
                </Button>
              </Popover>
            </div>
          ) : null}
        </section>
      </li>
    )
  }

  const renderFinanceSchedule = (
    agent: ExtensionManagementAgent,
    source: ExtensionFinanceScheduleSource,
    label: string,
  ) => {
    const schedule = financeScheduleByAgentSource.get(`${agent.id}:${source}`)
    const enabled = schedule?.enabled ?? false
    return (
      <li>
        <section aria-label={`${label} schedule`} className={styles.automationScheduleRow}>
          <Typography.Text strong>{label}</Typography.Text>
          <div className={styles.automationScheduleMeta}>
            <Typography.Text type="secondary">
              {enabled
                ? `${source === 'TRANSACTIONS' ? 'Daily · Up to 7 days per run' : 'Daily · Newly closed statements only'} · Next: ${new Date(schedule?.nextRunAt ?? '').toLocaleString()}`
                : 'Not scheduled'}
            </Typography.Text>
            {schedule?.lastError ? <Typography.Text type="danger">{schedule.lastError}</Typography.Text> : null}
          </div>
          <StatusTag status={enabled ? 'operational' : 'draft'}>{enabled ? 'Enabled' : 'Disabled'}</StatusTag>
          {canWriteFinance ? (
            <div className={styles.automationScheduleActions}>
              <Button
                aria-label={`${enabled ? 'Disable' : 'Enable'} ${label.toLowerCase()} sync`}
                loading={isSavingFinanceSchedule}
                size="small"
                onClick={() => onSaveFinanceSchedule({ agentId: agent.id, source, enabled: !enabled })}
              >
                {enabled ? 'Disable' : 'Enable'}
              </Button>
              {enabled ? (
                <Button
                  aria-label={`Request ${label.toLowerCase()} sync now`}
                  loading={isRequestingFinanceSchedule}
                  size="small"
                  type="primary"
                  onClick={() => onRequestFinanceScheduleNow({ agentId: agent.id, source })}
                >
                  Request now
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      </li>
    )
  }

  return (
    <SectionCard title="Automation">
      <Typography.Paragraph type="secondary">
        Configure recurring orders plus daily Transactions and Settlements imports for each connected extension.
      </Typography.Paragraph>
      <Spin spinning={isLoading}>
        {agentGroups.length ? (
          <div className={styles.automationGroups}>
            {agentGroups.map((group) => (
              <section key={group.shopId} aria-label={`${group.name} automation`} className={styles.automationGroup}>
                <Typography.Title level={5}>{group.name}</Typography.Title>
                <div className={styles.automationGrid}>
                  {group.agents.map((agent) => (
                    <article key={agent.id} aria-label={`${group.name} / ${agent.label}`} className={styles.automationAgentCard}>
                      <div className={styles.automationAgentHeader}>
                        <div>
                          <Typography.Text strong>{agent.label}</Typography.Text>
                          <Typography.Text type="secondary">Agent ID · {agent.id.slice(-6)}</Typography.Text>
                        </div>
                        <StatusTag status={agent.status === 'ONLINE' ? 'online' : 'offline'}>
                          {agent.status === 'ONLINE' ? 'Online' : 'Offline'}
                        </StatusTag>
                      </div>
                      <ul className={styles.automationScheduleList}>
                        {renderOrderSchedule(agent)}
                        {renderFinanceSchedule(agent, 'TRANSACTIONS', 'Transaction')}
                        {renderFinanceSchedule(agent, 'SETTLEMENTS', 'Settlement')}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <Empty description="No extension agents connected" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Spin>
    </SectionCard>
  )
}
