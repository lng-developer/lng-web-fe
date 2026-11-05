import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppstoreOutlined,
  BankOutlined,
  BarsOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  DollarCircleOutlined,
  ExclamationCircleOutlined,
  FundOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import { Button, Empty, Segmented, Space, Spin, Table, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import { SectionCard, StatusTag } from '@/shared/ui'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { ExtensionPlatformBadge } from '@/features/portal/extensions/components/ExtensionPlatformBadge'
import { canWriteFinanceForShop, canWriteOrdersForShop } from '../auth/integrationAccess'
import { ExtensionManualRequest } from './ExtensionManualRequest'
import { ExtensionSchedulePopover, type IntervalOption } from './ExtensionSchedulePopover'
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
  readonly defaultViewMode?: 'cards' | 'table'
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

const ORDER_INTERVAL_OPTIONS: IntervalOption[] = [60, 120, 180, 240].map((value) => ({
  value,
  label: `Every ${value / 60} hour${value === 60 ? '' : 's'}`,
}))

const ADS_INTERVAL_OPTIONS: IntervalOption[] = [
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Every 24 hours (Daily)' },
  { value: 2880, label: 'Every 2 days' },
]

const SETTLEMENT_INTERVAL_OPTIONS: IntervalOption[] = [
  { value: 1440, label: 'Daily (Every 24h)' },
  { value: 10080, label: 'Weekly (Every 7 days)' },
]

const TRANSACTION_INTERVAL_OPTIONS: IntervalOption[] = [{ value: 1440, label: 'Daily (Every 24h)' }]

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
  defaultViewMode = 'cards',
  onSaveSchedule,
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

  const handleViewModeChange = (mode: 'cards' | 'table') => {
    setViewMode(mode)
    try {
      localStorage.setItem('lng:ext_automation_view_mode', mode)
    } catch {
      // ignore
    }
  }

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
      provider: groupAgents[0]?.provider,
    }))
  }, [agents, shopNames])

  const renderOrderSchedule = (agent: ExtensionManagementAgent) => {
    const schedule = orderScheduleByAgentId.get(agent.id)
    const enabled = schedule?.enabled ?? false
    return (
      <li className={styles.automationScheduleItem}>
        <section aria-label="Order import schedule" className={styles.automationScheduleRow}>
          <div className={styles.scheduleRowTier1}>
            <div className={styles.scheduleTitleRow}>
              <ShoppingCartOutlined className={styles.scheduleIconPrimary} />
              <Typography.Text strong>
                {t('portal.integrations.extension.orderImport', {
                  defaultValue: 'Order import',
                })}
              </Typography.Text>
              <StatusTag status={enabled ? 'operational' : 'draft'}>
                {enabled ? 'Enabled' : 'Disabled'}
              </StatusTag>
            </div>
            {schedule?.lastError ? (
              <div className={styles.automationScheduleError} title={schedule.lastError}>
                <ExclamationCircleOutlined />
                <span>{schedule.lastError}</span>
              </div>
            ) : null}
          </div>

          <div className={styles.scheduleRowTier2}>
            <div className={styles.scheduleTiming}>
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
            </div>

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
          <div className={styles.scheduleRowTier1}>
            <div className={styles.scheduleTitleRow}>
              {icon}
              <Typography.Text strong>{label}</Typography.Text>
              <StatusTag status={enabled ? 'operational' : 'draft'}>
                {enabled ? 'Enabled' : 'Disabled'}
              </StatusTag>
            </div>
            {schedule?.lastError ? (
              <div className={styles.automationScheduleError} title={schedule.lastError}>
                <ExclamationCircleOutlined />
                <span>{schedule.lastError}</span>
              </div>
            ) : null}
          </div>

          <div className={styles.scheduleRowTier2}>
            <div className={styles.scheduleTiming}>
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
            </div>

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

  const tableColumns = useMemo<ColumnsType<ExtensionManagementAgent>>(
    () => [
      {
        title: t('portal.extensions.schedules.columns.store', { defaultValue: 'Store & Platform' }),
        key: 'shop',
        width: 220,
        render: (_, agent) => {
          const name = shopNames.get(agent.shopId) ?? agent.shopId
          return (
            <Space direction="vertical" size={4}>
              <Typography.Text strong style={{ fontSize: 13 }}>
                {name}
              </Typography.Text>
              <ExtensionPlatformBadge platform={agent.provider} />
            </Space>
          )
        },
      },
      {
        title: t('portal.extensions.schedules.columns.agent', { defaultValue: 'Worker Extension' }),
        key: 'agent',
        width: 240,
        render: (_, agent) => (
          <Space direction="vertical" size={4}>
            <Space size={6}>
              <DesktopOutlined style={{ color: 'var(--ant-color-primary)' }} />
              <Typography.Text strong style={{ fontSize: 13 }}>
                {agent.label}
              </Typography.Text>
            </Space>
            <Space size={6}>
              <Typography.Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                ID · {agent.id.slice(-6)}
              </Typography.Text>
              <StatusTag status={agent.status === 'ONLINE' ? 'online' : 'offline'}>
                {agent.status === 'ONLINE' ? 'Online' : 'Offline'}
              </StatusTag>
            </Space>
          </Space>
        ),
      },
      {
        title: t('portal.extensions.schedules.columns.orderSync', {
          defaultValue: 'Order Ingestion Schedule',
        }),
        key: 'orderSchedule',
        width: 340,
        render: (_, agent) => {
          const schedule = orderScheduleByAgentId.get(agent.id)
          const enabled = schedule?.enabled ?? false
          return (
            <div className={styles.tableScheduleCell}>
              <div className={styles.tableScheduleInfo}>
                <Space size={6} wrap>
                  <StatusTag status={enabled ? 'operational' : 'draft'}>
                    {enabled ? 'Enabled' : 'Disabled'}
                  </StatusTag>
                  {schedule?.lastError ? (
                    <Tooltip title={schedule.lastError}>
                      <div className={styles.automationScheduleError}>
                        <ExclamationCircleOutlined />
                        <span>{schedule.lastError}</span>
                      </div>
                    </Tooltip>
                  ) : null}
                </Space>
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
              </div>
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
          )
        },
      },
      {
        title: t('portal.extensions.schedules.columns.financeSync', {
          defaultValue: 'Finance & Report Schedules',
        }),
        key: 'financeSchedule',
        render: (_, agent) => {
          const isEtsy = agent.provider === 'ETSY'
          const sources: Array<{
            source: ExtensionFinanceScheduleSource
            label: string
            icon: React.ReactNode
            intervalOptions: IntervalOption[]
            intervalNote?: string
          }> = isEtsy
            ? [
                {
                  source: 'SETTLEMENTS',
                  label: t('portal.integrations.extension.monthlyStatement', {
                    defaultValue: 'Monthly statement',
                  }),
                  icon: <BankOutlined className={styles.scheduleIconWarning} />,
                  intervalOptions: SETTLEMENT_INTERVAL_OPTIONS,
                  intervalNote: 'Daily · Newly closed statements only',
                },
              ]
            : [
                {
                  source: 'ADS',
                  label: t('portal.integrations.extension.manualRequests.ADS', {
                    defaultValue: 'Ads',
                  }),
                  icon: <FundOutlined className={styles.scheduleIconPrimary} />,
                  intervalOptions: ADS_INTERVAL_OPTIONS,
                },
                {
                  source: 'TRANSACTIONS',
                  label: t('portal.integrations.extension.manualRequests.TRANSACTIONS', {
                    defaultValue: 'Transaction',
                  }),
                  icon: <DollarCircleOutlined className={styles.scheduleIconSuccess} />,
                  intervalOptions: TRANSACTION_INTERVAL_OPTIONS,
                  intervalNote:
                    'Daily · Last 3 completed days (UTC+7) · Initial 30 days in 7-day batches',
                },
                {
                  source: 'SETTLEMENTS',
                  label: t('portal.integrations.extension.manualRequests.SETTLEMENTS', {
                    defaultValue: 'Settlement',
                  }),
                  icon: <BankOutlined className={styles.scheduleIconWarning} />,
                  intervalOptions: SETTLEMENT_INTERVAL_OPTIONS,
                  intervalNote: 'Daily · Newly closed statements only',
                },
              ]

          return (
            <div className={styles.tableFinanceCell}>
              {sources.map((item) => {
                const schedule = financeScheduleByAgentSource.get(`${agent.id}:${item.source}`)
                const enabled = schedule?.enabled ?? false
                return (
                  <div key={item.source} className={styles.tableFinanceRow}>
                    <div className={styles.tableFinanceLabel}>
                      {item.icon}
                      <Typography.Text strong style={{ fontSize: 12 }}>
                        {item.label}
                      </Typography.Text>
                      <StatusTag status={enabled ? 'operational' : 'draft'}>
                        {enabled ? 'Enabled' : 'Disabled'}
                      </StatusTag>
                      {enabled ? (
                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                          ({formatScheduleSubtitle(schedule, t, 1440, item.intervalNote)})
                        </Typography.Text>
                      ) : null}
                    </div>
                    {canWriteFinance && canWriteFinanceForShop(account, agent.shopId) ? (
                      <div className={styles.automationScheduleActions}>
                        <Button
                          size="small"
                          loading={isSavingFinanceSchedule}
                          onClick={() =>
                            onSaveFinanceSchedule({
                              agentId: agent.id,
                              source: item.source,
                              enabled: !enabled,
                            })
                          }
                        >
                          {enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <ExtensionManualRequest
                          agent={agent}
                          source={item.source}
                          loading={isCreatingCommand}
                          onRequest={onCreateCommand}
                        />
                        <ExtensionSchedulePopover
                          title={`${item.label} schedule`}
                          enabled={enabled}
                          scheduleType={schedule?.scheduleType}
                          intervalMinutes={schedule?.intervalMinutes ?? 1440}
                          intervalOptions={item.intervalOptions}
                          fixedTimes={schedule?.fixedTimes}
                          timezone={schedule?.timezone}
                          loading={isSavingFinanceSchedule}
                          onSave={(values) =>
                            onSaveFinanceSchedule({
                              agentId: agent.id,
                              source: item.source,
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
                )
              })}
            </div>
          )
        },
      },
    ],
    [
      account,
      canWriteFinance,
      canWriteOrders,
      financeScheduleByAgentSource,
      isCreatingCommand,
      isSavingFinanceSchedule,
      isSavingSchedule,
      onCreateCommand,
      onSaveFinanceSchedule,
      onSaveSchedule,
      orderScheduleByAgentId,
      shopNames,
      t,
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
          <div className={styles.automationTableWrapper}>
            <Table<ExtensionManagementAgent>
              columns={tableColumns}
              dataSource={agents}
              rowKey="id"
              size="small"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `${total} extensions`,
              }}
            />
          </div>
        ) : (
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
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      {group.name}
                    </Typography.Title>
                    <ExtensionPlatformBadge platform={group.provider} />
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
                        {renderOrderSchedule(agent)}
                        {agent.provider !== 'ETSY' &&
                          renderFinanceSchedule(
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
        )}
      </Spin>
    </SectionCard>
  )
}
export default ExtensionAutomationTab
