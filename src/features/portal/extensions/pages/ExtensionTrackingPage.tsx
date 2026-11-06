import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CarOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  GlobalOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Segmented, Space, Table, Tag } from 'antd'

import { MetricCard, PageHeader, SectionCard } from '@/shared/ui'
import { TrackingUploadPreviewModal } from '@/features/portal/integrations/components/TrackingUploadPreviewModal'
import { ExtensionPlatformBadge } from '../components/ExtensionPlatformBadge'
import { useExtensionHub } from '../hooks/useExtensionHub'
import styles from './ExtensionTrackingPage.module.scss'

interface ShopTrackingStatus {
  shopId: string
  shopName: string
  platform: string
  agentOnline: boolean
  agentName: string
}

export function ExtensionTrackingPage() {
  const { t } = useTranslation()
  const { shops, managementAgents } = useExtensionHub()

  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'AMAZON' | 'ETSY'>('ALL')
  const [previewShopId, setPreviewShopId] = useState<string>()

  const trackingRows: ShopTrackingStatus[] = useMemo(() => {
    return shops.map((shop) => {
      const agent = managementAgents.find((a) => a.shopId === shop.id)
      const platform = (shop.salesChannelCode || agent?.provider || 'AMAZON').toUpperCase()
      return {
        shopId: shop.id,
        shopName: shop.name,
        platform,
        agentOnline: agent?.status === 'ONLINE',
        agentName: agent?.label || agent?.clientId || 'No Bot Connected',
      }
    })
  }, [shops, managementAgents])

  const filteredRows = useMemo(() => {
    if (platformFilter === 'ALL') return trackingRows
    return trackingRows.filter((row) => row.platform === platformFilter)
  }, [trackingRows, platformFilter])

  const columns: TableColumnsType<ShopTrackingStatus> = [
    {
      title: t('portal.extensions.tracking.table.platform', { defaultValue: 'Platform' }),
      dataIndex: 'platform',
      key: 'platform',
      width: 120,
      render: (platform) => <ExtensionPlatformBadge platform={platform} />,
    },
    {
      title: t('portal.extensions.tracking.table.shop', { defaultValue: 'Shop' }),
      dataIndex: 'shopName',
      key: 'shopName',
    },
    {
      title: t('portal.extensions.tracking.table.botAgent', { defaultValue: 'Worker Extension' }),
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
        <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewShopId(row.shopId)}>
          {t('portal.extensions.tracking.actions.preview', {
            defaultValue: 'Preview Fulfillments',
          })}
        </Button>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('portal.extensions.tracking.title', {
          defaultValue: 'Tracking & Dispatch Center',
        })}
        description={t('portal.extensions.tracking.subtitle', {
          defaultValue:
            'Review shipments ready to dispatch, preview tracking upload files, and synchronize fulfillment numbers to Etsy and Amazon.',
        })}
      />

      <div className={styles.metricsGrid}>
        <MetricCard
          icon={<CarOutlined />}
          label={t('portal.extensions.metrics.monitoredShops', { defaultValue: 'Connected Shops' })}
          value={shops.length}
          variant="neutral"
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          label={t('portal.extensions.metrics.onlineSyncBots', {
            defaultValue: 'Online Dispatch Bots',
          })}
          value={trackingRows.filter((r) => r.agentOnline).length}
          variant="success"
        />
      </div>

      <SectionCard
        title={t('portal.extensions.tracking.workflowTitle', {
          defaultValue: 'Automated Dispatch Workflow',
        })}
      >
        <div className={styles.instructionSteps}>
          <div className={styles.stepBox}>
            <div className={styles.stepTitle}>
              <CarOutlined /> 1. Vendor Tracking Received
            </div>
            <div className={styles.stepDesc}>
              When vendors submit tracking numbers in Vendor Handoff, shipments are verified and
              marked as SHIPPED in LNG System.
            </div>
          </div>
          <div className={styles.stepBox}>
            <div className={styles.stepTitle}>
              <SyncOutlined /> 2. Extension Auto-Sync
            </div>
            <div className={styles.stepDesc}>
              The LNG Extension worker on your store PC picks up tracking numbers and dispatches
              orders on Etsy or confirms shipments on Amazon Seller Central.
            </div>
          </div>
          <div className={styles.stepBox}>
            <div className={styles.stepTitle}>
              <GlobalOutlined /> 3. Verification & Carrier Check
            </div>
            <div className={styles.stepDesc}>
              Track carrier scans (USPS, FedEx, DHL) and ensure on-time delivery metrics are
              preserved across both marketplaces.
            </div>
          </div>
        </div>
      </SectionCard>

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
        title={t('portal.extensions.tracking.shopsTitle', {
          defaultValue: 'Stores & Extension Tracking Status',
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

      {previewShopId ? (
        <TrackingUploadPreviewModal
          shopId={previewShopId}
          onClose={() => setPreviewShopId(undefined)}
        />
      ) : null}
    </div>
  )
}
export default ExtensionTrackingPage
