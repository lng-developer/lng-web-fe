import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppstoreOutlined,
  BankOutlined,
  BarsOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  DollarCircleOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  FundOutlined,
  InfoCircleOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UpOutlined,
} from '@ant-design/icons'
import {
  Button,
  Empty,
  Segmented,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'

import { SectionCard, StatusTag } from '@/shared/ui'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { ExtensionPlatformBadge } from '@/features/portal/extensions/components/ExtensionPlatformBadge'
import { canWriteFinanceForShop, canWriteOrdersForShop } from '../auth/integrationAccess'
import { ExtensionManualRequest } from './ExtensionManualRequest'
import { ExtensionSchedulePopover, type IntervalOption } from './ExtensionSchedulePopover'
import type { CreateExtensionCommandInput } from './extensionHelpers'

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

function formatCompactScheduleTiming(
  schedule?: {
    enabled?: boolean
    scheduleType?: 'INTERVAL' | 'FIXED_TIMES'
    intervalMinutes?: number
    fixedTimes?: string[]
    nextRunAt?: string | null
  } | null,
  defaultIntervalMinutes = 120,
) {
  if (!schedule?.enabled) return ''
  const nextDate = schedule.nextRunAt ? new Date(schedule.nextRunAt) : null
  const validNext = nextDate && !isNaN(nextDate.getTime())

  let nextText = ''
  if (validNext) {
    const isToday = nextDate.toDateString() === new Date().toDateString()
    const timeStr = nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    nextText = isToday
      ? `Next: ${timeStr}`
      : `Next: ${nextDate.toLocaleDateString([], { month: 'numeric', day: 'numeric' })} ${timeStr}`
  }

  let freqText = ''
  if (
    schedule.scheduleType === 'FIXED_TIMES' ||
    (schedule.fixedTimes && schedule.fixedTimes.length > 0)
  ) {
    freqText = `Daily (${schedule.fixedTimes?.join(', ')})`
  } else {
    const hours = (schedule.intervalMinutes ?? defaultIntervalMinutes) / 60
    freqText = hours >= 24 ? `Daily (${hours}h)` : `Every ${hours}h`
  }

  return nextText ? `${freqText} · ${nextText}` : freqText
}

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

  const [expandedOfflineShops, setExpandedOfflineShops] = useState<Record<string, boolean>>({})

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

  const renderOrderScheduleRow = (agent: ExtensionManagementAgent) => {
    const schedule = orderScheduleByAgentId.get(agent.id)
    const enabled = schedule?.enabled ?? false
    const compactTiming = formatCompactScheduleTiming(schedule, 120)
    const canWrite = canWriteOrders && canWriteOrdersForShop(account, agent.shopId)

    return (
      <li key="order-sync" className={styles.automationScheduleRowCompact}>
        <div className={styles.scheduleRowLeft}>
          <div className={styles.scheduleIconAndTitle}>
            <ShoppingCartOutlined className={styles.scheduleIconPrimary} />
            <Typography.Text strong className={styles.taskLabel}>
              {t('portal.integrations.extension.orderImport', {
                defaultValue: 'Order import',
              })}
            </Typography.Text>
          </div>

          <div className={styles.scheduleMetaCompact}>
            {enabled ? (
              <span className={styles.scheduleTimingBadge}>
                <ClockCircleOutlined
                  style={{ fontSize: 11, marginRight: 5, color: 'var(--ant-color-primary)' }}
                />
                <span>{compactTiming}</span>
              </span>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('portal.integrations.extension.disabled', { defaultValue: 'Off' })}
              </Typography.Text>
            )}

            {schedule?.lastError ? (
              <Tooltip title={schedule.lastError}>
                <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ margin: 0 }}>
                  Error
                </Tag>
              </Tooltip>
            ) : null}
          </div>
        </div>

        <div className={styles.scheduleRowRight}>
          <Switch
            size="small"
            checked={enabled}
            loading={isSavingSchedule}
            disabled={!canWrite}
            onChange={(checked) =>
              onSaveSchedule({
                agentId: agent.id,
                enabled: checked,
                scheduleType: schedule?.scheduleType,
                intervalMinutes: schedule?.intervalMinutes ?? 120,
                fixedTimes: schedule?.fixedTimes,
                timezone: schedule?.timezone,
              })
            }
          />
          {canWrite ? (
            <Space size={4}>
              {agent.status === 'ONLINE' ? (
                <ExtensionManualRequest
                  agent={agent}
                  source="ORDERS"
                  iconOnly
                  loading={isCreatingCommand}
                  onRequest={onCreateCommand}
                />
              ) : null}
              <ExtensionSchedulePopover
                iconOnly
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
            </Space>
          ) : null}
        </div>
      </li>
    )
  }

  const renderFinanceScheduleRow = (
    agent: ExtensionManagementAgent,
    source: ExtensionFinanceScheduleSource,
    label: string,
  ) => {
    const schedule = financeScheduleByAgentSource.get(`${agent.id}:${source}`)
    const enabled = schedule?.enabled ?? false
    const canWrite = canWriteFinance && canWriteFinanceForShop(account, agent.shopId)

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

    const compactTiming = formatCompactScheduleTiming(schedule, 1440)

    return (
      <li key={source} className={styles.automationScheduleRowCompact}>
        <div className={styles.scheduleRowLeft}>
          <div className={styles.scheduleIconAndTitle}>
            {icon}
            <Typography.Text strong className={styles.taskLabel}>
              {label}
            </Typography.Text>
          </div>

          <div className={styles.scheduleMetaCompact}>
            {enabled ? (
              <span className={styles.scheduleTimingBadge}>
                <ClockCircleOutlined
                  style={{ fontSize: 11, marginRight: 5, color: 'var(--ant-color-primary)' }}
                />
                <span>{compactTiming}</span>
                {intervalNote ? (
                  <Tooltip title={intervalNote}>
                    <InfoCircleOutlined
                      style={{
                        marginLeft: 5,
                        fontSize: 12,
                        color: 'var(--ant-color-text-tertiary)',
                        cursor: 'help',
                      }}
                    />
                  </Tooltip>
                ) : null}
              </span>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('portal.integrations.extension.disabled', { defaultValue: 'Off' })}
              </Typography.Text>
            )}
            {intervalNote ? <span className={styles.scheduleNote}>{intervalNote}</span> : null}

            {schedule?.lastError ? (
              <Tooltip title={schedule.lastError}>
                <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ margin: 0 }}>
                  Error
                </Tag>
              </Tooltip>
            ) : null}
          </div>
        </div>

        <div className={styles.scheduleRowRight}>
          <Switch
            size="small"
            aria-label={`${enabled ? 'Disable' : 'Enable'} ${label.toLowerCase()} sync`}
            checked={enabled}
            loading={isSavingFinanceSchedule}
            disabled={!canWrite}
            onChange={(checked) =>
              onSaveFinanceSchedule({ agentId: agent.id, source, enabled: checked })
            }
          />
          {canWrite ? (
            <Space size={4}>
              {agent.status === 'ONLINE' ? (
                <ExtensionManualRequest
                  agent={agent}
                  source={source}
                  iconOnly
                  loading={isCreatingCommand}
                  onRequest={onCreateCommand}
                />
              ) : null}
              <ExtensionSchedulePopover
                iconOnly
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
            </Space>
          ) : null}
        </div>
      </li>
    )
  }

  const renderAgentCard = (agent: ExtensionManagementAgent) => {
    return (
      <article
        key={agent.id}
        aria-label={`${shopNames.get(agent.shopId) ?? agent.shopId} / ${agent.label}`}
        className={styles.automationAgentCard}
      >
        <div className={styles.automationAgentHeaderCompact}>
          <div className={styles.agentIdentity}>
            <div
              className={
                agent.status === 'ONLINE' ? styles.agentIconBoxOnline : styles.agentIconBox
              }
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
          {renderOrderScheduleRow(agent)}
          {agent.provider !== 'ETSY' &&
            renderFinanceScheduleRow(
              agent,
              'ADS',
              t('portal.integrations.extension.manualRequests.ADS', {
                defaultValue: 'Ads',
              }),
            )}
          {agent.provider !== 'ETSY' &&
            renderFinanceScheduleRow(
              agent,
              'TRANSACTIONS',
              t('portal.integrations.extension.manualRequests.TRANSACTIONS', {
                defaultValue: 'Transaction',
              }),
            )}
          {renderFinanceScheduleRow(
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
            <Space direction="vertical" size={2}>
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
        width: 220,
        render: (_, agent) => (
          <Space direction="vertical" size={2}>
            <Space size={6}>
              <DesktopOutlined
                style={{
                  color:
                    agent.status === 'ONLINE'
                      ? 'var(--ant-color-success)'
                      : 'var(--ant-color-text-tertiary)',
                }}
              />
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
        width: 320,
        render: (_, agent) => {
          const schedule = orderScheduleByAgentId.get(agent.id)
          const enabled = schedule?.enabled ?? false
          const canWrite = canWriteOrders && canWriteOrdersForShop(account, agent.shopId)
          const compactTiming = formatCompactScheduleTiming(schedule, 120)

          return (
            <div className={styles.tableScheduleCell}>
              <div className={styles.tableScheduleInfo}>
                <Space size={8} align="center">
                  <Switch
                    size="small"
                    checked={enabled}
                    loading={isSavingSchedule}
                    disabled={!canWrite}
                    onChange={(checked) =>
                      onSaveSchedule({
                        agentId: agent.id,
                        enabled: checked,
                        scheduleType: schedule?.scheduleType,
                        intervalMinutes: schedule?.intervalMinutes ?? 120,
                        fixedTimes: schedule?.fixedTimes,
                        timezone: schedule?.timezone,
                      })
                    }
                  />
                  {enabled ? (
                    <span className={styles.scheduleTimingBadge}>
                      <ClockCircleOutlined
                        style={{ fontSize: 11, marginRight: 4, color: 'var(--ant-color-primary)' }}
                      />
                      <span>{compactTiming}</span>
                    </span>
                  ) : (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t('portal.integrations.extension.disabled', { defaultValue: 'Off' })}
                    </Typography.Text>
                  )}
                  {schedule?.lastError ? (
                    <Tooltip title={schedule.lastError}>
                      <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ margin: 0 }}>
                        Error
                      </Tag>
                    </Tooltip>
                  ) : null}
                </Space>
              </div>
              {canWrite ? (
                <Space size={4} style={{ marginTop: 2 }}>
                  {agent.status === 'ONLINE' ? (
                    <ExtensionManualRequest
                      agent={agent}
                      source="ORDERS"
                      iconOnly
                      loading={isCreatingCommand}
                      onRequest={onCreateCommand}
                    />
                  ) : null}
                  <ExtensionSchedulePopover
                    iconOnly
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
                </Space>
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
          const canWrite = canWriteFinance && canWriteFinanceForShop(account, agent.shopId)
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
                  intervalNote:
                    'Daily · D-1 · Sunday first run reconciles the previous 7 completed days',
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
                const compactTiming = formatCompactScheduleTiming(schedule, 1440)

                return (
                  <div key={item.source} className={styles.tableFinanceRow}>
                    <div className={styles.tableFinanceLabel}>
                      {item.icon}
                      <Typography.Text strong style={{ fontSize: 12 }}>
                        {item.label}
                      </Typography.Text>
                      <Switch
                        size="small"
                        checked={enabled}
                        loading={isSavingFinanceSchedule}
                        disabled={!canWrite}
                        onChange={(checked) =>
                          onSaveFinanceSchedule({
                            agentId: agent.id,
                            source: item.source,
                            enabled: checked,
                          })
                        }
                      />
                      {enabled ? (
                        <span className={styles.scheduleTimingBadge}>
                          <ClockCircleOutlined
                            style={{
                              fontSize: 11,
                              marginRight: 4,
                              color: 'var(--ant-color-primary)',
                            }}
                          />
                          <span>{compactTiming}</span>
                          {item.intervalNote ? (
                            <Tooltip title={item.intervalNote}>
                              <InfoCircleOutlined
                                style={{
                                  marginLeft: 4,
                                  fontSize: 11,
                                  color: 'var(--ant-color-text-tertiary)',
                                  cursor: 'help',
                                }}
                              />
                            </Tooltip>
                          ) : null}
                        </span>
                      ) : (
                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                          {t('portal.integrations.extension.disabled', { defaultValue: 'Off' })}
                        </Typography.Text>
                      )}
                    </div>
                    {canWrite ? (
                      <Space size={4}>
                        {agent.status === 'ONLINE' ? (
                          <ExtensionManualRequest
                            agent={agent}
                            source={item.source}
                            iconOnly
                            loading={isCreatingCommand}
                            onRequest={onCreateCommand}
                          />
                        ) : null}
                        <ExtensionSchedulePopover
                          iconOnly
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
                      </Space>
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
            {agentGroups.map((group) => {
              const isExpanded = Boolean(expandedOfflineShops[group.shopId])
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
                          onClick={() =>
                            setExpandedOfflineShops((prev) => ({
                              ...prev,
                              [group.shopId]: !prev[group.shopId],
                            }))
                          }
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
            })}
          </div>
        )}
      </Spin>
    </SectionCard>
  )
}
export default ExtensionAutomationTab
