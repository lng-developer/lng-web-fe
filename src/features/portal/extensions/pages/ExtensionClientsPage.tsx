import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ApiOutlined,
  CheckCircleOutlined,
  DesktopOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Input, Popconfirm, Segmented, Select, Space, Table, Tag, Tooltip } from 'antd'

import { MetricCard, PageHeader, SectionCard } from '@/shared/ui'
import type { ExtensionManagementAgent } from '../api/extensionApi'
import { ExtensionPlatformBadge } from '../components/ExtensionPlatformBadge'
import { ExtensionTokenModal } from '../components/ExtensionTokenModal'
import { useExtensionHub } from '../hooks/useExtensionHub'
import styles from './ExtensionClientsPage.module.scss'

export function ExtensionClientsPage() {
  const { t } = useTranslation()
  const {
    canWrite,
    managementAgents,
    extensionManagementAgents,
    shopNames,
    shopPlatforms,
    setupShopOptions,
    tokenForm,
    createdToken,
    setCreatedToken,
    createToken,
    revokeToken,
    createCommand,
    onlineAgentsCount,
  } = useExtensionHub()

  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'AMAZON' | 'ETSY'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [tokenModalOpen, setTokenModalOpen] = useState(false)

  const filteredAgents = useMemo(() => {
    return managementAgents.filter((agent) => {
      const shopPlatform = (
        agent.provider ||
        shopPlatforms.get(agent.shopId) ||
        'AMAZON'
      ).toUpperCase()
      if (platformFilter !== 'ALL' && shopPlatform !== platformFilter) {
        return false
      }
      if (statusFilter !== 'ALL' && agent.status !== statusFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const shopName = shopNames.get(agent.shopId)?.toLowerCase() ?? ''
        const clientLabel = (agent.label ?? '').toLowerCase()
        const clientId = (agent.clientId ?? '').toLowerCase()
        return clientLabel.includes(query) || clientId.includes(query) || shopName.includes(query)
      }
      return true
    })
  }, [managementAgents, platformFilter, statusFilter, searchQuery, shopPlatforms, shopNames])

  const amazonAgentsCount = useMemo(() => {
    return managementAgents.filter((agent) => {
      const platform = (agent.provider || shopPlatforms.get(agent.shopId) || 'AMAZON').toUpperCase()
      return platform === 'AMAZON'
    }).length
  }, [managementAgents, shopPlatforms])

  const etsyAgentsCount = useMemo(() => {
    return managementAgents.filter((agent) => {
      const platform = (agent.provider || shopPlatforms.get(agent.shopId) || 'AMAZON').toUpperCase()
      return platform === 'ETSY'
    }).length
  }, [managementAgents, shopPlatforms])

  const columns: TableColumnsType<ExtensionManagementAgent> = [
    {
      title: t('portal.extensions.clients.table.status', { defaultValue: 'Status' }),
      key: 'status',
      width: 120,
      render: (_, agent) => {
        const isOnline = agent.status === 'ONLINE'
        return (
          <Tag
            color={isOnline ? 'success' : 'default'}
            icon={isOnline ? <CheckCircleOutlined /> : undefined}
          >
            {agent.status}
          </Tag>
        )
      },
    },
    {
      title: t('portal.extensions.clients.table.platform', { defaultValue: 'Platform' }),
      key: 'platform',
      width: 110,
      render: (_, agent) => {
        const platform = agent.provider || shopPlatforms.get(agent.shopId) || 'AMAZON'
        return <ExtensionPlatformBadge platform={platform} />
      },
    },
    {
      title: t('portal.extensions.clients.table.client', { defaultValue: 'Client Machine' }),
      key: 'client',
      render: (_, agent) => (
        <div className={styles.clientCell}>
          <span className={styles.clientLabel}>{agent.label || agent.clientId}</span>
          <span className={styles.clientId}>{agent.clientId}</span>
        </div>
      ),
    },
    {
      title: t('portal.extensions.clients.table.shop', { defaultValue: 'Bound Shop' }),
      key: 'shop',
      render: (_, agent) => {
        const name = shopNames.get(agent.shopId) || agent.shopId
        return <span>{name}</span>
      },
    },
    {
      title: t('portal.extensions.clients.table.version', { defaultValue: 'Version & Host' }),
      key: 'version',
      render: (_, agent) => (
        <div className={styles.clientCell}>
          <span>{agent.version ? `v${agent.version}` : 'v1.0.0'}</span>
          <span className={styles.clientId}>{agent.apiBaseUrl || 'Default Gateway'}</span>
        </div>
      ),
    },
    {
      title: t('portal.extensions.clients.table.lastSeen', { defaultValue: 'Last Heartbeat' }),
      key: 'lastSeenAt',
      render: (_, agent) => {
        if (!agent.lastSeenAt) return <span className={styles.clientId}>Never</span>
        const date = new Date(agent.lastSeenAt)
        return (
          <div className={styles.timeCell}>
            <span>{date.toLocaleTimeString()}</span>
            <span className={styles.clientId}>{date.toLocaleDateString()}</span>
          </div>
        )
      },
    },
    {
      title: t('common.actions', { defaultValue: 'Actions' }),
      key: 'actions',
      width: 200,
      render: (_, agent) => {
        const isOnline = agent.status === 'ONLINE'
        return (
          <div className={styles.actionsCell}>
            <Tooltip
              title={t('portal.extensions.clients.actions.ping', {
                defaultValue: 'Send health check ping',
              })}
            >
              <Button
                size="small"
                icon={<ApiOutlined />}
                disabled={!isOnline || !canWrite}
                loading={createCommand.isPending}
                onClick={() =>
                  createCommand.mutate({
                    agentId: agent.id,
                    type: 'TEST_CONNECTION',
                  })
                }
              >
                Ping
              </Button>
            </Tooltip>
            <Tooltip
              title={t('portal.extensions.clients.actions.syncNow', {
                defaultValue: 'Trigger order fetch now',
              })}
            >
              <Button
                size="small"
                icon={<SyncOutlined />}
                disabled={!isOnline || !canWrite}
                loading={createCommand.isPending}
                onClick={() =>
                  createCommand.mutate({
                    agentId: agent.id,
                    type: 'IMPORT_NEW_ORDERS',
                    numDays: 1,
                  })
                }
              >
                Sync
              </Button>
            </Tooltip>
            {agent.token?.id && canWrite ? (
              <Popconfirm
                title={t('portal.extensions.tokens.revokeConfirm', {
                  defaultValue: 'Revoke this bot token? The extension will disconnect.',
                })}
                onConfirm={() => revokeToken.mutate(agent.token!.id)}
              >
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  loading={revokeToken.isPending}
                />
              </Popconfirm>
            ) : null}
          </div>
        )
      },
    },
  ]

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('legacyMenu.manageClients', { defaultValue: 'Manage Clients' })}
        description={t('portal.extensions.clients.subtitle', {
          defaultValue:
            'Monitor connected worker bots across Amazon & Etsy, verify online heartbeats, and manage client access tokens.',
        })}
        actions={
          canWrite ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setTokenModalOpen(true)}>
              {t('portal.extensions.tokens.generate', { defaultValue: 'Generate Bot Token' })}
            </Button>
          ) : null
        }
      />

      <div className={styles.metricsGrid}>
        <MetricCard
          icon={<DesktopOutlined />}
          label={t('portal.extensions.metrics.onlineClients', { defaultValue: 'Online Clients' })}
          value={`${onlineAgentsCount} / ${managementAgents.length}`}
          variant={onlineAgentsCount > 0 ? 'success' : 'neutral'}
        />
        <MetricCard
          icon={
            <Tag color="orange" style={{ margin: 0 }}>
              AMZ
            </Tag>
          }
          label={t('portal.extensions.metrics.amazonClients', { defaultValue: 'Amazon Workers' })}
          value={amazonAgentsCount}
          variant="neutral"
        />
        <MetricCard
          icon={
            <Tag color="volcano" style={{ margin: 0 }}>
              ETSY
            </Tag>
          }
          label={t('portal.extensions.metrics.etsyClients', { defaultValue: 'Etsy Workers' })}
          value={etsyAgentsCount}
          variant="neutral"
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
              { value: 'ONLINE', label: 'Online' },
              { value: 'OFFLINE', label: 'Offline' },
            ]}
          />
        </div>

        <Space>
          <Input
            prefix={<SearchOutlined />}
            placeholder={t('portal.extensions.filters.searchPlaceholder', {
              defaultValue: 'Search client, shop...',
            })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => extensionManagementAgents.refetch()}
            loading={extensionManagementAgents.isFetching}
          />
        </Space>
      </div>

      <SectionCard>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredAgents}
          loading={extensionManagementAgents.isLoading}
          pagination={{ pageSize: 15, showTotal: (total) => `Total ${total} agents` }}
          size="middle"
        />
      </SectionCard>

      <ExtensionTokenModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
        form={tokenForm}
        shopOptions={setupShopOptions}
        onCreateToken={(values) => createToken.mutate(values)}
        isCreatingToken={createToken.isPending}
        createdToken={createdToken}
        onClearCreatedToken={() => setCreatedToken(undefined)}
      />
    </div>
  )
}
export default ExtensionClientsPage
