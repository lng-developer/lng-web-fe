import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ClockCircleOutlined } from '@ant-design/icons'
import { Button, Popover, Select, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
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
  onSaveSchedule,
  onSaveFinanceSchedule,
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

  const renderFinanceSchedule = (
    agent: ExtensionManagementAgent,
    source: ExtensionFinanceScheduleSource,
    label: string,
  ) => {
    const schedule = financeScheduleByAgentSource.get(`${agent.id}:${source}`)
    return (
      <Space direction="vertical" size={2}>
        <Space size={6}>
          <Typography.Text>{label}</Typography.Text>
          {schedule?.enabled ? (
            <StatusTag status="operational">Enabled</StatusTag>
          ) : (
            <Typography.Text type="secondary">Disabled</Typography.Text>
          )}
          {canWriteFinance ? (
            <Button
              aria-label={`${schedule?.enabled ? 'Disable' : 'Enable'} ${label.toLowerCase()} sync`}
              loading={isSavingFinanceSchedule}
              size="small"
              onClick={() =>
                onSaveFinanceSchedule({
                  agentId: agent.id,
                  source,
                  enabled: !(schedule?.enabled ?? false),
                })
              }
            >
              {schedule?.enabled ? 'Disable' : 'Enable'}
            </Button>
          ) : null}
        </Space>
        {schedule?.enabled ? (
          <Typography.Text type="secondary">
            Next: {new Date(schedule.nextRunAt).toLocaleString()}
          </Typography.Text>
        ) : null}
        {schedule?.lastError ? (
          <Typography.Text type="danger">{schedule.lastError}</Typography.Text>
        ) : null}
      </Space>
    )
  }

  return (
    <SectionCard title="Automation">
      <Typography.Paragraph type="secondary">
        Configure recurring orders plus daily Transactions and Settlements imports for each
        connected extension.
      </Typography.Paragraph>
      <CoreDataTable<ExtensionManagementAgent>
        rowKey="id"
        loading={isLoading}
        dataSource={agents}
        pagination={false}
        columns={[
          {
            title: 'Shop',
            dataIndex: 'shopId',
            width: 180,
            render: (shopId: string) => shopNames.get(shopId) ?? shopId,
          },
          { title: 'RDC / Chrome', dataIndex: 'label', width: 200 },
          {
            title: 'Order schedule',
            width: 150,
            render: (_, agent) => {
              const schedule = orderScheduleByAgentId.get(agent.id)
              return schedule?.enabled ? (
                <StatusTag status="operational">Enabled</StatusTag>
              ) : (
                <Typography.Text type="secondary">Disabled</Typography.Text>
              )
            },
          },
          {
            title: 'Interval',
            width: 150,
            render: (_, agent) => {
              const schedule = orderScheduleByAgentId.get(agent.id)
              return schedule?.enabled ? `Every ${schedule.intervalMinutes / 60}h` : '—'
            },
          },
          {
            title: 'Next run',
            width: 180,
            render: (_, agent) => {
              const nextRunAt = orderScheduleByAgentId.get(agent.id)?.nextRunAt
              return nextRunAt ? new Date(nextRunAt).toLocaleString() : '—'
            },
          },
          {
            title: 'Finance sync',
            width: 300,
            render: (_, agent) => (
              <Space direction="vertical" size={8}>
                {renderFinanceSchedule(agent, 'TRANSACTIONS', 'Transaction')}
                {renderFinanceSchedule(agent, 'SETTLEMENTS', 'Settlement')}
              </Space>
            ),
          },
          {
            title: 'Actions',
            width: 130,
            render: (_, agent) => {
              if (!canWriteOrders) return null
              const schedule = orderScheduleByAgentId.get(agent.id)
              return (
                <Popover
                  title="Order schedule"
                  trigger="click"
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
                          onSaveSchedule({
                            agentId: agent.id,
                            enabled: schedule?.enabled ?? true,
                            intervalMinutes,
                          })
                        }
                      />
                      <Button
                        aria-label={t('portal.integrations.extension.saveOrderSchedule', {
                          defaultValue: 'Save schedule',
                        })}
                        type="primary"
                        loading={isSavingSchedule}
                        onClick={() =>
                          onSaveSchedule({
                            agentId: agent.id,
                            enabled: !(schedule?.enabled ?? false),
                            intervalMinutes: schedule?.intervalMinutes ?? 120,
                          })
                        }
                      >
                        {schedule?.enabled ? 'Disable schedule' : 'Save schedule'}
                      </Button>
                    </div>
                  }
                >
                  <Button
                    aria-label={t('portal.integrations.extension.configureOrderSchedule', {
                      defaultValue: 'Configure order schedule',
                    })}
                    icon={<ClockCircleOutlined />}
                  >
                    Configure
                  </Button>
                </Popover>
              )
            },
          },
        ]}
      />
    </SectionCard>
  )
}
