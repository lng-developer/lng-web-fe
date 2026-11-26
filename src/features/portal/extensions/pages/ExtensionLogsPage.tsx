import { useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  RedoOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Input, Segmented, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'

import { canReadFinanceImports } from '@/features/portal/integrations/auth/integrationAccess'
import { ExtensionCommandDrawer } from '@/features/portal/integrations/components/ExtensionCommandDrawer'
import { getExtensionCommandErrorKey } from '@/features/portal/integrations/components/extensionHelpers'
import type { FinanceImportSourceType } from '@/features/portal/integrations/hooks/useFinanceImports'
import { ImportJobPanel } from '@/features/portal/integrations/pages/ImportJobPanel'
import { canUseScopedPermission } from '@/shared/auth/permissions'
import { MetricCard, PageHeader, SectionCard, TableTextCell } from '@/shared/ui'
import type { ExtensionCommand, ExtensionImportDays } from '../api/extensionApi'
import { ExtensionFinanceCommandDetail } from '../components/ExtensionFinanceCommandDetail'
import { ExtensionPlatformBadge } from '../components/ExtensionPlatformBadge'
import { useExtensionHub } from '../hooks/useExtensionHub'
import styles from './ExtensionLogsPage.module.scss'

const financeCommandSources: Partial<Record<ExtensionCommand['type'], FinanceImportSourceType>> = {
  IMPORT_ADS_SPEND: 'ADS',
  IMPORT_TRANSACTIONS: 'TRANSACTIONS',
  IMPORT_SETTLEMENTS: 'SETTLEMENTS',
}

const emptyCommands: ExtensionCommand[] = []

export function ExtensionLogsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'vi' ? 'vi-VN' : 'en-US'
  const {
    account,
    canWrite,
    commands,
    extensionCommands,
    shopNames,
    shopPlatforms,
    onlineManagementAgents,
    extensionManagementAgents,
    createCommand,
    selectedCommand,
    setSelectedCommand,
    failedCommandsCount,
  } = useExtensionHub()

  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'AMAZON' | 'ETSY'>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const currentCommand = selectedCommand
    ? (commands.find((command) => command.id === selectedCommand.id) ?? selectedCommand)
    : undefined
  const financeSource = currentCommand && financeCommandSources[currentCommand.type]
  const importJobId =
    !financeSource &&
    currentCommand?.importJobId &&
    ['ORDERS:READ', 'ORDERS:WRITE'].some((permission) =>
      canUseScopedPermission(account, permission, {
        scopeType: 'shop',
        scopeId: currentCommand.shopId,
      }),
    )
      ? currentCommand.importJobId
      : undefined
  const closeDetails = () => setSelectedCommand(undefined)

  const agentLabelById = useMemo(() => {
    return new Map(onlineManagementAgents.map((a) => [a.id, a.label || a.clientId]))
  }, [onlineManagementAgents])

  const filteredCommands = useMemo(() => {
    return commands.filter((cmd) => {
      if (!agentLabelById.has(cmd.agentId)) return false

      const platform = (cmd.provider || shopPlatforms.get(cmd.shopId) || 'AMAZON').toUpperCase()
      if (platformFilter !== 'ALL' && platform !== platformFilter) {
        return false
      }
      if (statusFilter !== 'ALL' && cmd.status !== statusFilter) {
        return false
      }
      if (typeFilter !== 'ALL' && cmd.type !== typeFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const shopName = shopNames.get(cmd.shopId)?.toLowerCase() ?? ''
        const agentName = (agentLabelById.get(cmd.agentId) ?? '').toLowerCase()
        const cmdId = (cmd.id ?? '').toLowerCase()
        return cmdId.includes(query) || shopName.includes(query) || agentName.includes(query)
      }
      return true
    })
  }, [
    commands,
    platformFilter,
    statusFilter,
    typeFilter,
    searchQuery,
    shopPlatforms,
    shopNames,
    agentLabelById,
  ])
  const displayedCommands = useDeferredValue(filteredCommands, emptyCommands)

  const runningCount = useMemo(
    () => commands.filter((c) => c.status === 'RUNNING' || c.status === 'CLAIMED').length,
    [commands],
  )
  const succeededCount = useMemo(
    () => commands.filter((c) => c.status === 'SUCCEEDED').length,
    [commands],
  )
  const queuedCount = useMemo(
    () => commands.filter((c) => c.status === 'QUEUED').length,
    [commands],
  )

  const columns: TableColumnsType<ExtensionCommand> = [
    {
      title: t('portal.extensions.logs.table.status', { defaultValue: 'Status' }),
      key: 'status',
      width: 120,
      render: (_, cmd) => {
        let color = 'default'
        if (cmd.status === 'SUCCEEDED') color = 'success'
        if (cmd.status === 'FAILED') color = 'error'
        if (cmd.status === 'RUNNING' || cmd.status === 'CLAIMED') color = 'processing'
        if (cmd.status === 'QUEUED') color = 'warning'
        return (
          <Tag color={color}>
            {t(`extensionCommand.statuses.${cmd.status}`, { defaultValue: cmd.status })}
          </Tag>
        )
      },
    },
    {
      title: t('portal.extensions.logs.table.platform', { defaultValue: 'Platform' }),
      key: 'platform',
      width: 110,
      render: (_, cmd) => {
        const platform = cmd.provider || shopPlatforms.get(cmd.shopId) || 'AMAZON'
        return <ExtensionPlatformBadge platform={platform} />
      },
    },
    {
      title: t('portal.extensions.logs.table.type', { defaultValue: 'Command' }),
      key: 'type',
      render: (_, cmd) => (
        <Tag>{t(`extensionCommand.types.${cmd.type}`, { defaultValue: cmd.type })}</Tag>
      ),
    },
    {
      title: t('portal.extensions.logs.table.shop', { defaultValue: 'Shop' }),
      key: 'shop',
      render: (_, cmd) => <span>{shopNames.get(cmd.shopId) || cmd.shopId}</span>,
    },
    {
      title: t('portal.extensions.logs.table.agent', { defaultValue: 'Agent Machine' }),
      key: 'agent',
      render: (_, cmd) => <span>{agentLabelById.get(cmd.agentId) || cmd.agentId}</span>,
    },
    {
      title: t('portal.extensions.logs.table.result', { defaultValue: 'Execution Result' }),
      key: 'result',
      render: (_, cmd) => {
        const errorMessage = cmd.errorMessage?.trim()
        const failedWithoutResult =
          !cmd.result && (cmd.status === 'FAILED' || cmd.status === 'PARTIAL_FAILED')
        if (errorMessage || failedWithoutResult) {
          const reasonKey = getExtensionCommandErrorKey(errorMessage)

          return (
            <span className={styles.errorResult}>
              <Typography.Text
                aria-hidden="true"
                className={styles.errorResultIcon}
                type={reasonKey === 'etsyImportNeedsReview' ? 'warning' : 'danger'}
              >
                <ExclamationCircleOutlined />
              </Typography.Text>
              <TableTextCell
                value={t(`extensionCommandErrors.${reasonKey}`)}
                title={reasonKey === 'seeDetails' ? errorMessage : undefined}
                maxWidth={240}
                maxChars={64}
                strong
              />
            </span>
          )
        }
        if (cmd.result) {
          return (
            <div className={styles.resultCell}>
              <span>
                {t('portal.integrations.panel.imported')}:{' '}
                <b>{(cmd.result.importedCount ?? 0).toLocaleString(locale)}</b>
              </span>
              {cmd.result.failedCount ? (
                <span className={styles.mutedText}>
                  {t('portal.integrations.panel.failed')}:{' '}
                  {cmd.result.failedCount.toLocaleString(locale)}
                </span>
              ) : null}
            </div>
          )
        }
        return <span className={styles.mutedText}>—</span>
      },
    },
    {
      title: t('portal.extensions.logs.table.time', { defaultValue: 'Timestamp' }),
      key: 'createdAt',
      width: 170,
      render: (_, cmd) => {
        const date = new Date(cmd.createdAt)
        return (
          <div className={styles.timeCell}>
            <span>{date.toLocaleTimeString(locale)}</span>
            <span className={styles.mutedText}>{date.toLocaleDateString(locale)}</span>
          </div>
        )
      },
    },
    {
      title: t('common.actions', { defaultValue: 'Actions' }),
      key: 'actions',
      width: 130,
      render: (_, cmd) => (
        <Space size="small">
          <Tooltip
            title={t('portal.extensions.logs.actions.details', {
              defaultValue: 'View command payload & response',
            })}
          >
            <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedCommand(cmd)}>
              {t('common.view', { defaultValue: 'Details' })}
            </Button>
          </Tooltip>
          {cmd.status === 'FAILED' && canWrite ? (
            <Tooltip title={t('common.retry', { defaultValue: 'Retry command' })}>
              <Button
                size="small"
                icon={<RedoOutlined />}
                aria-label={t('common.retry')}
                loading={createCommand.isPending}
                onClick={() =>
                  createCommand.mutate({
                    agentId: cmd.agentId,
                    type: cmd.type,
                    numDays: cmd.numDays as ExtensionImportDays | undefined,
                    maxOrders: cmd.maxOrders ?? undefined,
                  })
                }
              />
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('legacyMenu.logManager', { defaultValue: 'Command Log Manager' })}
        description={t('portal.extensions.logs.subtitle', {
          defaultValue:
            'Monitor bot command dispatch queues, track live execution status, and inspect payload logs.',
        })}
      />

      <div className={styles.metricsGrid}>
        <MetricCard
          icon={<ThunderboltOutlined />}
          label={t('portal.extensions.metrics.totalCommands', { defaultValue: 'Total Commands' })}
          value={commands.length}
          variant="neutral"
        />
        <MetricCard
          icon={<SyncOutlined spin={runningCount > 0} />}
          label={t('portal.extensions.metrics.runningCommands', {
            defaultValue: 'In Progress / Queued',
          })}
          value={runningCount + queuedCount}
          variant={runningCount > 0 ? 'info' : 'neutral'}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          label={t('portal.extensions.metrics.succeededCommands', { defaultValue: 'Succeeded' })}
          value={succeededCount}
          variant="success"
        />
        <MetricCard
          icon={<AlertOutlined />}
          label={t('portal.extensions.metrics.failedCommands', { defaultValue: 'Needs Attention' })}
          value={failedCommandsCount}
          variant={failedCommandsCount > 0 ? 'danger' : 'neutral'}
        />
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.filterGroup}>
          <Segmented
            value={platformFilter}
            onChange={(val) => setPlatformFilter(val as 'ALL' | 'AMAZON' | 'ETSY')}
            options={[
              { value: 'ALL', label: t('common.all', { defaultValue: 'All Platforms' }) },
              { value: 'AMAZON', label: 'Amazon' },
              { value: 'ETSY', label: 'Etsy' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 140 }}
            options={[
              {
                value: 'ALL',
                label: t('portal.extensions.filters.allStatus', { defaultValue: 'All Status' }),
              },
              ...(['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED'] as const).map((value) => ({
                value,
                label: t(`extensionCommand.statuses.${value}`),
              })),
            ]}
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 180 }}
            options={[
              {
                value: 'ALL',
                label: t('portal.extensions.filters.allTypes', { defaultValue: 'All Types' }),
              },
              ...(
                [
                  'IMPORT_NEW_ORDERS',
                  'IMPORT_ADS_SPEND',
                  'IMPORT_TRANSACTIONS',
                  'IMPORT_SETTLEMENTS',
                  'TEST_CONNECTION',
                ] as const
              ).map((value) => ({
                value,
                label: t(`extensionCommand.types.${value}`),
              })),
            ]}
          />
        </div>

        <Space>
          <Input
            prefix={<SearchOutlined />}
            placeholder={t('portal.extensions.filters.searchPlaceholder', {
              defaultValue: 'Search command, shop, client...',
            })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
          <Button
            icon={<ReloadOutlined />}
            aria-label={t('common.refresh')}
            onClick={() => {
              void extensionCommands.refetch()
              void extensionManagementAgents.refetch()
            }}
            loading={extensionCommands.isFetching || extensionManagementAgents.isFetching}
          />
        </Space>
      </div>

      <SectionCard>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={displayedCommands}
          loading={
            extensionCommands.isLoading ||
            extensionManagementAgents.isLoading ||
            displayedCommands !== filteredCommands
          }
          locale={{ emptyText: t('common.noMatchingResults') }}
          pagination={{
            pageSize: 15,
            showTotal: (count) => t('extensionCommand.total', { count }),
          }}
          size="middle"
        />
      </SectionCard>

      {currentCommand && financeSource && account && canReadFinanceImports(account) ? (
        <ExtensionFinanceCommandDetail
          key={currentCommand.id}
          account={account}
          command={currentCommand}
          sourceType={financeSource}
          onClose={closeDetails}
        />
      ) : importJobId ? (
        <ImportJobPanel
          account={account}
          jobId={importJobId}
          commandError={currentCommand?.errorMessage}
          presentation="panel"
          open
          onClose={closeDetails}
        />
      ) : (
        <ExtensionCommandDrawer
          command={currentCommand}
          showImportJobLink={false}
          onClose={closeDetails}
        />
      )}
    </div>
  )
}
export default ExtensionLogsPage
