import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ApiOutlined,
  CloudDownloadOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  StopOutlined,
} from '@ant-design/icons'
import type { FormInstance } from 'antd'
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  Popconfirm,
  Popover,
  Segmented,
  Select,
  Space,
  Tooltip,
  Typography,
} from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import type {
  ExtensionTokenEnvironment,
  ExtensionTokenInput,
} from '@/features/auth/extension-tokens/api/extensionTokensApi'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import { DateRangePicker, FormattedDateTime, SectionCard, StatusTag } from '@/shared/ui'

import type {
  ExtensionCommand,
  ExtensionImportDays,
  ExtensionManagementAgent,
} from '../api/integrationApi'
import { canWriteFinanceForShop } from '../auth/integrationAccess'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'
import {
  type CreateExtensionCommandInput,
  EXTENSION_API_BASE_URLS,
  EXTENSION_ENVIRONMENT_LABELS,
  EXTENSION_ENVIRONMENT_TONES,
  isRecentlyReconnected,
  nextPollLabel,
} from './extensionHelpers'
import { LazyActionPopover } from './LazyActionPopover'

export interface ExtensionOperationsTabProps {
  readonly account: CurrentAccount
  readonly tokenForm: FormInstance<ExtensionTokenInput>
  readonly createdToken?: string
  readonly onCreatedTokenChange: (token?: string) => void
  readonly onCreateToken: (values: ExtensionTokenInput) => void
  readonly isCreatingToken: boolean
  readonly createTokenError?: unknown
  readonly shops: Shop[]
  readonly isShopsLoading: boolean
  readonly shopNames: Map<string, string>
  readonly setupShopOptions: Array<{ label: string; value: string }>
  readonly writableShops: Shop[]
  readonly managementAgents: ExtensionManagementAgent[]
  readonly isManagementAgentsLoading: boolean
  readonly commands: ExtensionCommand[]
  readonly isCommandsLoading: boolean
  readonly createCommandError?: unknown
  readonly isCreatingCommand: boolean
  readonly onCreateCommand: (input: CreateExtensionCommandInput) => void
  readonly onRevokeToken: (tokenId: string) => void
  readonly onSelectCommand: (command: ExtensionCommand) => void
  readonly noOnlineAgents: boolean
}

