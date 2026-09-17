import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BankOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  DollarCircleOutlined,
  ExclamationCircleOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { Button, Empty, Popover, Select, Spin, Typography } from 'antd'

import { DateRangePicker, SectionCard, StatusTag } from '@/shared/ui'
import type { CreateExtensionCommandInput } from './extensionHelpers'

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
  readonly onRequestFinanceScheduleNow: (input: CreateExtensionCommandInput) => void
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
  const [manualDates, setManualDates] = useState<
    Record<string, { dateFrom?: string; dateTo?: string } | undefined>
  >({})
  const orderScheduleByAgentId = useMemo(
    () => new Map(schedules.map((schedule) => [schedule.agentId, schedule])),
    [schedules],
  )
  const financeScheduleByAgentSource = useMemo(
    () =>
      new Map(
        financeSchedules.map((schedule) => [`${schedule.agentId}:${schedule.source}`, schedule]),
      ),
    [financeSchedules],
  )
  const agentGroups = useMemo(() => {
    const groups = new Map<string, ExtensionManagementAgent[]>()
    agents.forEach((agent) =>
      groups.set(agent.shopId, [...(groups.get(agent.shopId) ?? []), agent]),
    )
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
      <li className={styles.automationScheduleItem}>
        <section aria-label="Order import schedule" className={styles.automationScheduleRow}>
          <div className={styles.scheduleInfo}>
            <div className={styles.scheduleTitleRow}>
              <ShoppingCartOutlined className={styles.scheduleIconPrimary} />
              <Typography.Text strong>Order import</Typography.Text>
            </div>
            <div className={styles.automationScheduleMeta}>
              <Typography.Text type="secondary" className={styles.scheduleMetaText}>
                {enabled && schedule ? (
                  <>
                    <ClockCircleOutlined style={{ marginRight: 4, fontSize: 11 }} />
                    {`Every ${schedule.intervalMinutes / 60}h · Next: ${new Date(schedule.nextRunAt).toLocaleString()}`}
                  </>
                ) : (
                  'Not scheduled'
                )}
              </Typography.Text>
              {schedule?.lastError ? (
                <div className={styles.automationScheduleError}>
                  <ExclamationCircleOutlined />
                  <span>{schedule.lastError}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.scheduleControls}>
            <StatusTag status={enabled ? 'operational' : 'draft'}>
              {enabled ? 'Enabled' : 'Disabled'}
            </StatusTag>
            {canWriteOrders ? (
              <div className={styles.automationScheduleActions}>
                <Popover
                  content={
                    <div className={styles.commandPopover}>
                      <Select
                        aria-label={t('portal.integrations.extension.orderScheduleInterval', {
                          defaultValue: 'Order schedule interval',
                        })}
                        defaultValue={schedule?.intervalMinutes ?? 120}
                        options={[60, 120, 180, 240].map((value) => ({
                          value,
                          label: `Every ${value / 60} hour${value === 60 ? '' : 's'}`,
                        }))}
                        onChange={(intervalMinutes: 60 | 120 | 180 | 240) =>
                          onSaveSchedule({ agentId: agent.id, enabled, intervalMinutes })
                        }
                      />
                      <Button
                        aria-label={t('portal.integrations.extension.saveOrderSchedule', {
                          defaultValue: 'Save schedule',
                        })}
                        loading={isSavingSchedule}
                        type="primary"
                        onClick={() =>
                          onSaveSchedule({
                            agentId: agent.id,
                            enabled: !enabled,
                            intervalMinutes: schedule?.intervalMinutes ?? 120,
                          })
                        }
                      >
                        {enabled ? 'Disable schedule' : 'Save schedule'}
                      </Button>
                    </div>
                  }
                  title="Order schedule"
                  trigger="click"
                >
                  <Button
                    aria-label={t('portal.integrations.extension.configureOrderSchedule', {
                      defaultValue: 'Configure order schedule',
                    })}
                    icon={<ClockCircleOutlined />}
                    size="small"
                  >
                    Configure
                  </Button>
                </Popover>
              </div>
            ) : null}
          </div>
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
    const dateKey = `${agent.id}:${source}`
    const dates = manualDates[dateKey]
    return (
      <li className={styles.automationScheduleItem}>
        <section aria-label={`${label} schedule`} className={styles.automationScheduleRow}>
          <div className={styles.scheduleInfo}>
            <div className={styles.scheduleTitleRow}>
              {source === 'TRANSACTIONS' ? (
                <DollarCircleOutlined className={styles.scheduleIconSuccess} />
              ) : (
                <BankOutlined className={styles.scheduleIconWarning} />
              )}
              <Typography.Text strong>{label}</Typography.Text>
            </div>
            <div className={styles.automationScheduleMeta}>
              <Typography.Text type="secondary" className={styles.scheduleMetaText}>
                {enabled ? (
                  <>
                    <ClockCircleOutlined style={{ marginRight: 4, fontSize: 11 }} />
                    {`${source === 'TRANSACTIONS' ? 'Daily · Last 3 completed days (UTC+7) · Initial 30 days in 7-day batches' : 'Daily · Newly closed statements only'} · Next: ${new Date(schedule?.nextRunAt ?? '').toLocaleString()}`}
                  </>
                ) : (
                  'Not scheduled'
                )}
              </Typography.Text>
              {schedule?.lastError ? (
                <div className={styles.automationScheduleError}>
                  <ExclamationCircleOutlined />
                  <span>{schedule.lastError}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.scheduleControls}>
            <StatusTag status={enabled ? 'operational' : 'draft'}>
              {enabled ? 'Enabled' : 'Disabled'}
            </StatusTag>
            {canWriteFinance ? (
              <div className={styles.automationScheduleActions}>
                <Button
                  aria-label={`${enabled ? 'Disable' : 'Enable'} ${label.toLowerCase()} sync`}
                  loading={isSavingFinanceSchedule}
                  size="small"
                  onClick={() =>
                    onSaveFinanceSchedule({ agentId: agent.id, source, enabled: !enabled })
                  }
                >
                  {enabled ? 'Disable' : 'Enable'}
                </Button>
                <Popover
                  trigger="click"
                  title={`Request ${label.toLowerCase()} import`}
                  content={
                    <div className={styles.commandPopover}>
                      <Typography.Text>
                        {source === 'SETTLEMENTS'
                          ? 'Choose the exact closed statement period.'
                          : 'Choose the dates for this one-time import.'}
                      </Typography.Text>
                      <DateRangePicker
                        aria-label={`${label} manual date range`}
                        value={dates}
                        onChange={(value) =>
                          setManualDates((current) => ({ ...current, [dateKey]: value }))
                        }
                      />
                      <Button
                        type="primary"
                        loading={isRequestingFinanceSchedule}
                        disabled={
                          !dates?.dateFrom ||
                          !dates?.dateTo ||
                          dates.dateFrom > dates.dateTo ||
                          agent.status !== 'ONLINE'
                        }
                        onClick={() =>
                          onRequestFinanceScheduleNow({
                            agentId: agent.id,
                            type:
                              source === 'TRANSACTIONS'
                                ? 'IMPORT_TRANSACTIONS'
                                : 'IMPORT_SETTLEMENTS',
                            ...dates,
                          })
                        }
                      >
                        Queue import
                      </Button>
                    </div>
                  }
                >
                  <Button
                    aria-label={`Request ${label.toLowerCase()} sync now`}
                    disabled={agent.status !== 'ONLINE'}
                    size="small"
                    type="primary"
                    icon={<SyncOutlined />}
                  >
                    Request now
                  </Button>
                </Popover>
              </div>
            ) : null}
          </div>
        </section>
      </li>
    )
  }

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
      className={styles.tableCard}
    >
      <Typography.Paragraph type="secondary">
        Configure recurring orders plus daily Transactions and Settlements imports for each
        connected extension.
      </Typography.Paragraph>
      <Spin spinning={isLoading}>
        {agentGroups.length ? (
          <div className={styles.automationGroups}>
            {agentGroups.map((group) => (
              <section
                key={group.shopId}
                aria-label={`${group.name} automation`}
                className={styles.automationGroup}
              >
                <div className={styles.automationGroupHeader}>
                  <div className={styles.automationGroupTitle}>
                    <ShopOutlined style={{ color: 'var(--ant-color-primary)' }} />
                    <Typography.Title level={5}>{group.name}</Typography.Title>
                  </div>
                  <span className={styles.countBadge}>
                    {group.agents.length} {group.agents.length === 1 ? 'agent' : 'agents'}
                  </span>
                </div>
                <div className={styles.automationGrid}>
                  {group.agents.map((agent) => (
                    <article
                      key={agent.id}
                      aria-label={`${group.name} / ${agent.label}`}
                      className={styles.automationAgentCard}
                    >
                      <div className={styles.automationAgentHeader}>
                        <div className={styles.agentIdentity}>
                          <div className={styles.agentIconBox}>
                            <DesktopOutlined />
                          </div>
                          <div>
                            <Typography.Text strong className={styles.agentLabel}>
                              {agent.label}
                            </Typography.Text>
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
