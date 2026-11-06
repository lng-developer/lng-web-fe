import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  RedoOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Input, Segmented, Select, Space, Table, Tag, Tooltip } from 'antd'

import { MetricCard, PageHeader, SectionCard } from '@/shared/ui'
import { ExtensionCommandDrawer } from '@/features/portal/integrations/components/ExtensionCommandDrawer'
import type { ExtensionCommand, ExtensionImportDays } from '../api/extensionApi'
import { ExtensionPlatformBadge } from '../components/ExtensionPlatformBadge'
import { useExtensionHub } from '../hooks/useExtensionHub'
import styles from './ExtensionLogsPage.module.scss'

export function ExtensionLogsPage() {
  const { t } = useTranslation()
  const {
    canWrite,
    commands,
    extensionCommands,
    shopNames,
    shopPlatforms,
    managementAgents,
    createCommand,
    selectedCommand,
    setSelectedCommand,
    failedCommandsCount,
  } = useExtensionHub()

  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'AMAZON' | 'ETSY'>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const agentLabelById = useMemo(() => {
    return new Map(managementAgents.map((a) => [a.id, a.label || a.clientId]))
  }, [managementAgents])

  const filteredCommands = useMemo(() => {
    return commands.filter((cmd) => {
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
        return <Tag color={color}>{cmd.status}</Tag>
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
      render: (_, cmd) => {
        let label = cmd.type as string
        if (cmd.type === 'IMPORT_NEW_ORDERS') label = 'Sync Orders'
        if (cmd.type === 'IMPORT_ADS_SPEND') label = 'Ads Spend'
        if (cmd.type === 'IMPORT_TRANSACTIONS') label = 'Transactions'
        if (cmd.type === 'IMPORT_SETTLEMENTS') label = 'Settlements'
        if (cmd.type === 'TEST_CONNECTION') label = 'Connection Ping'
        if (cmd.type === 'SYNC_LISTING_IMAGES') label = 'Listing Images'
        return (
          <div>
            <Tag>{label}</Tag>
            <div className={styles.mutedText}>{cmd.type}</div>
          </div>
        )
      },
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
        if (cmd.errorMessage) {
          return (
            <div className={styles.resultCell}>
              <Tag color="error">{cmd.errorMessage}</Tag>
            </div>
          )
        }
        if (cmd.result) {
          return (
            <div className={styles.resultCell}>
              <span>
                Imported: <b>{cmd.result.importedCount ?? 0}</b>
              </span>
              {cmd.result.failedCount ? (
                <span className={styles.mutedText}>Failed: {cmd.result.failedCount}</span>
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
            <span>{date.toLocaleTimeString()}</span>
            <span className={styles.mutedText}>{date.toLocaleDateString()}</span>
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
              { value: 'QUEUED', label: 'Queued' },
              { value: 'RUNNING', label: 'Running' },
              { value: 'SUCCEEDED', label: 'Succeeded' },
              { value: 'FAILED', label: 'Failed' },
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
              { value: 'IMPORT_NEW_ORDERS', label: 'Sync Orders' },
              { value: 'IMPORT_ADS_SPEND', label: 'Ads Spend' },
              { value: 'IMPORT_TRANSACTIONS', label: 'Transactions' },
              { value: 'IMPORT_SETTLEMENTS', label: 'Settlements' },
              { value: 'TEST_CONNECTION', label: 'Ping Connection' },
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
            onClick={() => extensionCommands.refetch()}
            loading={extensionCommands.isFetching}
          />
        </Space>
      </div>

      <SectionCard>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredCommands}
          loading={extensionCommands.isLoading}
          pagination={{ pageSize: 15, showTotal: (total) => `Total ${total} commands` }}
          size="middle"
        />
      </SectionCard>

      <ExtensionCommandDrawer
        command={commands.find((c) => c.id === selectedCommand?.id) ?? selectedCommand}
        onClose={() => setSelectedCommand(undefined)}
      />
    </div>
  )
}
export default ExtensionLogsPage
