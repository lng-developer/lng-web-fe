import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BankOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  DollarCircleOutlined,
  ExclamationCircleOutlined,
  FundOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import { Button, Empty, Spin, Typography } from 'antd'

import { SectionCard, StatusTag } from '@/shared/ui'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { canWriteFinanceForShop, canWriteOrdersForShop } from '../auth/integrationAccess'
import { ExtensionManualRequest } from './ExtensionManualRequest'
import { ExtensionSchedulePopover } from './ExtensionSchedulePopover'
import { formatScheduleSubtitle, type CreateExtensionCommandInput } from './extensionHelpers'

import type {
  ExtensionFinanceSchedule,
  ExtensionFinanceScheduleSource,
  ExtensionManagementAgent,
  ExtensionOrderSchedule,
  ExtensionScheduleType,
} from '../api/integrationApi'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'

export interface ExtensionAutomationTabProps {
  readonly account: CurrentAccount
  readonly agents: ExtensionManagementAgent[]
  readonly schedules: ExtensionOrderSchedule[]
  readonly financeSchedules: ExtensionFinanceSchedule[]
  readonly isLoading: boolean
  readonly shopNames: Map<string, string>
  readonly canWriteOrders: boolean
  readonly canWriteFinance: boolean
  readonly isSavingSchedule: boolean
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

const ORDER_INTERVAL_OPTIONS = [60, 120, 180, 240].map((value) => ({
  value,
  label: `Every ${value / 60} hour${value === 60 ? '' : 's'}`,
}))

const ADS_INTERVAL_OPTIONS = [
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Every 24 hours (Daily)' },
  { value: 2880, label: 'Every 2 days' },
]

const SETTLEMENT_INTERVAL_OPTIONS = [
  { value: 1440, label: 'Daily (Every 24h)' },
  { value: 10080, label: 'Weekly (Every 7 days)' },
]

const TRANSACTION_INTERVAL_OPTIONS = [{ value: 1440, label: 'Daily (Every 24h)' }]

export function ExtensionAutomationTab({
  account,
  agents,
  schedules,
  financeSchedules,
  isLoading,
  shopNames,
  canWriteOrders,
  canWriteFinance,
  isSavingSchedule,
  isSavingFinanceSchedule,
  isCreatingCommand,
  onSaveSchedule,
  onSaveFinanceSchedule,
  onCreateCommand,
}: ExtensionAutomationTabProps) {
  const { t } = useTranslation()
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
              <Typography.Text strong>
                {t('portal.integrations.extension.orderImport', {
                  defaultValue: 'Order import',
                })}
              </Typography.Text>
            </div>
            <div className={styles.automationScheduleMeta}>
              <Typography.Text type="secondary" className={styles.scheduleMetaText}>
                {enabled ? (
                  <>
                    <ClockCircleOutlined style={{ marginRight: 4, fontSize: 11 }} />
                    {formatScheduleSubtitle(schedule, t, 120)}
                  </>
                ) : (
                  t('portal.integrations.extension.notScheduled', {
                    defaultValue: 'Not scheduled',
                  })
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
            {canWriteOrders && canWriteOrdersForShop(account, agent.shopId) ? (
              <div className={styles.automationScheduleActions}>
                <ExtensionManualRequest
                  agent={agent}
                  source="ORDERS"
                  loading={isCreatingCommand}
                  onRequest={onCreateCommand}
                />
                <ExtensionSchedulePopover
                  title={t('portal.integrations.extension.orderSchedule', {
                    defaultValue: 'Order schedule',
                  })}
                  buttonAriaLabel={t('portal.integrations.extension.configureOrderSchedule', {
                    defaultValue: 'Configure order schedule',
                  })}
                  enabled={enabled}
                  scheduleType={schedule?.scheduleType}
                  intervalMinutes={schedule?.intervalMinutes ?? 120}
                  intervalOptions={ORDER_INTERVAL_OPTIONS}
                  fixedTimes={schedule?.fixedTimes}
                  timezone={schedule?.timezone}
                  loading={isSavingSchedule}
                  onSave={(values) =>
                    onSaveSchedule({
                      agentId: agent.id,
                      enabled: values.enabled,
                      scheduleType: values.scheduleType,
                      intervalMinutes: values.intervalMinutes as 60 | 120 | 180 | 240,
                      fixedTimes: values.fixedTimes,
                      timezone: values.timezone,
                    })
                  }
                />
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

    const intervalOptions =
      source === 'ADS'
        ? ADS_INTERVAL_OPTIONS
        : source === 'SETTLEMENTS'
          ? SETTLEMENT_INTERVAL_OPTIONS
          : TRANSACTION_INTERVAL_OPTIONS

    const intervalNote =
      source === 'TRANSACTIONS'
        ? 'Daily · Last 3 completed days (UTC+7) · Initial 30 days in 7-day batches'
        : source === 'SETTLEMENTS'
          ? 'Daily · Newly closed statements only'
          : undefined

    const icon =
      source === 'ADS' ? (
        <FundOutlined className={styles.scheduleIconPrimary} />
      ) : source === 'TRANSACTIONS' ? (
        <DollarCircleOutlined className={styles.scheduleIconSuccess} />
      ) : (
        <BankOutlined className={styles.scheduleIconWarning} />
      )

    return (
      <li className={styles.automationScheduleItem}>
        <section aria-label={`${label} schedule`} className={styles.automationScheduleRow}>
          <div className={styles.scheduleInfo}>
            <div className={styles.scheduleTitleRow}>
              {icon}
              <Typography.Text strong>{label}</Typography.Text>
            </div>
            <div className={styles.automationScheduleMeta}>
              <Typography.Text type="secondary" className={styles.scheduleMetaText}>
                {enabled ? (
                  <>
                    <ClockCircleOutlined style={{ marginRight: 4, fontSize: 11 }} />
                    {formatScheduleSubtitle(schedule, t, 1440, intervalNote)}
                  </>
                ) : (
                  t('portal.integrations.extension.notScheduled', {
                    defaultValue: 'Not scheduled',
                  })
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
            {canWriteFinance && canWriteFinanceForShop(account, agent.shopId) ? (
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
                <ExtensionManualRequest
                  agent={agent}
                  source={source}
                  loading={isCreatingCommand}
                  onRequest={onCreateCommand}
                />
                <ExtensionSchedulePopover
                  title={`${label} ${t('portal.integrations.extension.schedule', { defaultValue: 'schedule' })}`}
                  enabled={enabled}
                  scheduleType={schedule?.scheduleType}
                  intervalMinutes={schedule?.intervalMinutes ?? 1440}
                  intervalOptions={intervalOptions}
                  fixedTimes={schedule?.fixedTimes}
                  timezone={schedule?.timezone}
                  loading={isSavingFinanceSchedule}
                  onSave={(values) =>
                    onSaveFinanceSchedule({
                      agentId: agent.id,
                      source,
                      enabled: values.enabled,
                      scheduleType: values.scheduleType,
                      intervalMinutes: values.intervalMinutes,
                      fixedTimes: values.fixedTimes,
                      timezone: values.timezone,
                    })
                  }
                />
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
        {t('portal.integrations.extension.manualRequests.description')}
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
                        {renderFinanceSchedule(
                          agent,
                          'ADS',
                          t('portal.integrations.extension.manualRequests.ADS', {
                            defaultValue: 'Ads',
                          }),
                        )}
                        {agent.provider !== 'ETSY' &&
                          renderFinanceSchedule(
                            agent,
                            'TRANSACTIONS',
                            t('portal.integrations.extension.manualRequests.TRANSACTIONS', {
                              defaultValue: 'Transaction',
                            }),
                          )}
                        {renderFinanceSchedule(
                          agent,
                          'SETTLEMENTS',
                          agent.provider === 'ETSY'
                            ? t('portal.integrations.extension.monthlyStatement', {
                                defaultValue: 'Monthly statement',
                              })
                            : t('portal.integrations.extension.manualRequests.SETTLEMENTS', {
                                defaultValue: 'Settlement',
                              }),
                        )}
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
