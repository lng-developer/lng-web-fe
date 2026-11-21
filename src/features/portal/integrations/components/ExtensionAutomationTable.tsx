import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BankOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  DollarCircleOutlined,
  ExclamationCircleOutlined,
  FundOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { Space, Switch, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { StatusTag } from '@/shared/ui'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { ExtensionPlatformBadge } from '@/features/portal/extensions/components/ExtensionPlatformBadge'
import { canWriteFinanceForShop, canWriteOrdersForShop } from '../auth/integrationAccess'
import { ExtensionManualRequest } from './ExtensionManualRequest'
import { ExtensionSchedulePopover, type IntervalOption } from './ExtensionSchedulePopover'
import type { CreateExtensionCommandInput } from './extensionHelpers'
import {
  ADS_INTERVAL_OPTIONS,
  formatCompactScheduleTiming,
  ORDER_INTERVAL_OPTIONS,
  SETTLEMENT_INTERVAL_OPTIONS,
  TRANSACTION_INTERVAL_OPTIONS,
} from './extensionScheduleConstants'

import type {
  ExtensionFinanceSchedule,
  ExtensionFinanceScheduleSource,
  ExtensionManagementAgent,
  ExtensionOrderSchedule,
  ExtensionScheduleType,
} from '../api/integrationApi'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'

export interface ExtensionAutomationTableProps {
  readonly agents: ExtensionManagementAgent[]
  readonly account: CurrentAccount
  readonly shopNames: Map<string, string>
  readonly orderScheduleByAgentId: Map<string, ExtensionOrderSchedule>
  readonly financeScheduleByAgentSource: Map<string, ExtensionFinanceSchedule>
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

export function ExtensionAutomationTable({
  agents,
  account,
  shopNames,
  orderScheduleByAgentId,
  financeScheduleByAgentSource,
  canWriteOrders,
  canWriteFinance,
  isSavingSchedule,
  isSavingFinanceSchedule,
  isCreatingCommand,
  onSaveSchedule,
  onSaveFinanceSchedule,
  onCreateCommand,
}: ExtensionAutomationTableProps) {
  const { t } = useTranslation()

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
    <div className={styles.automationTableWrapper}>
      <Table<ExtensionManagementAgent>
        columns={tableColumns}
        dataSource={agents}
        rowKey="id"
        size="small"
        pagination={{
          pageSize: DEFAULT_PAGE_SIZE,
          showSizeChanger: true,
          showTotal: (total) => `${total} extensions`,
        }}
      />
    </div>
  )
}
