import { useTranslation } from 'react-i18next'
import {
  BankOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
  ExclamationCircleOutlined,
  FundOutlined,
  InfoCircleOutlined,
  SendOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { Button, Space, Switch, Tag, Tooltip, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { canWriteFinanceForShop, canWriteOrdersForShop } from '../auth/integrationAccess'
import { ExtensionManualRequest } from './ExtensionManualRequest'
import { ExtensionSchedulePopover } from './ExtensionSchedulePopover'
import type { CreateExtensionCommandInput } from './extensionHelpers'
import {
  ADS_INTERVAL_OPTIONS,
  formatCompactScheduleTiming,
  ORDER_INTERVAL_OPTIONS,
  SETTLEMENT_INTERVAL_OPTIONS,
  TRACKING_INTERVAL_OPTIONS,
  TRANSACTION_INTERVAL_OPTIONS,
} from './extensionScheduleConstants'

import type {
  ExtensionFinanceSchedule,
  ExtensionFinanceScheduleSource,
  ExtensionManagementAgent,
  ExtensionOrderSchedule,
  ExtensionScheduleType,
  ExtensionTrackingSchedule,
} from '../api/integrationApi'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'

export interface ExtensionOrderScheduleRowProps {
  readonly agent: ExtensionManagementAgent
  readonly schedule?: ExtensionOrderSchedule
  readonly account: CurrentAccount
  readonly canWriteOrders: boolean
  readonly isSavingSchedule: boolean
  readonly isCreatingCommand: boolean
  readonly onSaveSchedule: (input: {
    agentId: string
    enabled: boolean
    scheduleType?: ExtensionScheduleType
    intervalMinutes?: 60 | 120 | 180 | 240
    fixedTimes?: string[]
    timezone?: string
  }) => void
  readonly onCreateCommand: (input: CreateExtensionCommandInput) => void
}

export function ExtensionOrderScheduleRow({
  agent,
  schedule,
  account,
  canWriteOrders,
  isSavingSchedule,
  isCreatingCommand,
  onSaveSchedule,
  onCreateCommand,
}: ExtensionOrderScheduleRowProps) {
  const { t } = useTranslation()
  const enabled = schedule?.enabled ?? false
  const compactTiming = formatCompactScheduleTiming(schedule, 120)
  const canWrite = canWriteOrders && canWriteOrdersForShop(account, agent.shopId)

  return (
    <li className={styles.automationScheduleRowCompact}>
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

export interface ExtensionTrackingScheduleRowProps {
  readonly agent: ExtensionManagementAgent
  readonly schedule?: ExtensionTrackingSchedule
  readonly account: CurrentAccount
  readonly canWriteOrders: boolean
  readonly isSavingTrackingSchedule?: boolean
  readonly onSaveTrackingSchedule?: (input: {
    agentId: string
    enabled: boolean
    scheduleType?: ExtensionScheduleType
    intervalMinutes?: number
    fixedTimes?: string[]
    timezone?: string
  }) => void
  readonly onRequestTrackingScheduleNow?: (agentId: string) => void
}

export function ExtensionTrackingScheduleRow({
  agent,
  schedule,
  account,
  canWriteOrders,
  isSavingTrackingSchedule = false,
  onSaveTrackingSchedule,
  onRequestTrackingScheduleNow,
}: ExtensionTrackingScheduleRowProps) {
  const { t } = useTranslation()
  const enabled = schedule?.enabled ?? false
  const compactTiming = formatCompactScheduleTiming(schedule, 120)
  const canWrite = canWriteOrders && canWriteOrdersForShop(account, agent.shopId)

  return (
    <li className={styles.automationScheduleRowCompact}>
      <div className={styles.scheduleRowLeft}>
        <div className={styles.scheduleIconAndTitle}>
          <SendOutlined className={styles.scheduleIconPrimary} />
          <Typography.Text strong className={styles.taskLabel}>
            {t('portal.integrations.extension.trackingUpload', {
              defaultValue: 'Tracking upload',
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

          <Tooltip title="Daily · Auto-batch unsubmitted ready shipments to Amazon">
            <InfoCircleOutlined
              style={{
                marginLeft: 5,
                fontSize: 12,
                color: 'var(--ant-color-text-tertiary)',
                cursor: 'help',
              }}
            />
          </Tooltip>

          {schedule?.lastBatchCount !== undefined && schedule?.lastBatchCount > 0 ? (
            <Tag color="cyan" style={{ margin: 0 }}>
              {schedule.lastBatchCount} uploaded
            </Tag>
          ) : null}

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
          loading={isSavingTrackingSchedule}
          disabled={!canWrite}
          onChange={(checked) =>
            onSaveTrackingSchedule?.({
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
              <Tooltip title="Upload tracking now">
                <Button
                  type="text"
                  size="small"
                  icon={<SyncOutlined />}
                  onClick={() => onRequestTrackingScheduleNow?.(agent.id)}
                />
              </Tooltip>
            ) : null}
            <ExtensionSchedulePopover
              iconOnly
              title="Tracking upload schedule"
              buttonAriaLabel="Configure tracking upload schedule"
              enabled={enabled}
              scheduleType={schedule?.scheduleType}
              intervalMinutes={schedule?.intervalMinutes ?? 120}
              intervalOptions={TRACKING_INTERVAL_OPTIONS}
              fixedTimes={schedule?.fixedTimes}
              timezone={schedule?.timezone}
              loading={isSavingTrackingSchedule}
              onSave={(values) =>
                onSaveTrackingSchedule?.({
                  agentId: agent.id,
                  enabled: values.enabled ?? enabled,
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

export interface ExtensionFinanceScheduleRowProps {
  readonly agent: ExtensionManagementAgent
  readonly source: ExtensionFinanceScheduleSource
  readonly label: string
  readonly schedule?: ExtensionFinanceSchedule
  readonly account: CurrentAccount
  readonly canWriteFinance: boolean
  readonly isSavingFinanceSchedule: boolean
  readonly isCreatingCommand: boolean
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

export function ExtensionFinanceScheduleRow({
  agent,
  source,
  label,
  schedule,
  account,
  canWriteFinance,
  isSavingFinanceSchedule,
  isCreatingCommand,
  onSaveFinanceSchedule,
  onCreateCommand,
}: ExtensionFinanceScheduleRowProps) {
  const { t } = useTranslation()
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
        : source === 'ADS'
          ? 'Daily · D-1 · Sunday first run reconciles the previous 7 completed days'
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
    <li className={styles.automationScheduleRowCompact}>
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