export function ExtensionOperationsTab({
  account,
  tokenForm,
  createdToken,
  onCreatedTokenChange,
  onCreateToken,
  isCreatingToken,
  createTokenError,
  shops,
  isShopsLoading,
  shopNames,
  setupShopOptions,
  writableShops,
  managementAgents,
  isManagementAgentsLoading,
  commands,
  isCommandsLoading,
  createCommandError,
  isCreatingCommand,
  onCreateCommand,
  onRevokeToken,
  onSelectCommand,
  noOnlineAgents,
}: ExtensionOperationsTabProps) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())
  const [commandImportDays, setCommandImportDays] = useState<Record<string, ExtensionImportDays>>(
    {},
  )
  const [adsCommandDates, setAdsCommandDates] = useState<
    Record<string, { dateFrom?: string; dateTo?: string }>
  >({})
  const [commandStatusFilter, setCommandStatusFilter] = useState<
    'ALL' | 'RUNNING' | 'FAILED' | 'SUCCEEDED'
  >('ALL')
  const initializedTokenShop = useRef(false)
  const defaultSetupShopId = setupShopOptions[0]?.value

  useEffect(() => {
    if (!initializedTokenShop.current && defaultSetupShopId) {
      tokenForm.setFieldValue('shopId', defaultSetupShopId)
      initializedTokenShop.current = true
    }
  }, [defaultSetupShopId, tokenForm])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const selectedEnvironment =
    Form.useWatch('environment', tokenForm) ?? ('development' as ExtensionTokenEnvironment)
  const apiBaseUrl = EXTENSION_API_BASE_URLS[selectedEnvironment]

  const extensionAgentById = useMemo(
    () => new Map(managementAgents.map((agent) => [agent.id, agent])),
    [managementAgents],
  )

  const filteredCommands = useMemo(() => {
    if (commandStatusFilter === 'ALL') return commands
    if (commandStatusFilter === 'RUNNING') {
      return commands.filter(
        (c) => c.status === 'RUNNING' || c.status === 'CLAIMED' || c.status === 'QUEUED',
      )
    }
    return commands.filter((c) => c.status === commandStatusFilter)
  }, [commands, commandStatusFilter])

  return (
    <div className={styles.operationsWorkbench}>
      <SectionCard title={t('portal.integrations.extension.title')}>
        <div className={styles.extensionSetup}>
          <Form
            form={tokenForm}
            layout="vertical"
            initialValues={{
              environment: 'development',
              name: t('portal.integrations.extension.defaultTokenName'),
              shopId: writableShops[0]?.id ?? shops[0]?.id,
            }}
            onFinish={onCreateToken}
          >
            <div className={styles.extensionGrid}>
              <Form.Item
                label={t('portal.integrations.shop', { defaultValue: 'Shop' })}
                name="shopId"
                rules={[{ required: true }]}
              >
                <Select
                  loading={isShopsLoading}
                  options={setupShopOptions}
                  placeholder={t('portal.integrations.allShops', { defaultValue: 'All shops' })}
                  showSearch
                  optionFilterProp="label"
                  onChange={() => onCreatedTokenChange(undefined)}
                />
              </Form.Item>
              <Form.Item
                label={t('portal.integrations.extension.environment', {
                  defaultValue: 'Environment',
                })}
                tooltip={apiBaseUrl}
                name="environment"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: 'Local', value: 'local' },
                    { label: t('portal.integrations.extension.development'), value: 'development' },
                    { label: t('portal.integrations.extension.production'), value: 'production' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                label={t('portal.integrations.extension.tokenName')}
                name="name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Button
                className={styles.createTokenButton}
                type="primary"
                htmlType="submit"
                loading={isCreatingToken}
              >
                {t('portal.integrations.extension.createToken', {
                  defaultValue: 'Create token',
                })}
              </Button>
            </div>
          </Form>
          {createdToken ? (
            <Alert
              type="warning"
              showIcon
              title={t('portal.integrations.extension.tokenWarning', {
                defaultValue: 'Copy the API access token before leaving this page.',
              })}
              description={
                <Typography.Text copyable className={styles.tokenText}>
                  {createdToken}
                </Typography.Text>
              }
            />
          ) : null}
          {createTokenError ? (
            <Alert type="error" showIcon message={(createTokenError as Error).message} />
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title={
          <div className={styles.sectionHeaderTitle}>
            <span>
              {t('portal.integrations.extension.agentsTitle', {
                defaultValue: 'Connected extensions (RDC / Chrome)',
              })}
            </span>
            <span className={styles.countBadge}>{managementAgents.length}</span>
          </div>
        }
        className={styles.tableCard}
      >
        <div className={styles.commandPanel}>
          {isManagementAgentsLoading ? (
            <Typography.Text>Loading extensions…</Typography.Text>
          ) : null}
          <CoreDataTable<ExtensionManagementAgent>
            rowKey="id"
            loading={isManagementAgentsLoading}
            dataSource={managementAgents}
            pagination={false}
            columns={[
              {
                title: 'Shop',
                dataIndex: 'shopId',
                width: 170,
                render: (shopId: string) => shopNames.get(shopId) ?? shopId,
              },
              { title: 'RDC / Chrome', dataIndex: 'label', width: 150 },
              {
                title: 'Environment',
                width: 115,
                render: (_, agent) => {
                  const environment = agent.token?.environment
                  if (!environment)
                    return <Typography.Text type="secondary">Unknown</Typography.Text>
                  return (
                    <StatusTag status={EXTENSION_ENVIRONMENT_TONES[environment] ?? 'ready'}>
                      {EXTENSION_ENVIRONMENT_LABELS[environment] ?? environment}
                    </StatusTag>
                  )
                },
              },
              {
                title: 'Status',
                dataIndex: 'status',
                width: 92,
                render: (status: string) => (
                  <StatusTag status={status === 'ONLINE' ? 'online' : 'offline'}>
                    {status}
                  </StatusTag>
                ),
              },
              {
                title: 'Connection',
                dataIndex: 'lastReconnectedAt',
                width: 110,
                render: (value: string | null | undefined, agent) =>
                  isRecentlyReconnected(agent, now) ? (
                    <Tooltip title={`Reconnected at ${new Date(value!).toLocaleString()}`}>
                      <StatusTag status="processing">Reconnected</StatusTag>
                    </Tooltip>
                  ) : (
                    '-'
                  ),
              },
              {
                title: 'Last seen',
                dataIndex: 'lastSeenAt',
                width: 160,
                render: (value: string) => <FormattedDateTime value={value} />,
              },
              {
                title: 'Next poll',
                dataIndex: 'lastSeenAt',
                width: 105,
                render: (value: string) => (
                  <Typography.Text type="secondary">{nextPollLabel(value, now)}</Typography.Text>
                ),
              },
              {
                title: 'Actions',
                width: 92,
                render: (_, agent) => {
                  const numDays = commandImportDays[agent.id] ?? 1
                  const adsDateRange = adsCommandDates[agent.id]
                  return (
                    <Space size={6}>
                      <LazyActionPopover
                        title="Pull Orders"
                        renderTrigger={(onOpen) => (
                          <Tooltip title="Configure and pull orders">
                            <Button
                              aria-label={t('portal.integrations.extension.configurePullOrders', {
                                defaultValue: 'Configure Pull Orders',
                              })}
                              type="primary"
                              icon={<CloudDownloadOutlined />}
                              disabled={agent.status !== 'ONLINE'}
                              onClick={onOpen}
                            />
                          </Tooltip>
                        )}
                        renderContent={() => (
                          <div className={styles.commandPopover}>
                            <Typography.Text strong>Order history</Typography.Text>
                            <Select
                              aria-label={t('portal.integrations.extension.orderHistoryWindow', {
                                defaultValue: 'Order history window',
                              })}
                              value={numDays}
                              onChange={(value: ExtensionImportDays) =>
                                setCommandImportDays((current) => ({
                                  ...current,
                                  [agent.id]: value,
                                }))
                              }
                              options={[1, 2, 7, 15, 30].map((value) => ({
                                value,
                                label: `${value} day${value === 1 ? '' : 's'}`,
                              }))}
                            />
                            <Button
                              aria-label={t('portal.integrations.extension.pullOrders', {
                                defaultValue: 'Pull orders',
                              })}
                              type="primary"
                              icon={<CloudDownloadOutlined />}
                              loading={isCreatingCommand}
                              onClick={() =>
                                onCreateCommand({
                                  agentId: agent.id,
                                  type: 'IMPORT_NEW_ORDERS',
                                  numDays,
                                })
                              }
                            >
                              Pull orders
                            </Button>
                          </div>
                        )}
                      />
                      <LazyActionPopover
                        title="More actions"
                        renderTrigger={(onOpen) => (
                          <Tooltip title="More extension actions">
                            <Button
                              aria-label={t('portal.integrations.extension.moreActions', {
                                defaultValue: 'More extension actions',
                              })}
                              icon={<MoreOutlined />}
                              onClick={onOpen}
                            />
                          </Tooltip>
                        )}
                        renderContent={() => (
                          <Space direction="vertical" size={4}>
                            <Popover
                              title="Pull Ads"
                              trigger="click"
                              content={
                                <div className={styles.commandPopover}>
                                  <Typography.Text strong>Ads period</Typography.Text>
                                  <DateRangePicker
                                    aria-label={t('portal.integrations.extension.adsDateRange', {
                                      defaultValue: 'Ads date range',
                                    })}
                                    value={adsDateRange}
                                    onChange={(value) =>
                                      setAdsCommandDates((current) => ({
                                        ...current,
                                        [agent.id]: value,
                                      }))
                                    }
                                  />
                                  <Button
                                    aria-label={t('portal.integrations.extension.pullAds', {
                                      defaultValue: 'Pull Ads',
                                    })}
                                    type="primary"
                                    icon={<CloudDownloadOutlined />}
                                    loading={isCreatingCommand}
                                    disabled={!adsDateRange?.dateFrom || !adsDateRange?.dateTo}
                                    onClick={() =>
                                      onCreateCommand({
                                        agentId: agent.id,
                                        type: 'IMPORT_ADS_SPEND',
                                        ...adsDateRange,
                                      })
                                    }
                                  >
                                    Pull Ads
                                  </Button>
                                </div>
                              }
                            >
                              <Button
                                aria-label={t('portal.integrations.extension.configurePullAds', {
                                  defaultValue: 'Configure Pull Ads',
                                })}
                                block
                                icon={<CloudDownloadOutlined />}
                                disabled={
                                  agent.status !== 'ONLINE' ||
                                  !canWriteFinanceForShop(account, agent.shopId)
                                }
                              >
                                Pull Ads
                              </Button>
                            </Popover>
                            <Button
                              aria-label={t('portal.integrations.extension.testConnection', {
                                defaultValue: 'Test connection',
                              })}
                              block
                              icon={<ApiOutlined />}
                              loading={isCreatingCommand}
                              disabled={agent.status !== 'ONLINE'}
                              onClick={() =>
                                onCreateCommand({ agentId: agent.id, type: 'TEST_CONNECTION' })
                              }
                            >
                              Test connection
                            </Button>
                            {!agent.token?.revokedAt && agent.token ? (
                              <>
                                <Divider style={{ margin: '4px 0' }} />
                                <Popconfirm
                                  title="Revoke this extension token?"
                                  okText="Revoke"
                                  onConfirm={() => onRevokeToken(agent.token!.id)}
                                >
                                  <Button
                                    aria-label={t('portal.integrations.extension.revokeToken', {
                                      defaultValue: 'Revoke token',
                                    })}
                                    danger
                                    block
                                    icon={<StopOutlined />}
                                  >
                                    Revoke token
                                  </Button>
                                </Popconfirm>
                              </>
                            ) : null}
                          </Space>
                        )}
                      />
                    </Space>
                  )
                },
              },
            ]}
            scroll={{ x: 1_040 }}
          />
          {noOnlineAgents ? (
            <Typography.Text type="secondary">
              {t('portal.integrations.extension.noAgents', {
                defaultValue: 'No online extension found. Open the extension on the RDC first.',
              })}
            </Typography.Text>
          ) : null}
          {createCommandError ? (
            <Alert type="error" showIcon message={(createCommandError as Error).message} />
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title={
          <div className={styles.sectionHeaderTitle}>
            <span>
              {t('portal.integrations.extension.commandActivity', {
                defaultValue: 'Extension command activity',
              })}
            </span>
            <span className={styles.countBadge}>{commands.length}</span>
          </div>
        }
        extra={
          <Segmented
            size="small"
            value={commandStatusFilter}
            onChange={(val) => setCommandStatusFilter(val as typeof commandStatusFilter)}
            options={[
              {
                value: 'ALL',
                label: t('portal.integrations.extension.allCommands', {
                  defaultValue: 'All commands',
                }),
              },
              {
                value: 'RUNNING',
                label: t('portal.integrations.extension.runningCommands', {
                  defaultValue: 'Running / Claimed',
                }),
              },
              {
                value: 'FAILED',
                label: t('portal.integrations.extension.failedOnly', {
                  defaultValue: 'Failed only',
                }),
              },
              {
                value: 'SUCCEEDED',
                label: t('portal.integrations.extension.succeededOnly', {
                  defaultValue: 'Succeeded',
                }),
              },
            ]}
          />
        }
        className={styles.tableCard}
      >
        <CoreDataTable
          rowKey="id"
          loading={isCommandsLoading}
          dataSource={filteredCommands}
          pagination={false}
          columns={[
            {
              title: t('portal.integrations.extension.command', { defaultValue: 'Command' }),
              dataIndex: 'type',
              width: 175,
            },
            {
              title: 'Extension',
              width: 180,
              render: (_, command) => {
                const agent = extensionAgentById.get(command.agentId)
                if (!agent)
                  return <Typography.Text type="secondary">Unknown extension</Typography.Text>
                const environment = agent.token?.environment
                return (
                  <Space size={6}>
                    <Typography.Text>{agent.label}</Typography.Text>
                    {environment ? (
                      <StatusTag status={EXTENSION_ENVIRONMENT_TONES[environment] ?? 'ready'}>
                        {EXTENSION_ENVIRONMENT_LABELS[environment] ?? environment}
                      </StatusTag>
                    ) : null}
                  </Space>
                )
              },
            },
            {
              title: t('portal.integrations.extension.status', { defaultValue: 'Status' }),
              dataIndex: 'status',
              width: 125,
              render: (status: string, command) => (
                <Space size={6}>
                  <StatusTag
                    status={
                      status === 'SUCCEEDED'
                        ? 'operational'
                        : status === 'FAILED'
                          ? 'critical'
                          : 'pending'
                    }
                  >
                    {status}
                  </StatusTag>
                  <Tooltip title="View task details">
                    <Button
                      aria-label={t('portal.integrations.extension.viewTaskDetails', {
                        defaultValue: 'View task details',
                      })}
                      type="text"
                      icon={<InfoCircleOutlined />}
                      onClick={() => onSelectCommand(command)}
                    />
                  </Tooltip>
                </Space>
              ),
            },
            {
              title: 'Next poll',
              width: 105,
              render: (_, command) => {
                if (command.status === 'FAILED') return 'Not retrying'
                if (command.status === 'SUCCEEDED') return 'Completed'
                if (command.status === 'RUNNING' || command.status === 'CLAIMED')
                  return 'Processing…'
                const agentId = command.agentId
                const agent = extensionAgentById.get(agentId)
                return agent ? nextPollLabel(agent.lastSeenAt, now) : '-'
              },
            },
            {
              title: t('portal.integrations.extension.created', { defaultValue: 'Created' }),
              dataIndex: 'createdAt',
              width: 160,
              render: (value: string) => <FormattedDateTime value={value} />,
            },
          ]}
          scroll={{ x: 760 }}
        />
      </SectionCard>
    </div>
  )
}
