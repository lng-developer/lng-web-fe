import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Alert, Button, Segmented, Space, Table, Tag } from 'antd'

import { MetricCard, PageHeader, SectionCard } from '@/shared/ui'
import { ExtensionPlatformBadge } from '../components/ExtensionPlatformBadge'
import { useExtensionHub } from '../hooks/useExtensionHub'
import styles from './ExtensionMessagesPage.module.scss'

interface StoreMessageStatus {
  shopId: string
  shopName: string
  platform: string
  agentOnline: boolean
  agentName: string
  directUrl?: string
}

export function ExtensionMessagesPage() {
  const { t } = useTranslation()
  const { shops, managementAgents } = useExtensionHub()

  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'AMAZON' | 'ETSY'>('ALL')

  const messageRows: StoreMessageStatus[] = useMemo(() => {
    return shops.map((shop) => {
      const agent = managementAgents.find((a) => a.shopId === shop.id)
      const platform = (shop.salesChannelCode || agent?.provider || 'AMAZON').toUpperCase()
      const directUrl =
        platform === 'ETSY'
          ? 'https://www.etsy.com/your/shops/me/messages'
          : 'https://sellercentral.amazon.com/messaging/reviews'
      return {
        shopId: shop.id,
        shopName: shop.name,
        platform,
        agentOnline: agent?.status === 'ONLINE',
        agentName: agent?.label || agent?.clientId || 'No Bot Connected',
        directUrl,
      }
    })
  }, [shops, managementAgents])

  const filteredRows = useMemo(() => {
    if (platformFilter === 'ALL') return messageRows
    return messageRows.filter((row) => row.platform === platformFilter)
  }, [messageRows, platformFilter])

  const columns: TableColumnsType<StoreMessageStatus> = [
    {
      title: t('portal.extensions.messages.table.platform', { defaultValue: 'Platform' }),
      dataIndex: 'platform',
      key: 'platform',
      width: 120,
      render: (platform) => <ExtensionPlatformBadge platform={platform} />,
    },
    {
      title: t('portal.extensions.messages.table.shop', { defaultValue: 'Store' }),
      dataIndex: 'shopName',
      key: 'shopName',
    },
    {
      title: t('portal.extensions.messages.table.botAgent', { defaultValue: 'Worker Extension' }),
      key: 'agent',
      render: (_, row) => (
        <Space>
          <Tag color={row.agentOnline ? 'success' : 'default'}>
            {row.agentOnline ? 'Online' : 'Offline'}
          </Tag>
          <span>{row.agentName}</span>
        </Space>
      ),
    },
    {
      title: t('common.actions', { defaultValue: 'Actions' }),
      key: 'actions',
      width: 180,
      render: (_, row) => (
        <Button
          size="small"
          icon={<LinkOutlined />}
          href={row.directUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('portal.extensions.messages.actions.openInbox', { defaultValue: 'Open Store Inbox' })}
        </Button>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('portal.extensions.messages.title', { defaultValue: 'Customer Message Center' })}
        description={t('portal.extensions.messages.subtitle', {
          defaultValue:
            'Monitor customer conversations, coordinate prompt CS responses, and synchronize messages across Etsy and Amazon Seller Central.',
        })}
      />

      <Alert
        type="warning"
        showIcon
        icon={<AlertOutlined />}
        message={t('portal.extensions.messages.slaAlertTitle', {
          defaultValue: '24-Hour Marketplace Response SLA',
        })}
        description={t('portal.extensions.messages.slaAlertDesc', {
          defaultValue:
            'Both Etsy (Star Seller) and Amazon (Buyer-Seller Messaging SLA) require responses within 24 hours including weekends. Use Extension Bot to notify customer support teams of pending customer questions.',
        })}
      />

      <div className={styles.metricsGrid}>
        <MetricCard
          icon={<CommentOutlined />}
          label={t('portal.extensions.metrics.monitoredShops', { defaultValue: 'Active Stores' })}
          value={shops.length}
          variant="neutral"
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          label={t('portal.extensions.metrics.onlineAgents', { defaultValue: 'Online Agents' })}
          value={messageRows.filter((r) => r.agentOnline).length}
          variant="success"
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <Segmented
          value={platformFilter}
          onChange={(val) => setPlatformFilter(val as 'ALL' | 'AMAZON' | 'ETSY')}
          options={[
            { value: 'ALL', label: t('common.all', { defaultValue: 'All Platforms' }) },
            { value: 'AMAZON', label: 'Amazon' },
            { value: 'ETSY', label: 'Etsy' },
          ]}
        />
      </div>

      <SectionCard
        title={t('portal.extensions.messages.storesTitle', {
          defaultValue: 'Store Message Inboxes',
        })}
      >
        <Table
          rowKey="shopId"
          columns={columns}
          dataSource={filteredRows}
          pagination={false}
          size="middle"
        />
      </SectionCard>
    </div>
  )
}
export default ExtensionMessagesPage
